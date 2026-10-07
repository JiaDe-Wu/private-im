package file

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/TangSengDaoDao/TangSengDaoDaoServerLib/config"
	"github.com/TangSengDaoDao/TangSengDaoDaoServerLib/pkg/log"
	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
	"go.uber.org/zap"
)

// FileServiceS3 AWS S3（或任意 S3 兼容存储）文件服务，配置 fileService: "s3"
const FileServiceS3 config.FileService = "s3"

// ServiceS3 与 MinIO 实现的区别：
//   - 只用一个私有桶，原来的「桶名」（文件类型 chat/moment/avatar…）作为对象键前缀，
//     因此 file/preview/<类型>/<路径> 这类已存地址保持不变；
//   - 不创建桶、不设置任何公开桶策略（桶需预先创建并开启「阻止公有访问」）；
//   - 默认使用 IAM 角色凭证（EC2 实例角色 / ECS 任务角色 / IRSA），无需在配置中写密钥；
//   - 下载地址默认为限时签名 URL；配置了 CloudFront（OAC）地址时直接返回 CDN 地址。
//
// 配置项沿用 TS_ 环境变量约定（ServerLib 的配置结构中没有 S3 字段）：
//
//	TS_S3_BUCKET            必填，桶名
//	TS_S3_REGION            区域，默认 ap-east-1
//	TS_S3_ENDPOINT          可选，默认 https://s3.<region>.amazonaws.com；本地测试可指向 MinIO
//	TS_S3_ACCESSKEYID       可选，静态密钥（不填则用 AWS_* 环境变量或 IAM 角色）
//	TS_S3_SECRETACCESSKEY   可选
//	TS_S3_DOWNLOADURL       可选，CloudFront 地址，如 https://files.example.com
//	TS_S3_PRESIGNEXPIRE     可选，签名 URL 有效期（秒），默认 3600
type ServiceS3 struct {
	log.Log
	ctx *config.Context

	once    sync.Once
	client  *minio.Client
	initErr error

	bucket        string
	downloadURL   string
	presignExpire time.Duration
}

// NewServiceS3 创建 S3 文件服务
func NewServiceS3(ctx *config.Context) *ServiceS3 {
	expire := time.Hour
	if v, err := strconv.Atoi(os.Getenv("TS_S3_PRESIGNEXPIRE")); err == nil && v > 0 {
		expire = time.Duration(v) * time.Second
	}
	return &ServiceS3{
		Log:           log.NewTLog("FileS3"),
		ctx:           ctx,
		bucket:        strings.TrimSpace(os.Getenv("TS_S3_BUCKET")),
		downloadURL:   strings.TrimRight(strings.TrimSpace(os.Getenv("TS_S3_DOWNLOADURL")), "/"),
		presignExpire: expire,
	}
}

func (s *ServiceS3) getClient() (*minio.Client, error) {
	s.once.Do(func() {
		if s.bucket == "" {
			s.initErr = errors.New("未配置 TS_S3_BUCKET")
			return
		}
		region := strings.TrimSpace(os.Getenv("TS_S3_REGION"))
		if region == "" {
			region = "ap-east-1"
		}
		endpoint := strings.TrimSpace(os.Getenv("TS_S3_ENDPOINT"))
		if endpoint == "" {
			endpoint = fmt.Sprintf("https://s3.%s.amazonaws.com", region)
		}
		u, err := url.Parse(endpoint)
		if err != nil || u.Host == "" {
			s.initErr = fmt.Errorf("TS_S3_ENDPOINT 格式错误: %s", endpoint)
			return
		}

		var creds *credentials.Credentials
		if ak := os.Getenv("TS_S3_ACCESSKEYID"); ak != "" {
			creds = credentials.NewStaticV4(ak, os.Getenv("TS_S3_SECRETACCESSKEY"), "")
		} else {
			creds = credentials.NewChainCredentials([]credentials.Provider{
				&credentials.EnvAWS{},
				&credentials.IAM{Client: &http.Client{Transport: http.DefaultTransport}},
			})
		}
		s.client, s.initErr = minio.New(u.Host, &minio.Options{
			Creds:  creds,
			Secure: u.Scheme == "https",
			Region: region,
		})
	})
	return s.client, s.initErr
}

// objectKey 上传路径即对象键：chat/1/<uid>/xxx.png（去掉开头的 /）
func objectKey(p string) string {
	return strings.TrimPrefix(p, "/")
}

// UploadFile 上传文件
func (s *ServiceS3) UploadFile(filePath string, contentType string, copyFileWriter func(io.Writer) error) (map[string]interface{}, error) {
	client, err := s.getClient()
	if err != nil {
		s.Error("初始化 S3 客户端失败", zap.Error(err))
		return nil, err
	}
	buff := bytes.NewBuffer(make([]byte, 0))
	if err = copyFileWriter(buff); err != nil {
		s.Error("复制文件内容失败！", zap.Error(err))
		return nil, err
	}
	key := objectKey(filePath)
	if contentType == "" {
		contentType = "application/octet-stream"
	}
	info, err := client.PutObject(context.Background(), s.bucket, key, buff, int64(buff.Len()), minio.PutObjectOptions{
		ContentType: contentType,
		PartSize:    10 * 1024 * 1024,
	})
	if err != nil {
		s.Error("上传文件到 S3 失败", zap.String("key", key), zap.Error(err))
		return map[string]interface{}{"path": ""}, err
	}
	return map[string]interface{}{"path": info.Key}, nil
}

// DownloadURL 获取下载地址：配置了 CloudFront 时返回 CDN 地址，否则返回限时签名 URL
func (s *ServiceS3) DownloadURL(ph string, filename string) (string, error) {
	key := objectKey(ph)
	disposition := fmt.Sprintf("inline; filename=\"%s\"", filename)
	if s.downloadURL != "" {
		vals := url.Values{}
		vals.Set("response-content-disposition", disposition)
		return fmt.Sprintf("%s/%s?%s", s.downloadURL, key, vals.Encode()), nil
	}
	client, err := s.getClient()
	if err != nil {
		return "", err
	}
	params := url.Values{}
	params.Set("response-content-disposition", disposition)
	u, err := client.PresignedGetObject(context.Background(), s.bucket, key, s.presignExpire, params)
	if err != nil {
		s.Error("生成签名下载地址失败", zap.String("key", key), zap.Error(err))
		return "", err
	}
	return u.String(), nil
}

// WithVersion 给下载地址追加缓存版本参数 v。
// S3 签名 URL 的签名覆盖全部查询参数，追加参数会导致 403，因此签名 URL 原样返回（每次请求都会重新签名，不存在缓存问题）。
func WithVersion(downloadURL string, v string) string {
	if v == "" || strings.Contains(downloadURL, "X-Amz-Signature=") {
		return downloadURL
	}
	if strings.Contains(downloadURL, "?") {
		return fmt.Sprintf("%s&v=%s", downloadURL, v)
	}
	return fmt.Sprintf("%s?v=%s", downloadURL, v)
}
