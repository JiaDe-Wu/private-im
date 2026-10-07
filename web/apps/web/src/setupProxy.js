// 开发服务器代理（与线上 nginx 规则一致），只需转发 3000 一个端口：
// - DEV_API_PROXY：/api/* → 本地业务服务端
// - DEV_MINIO_PROXY：/minio/* → 本地 MinIO（图片、文件下载）
const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function (app) {
  const apiTarget = process.env.DEV_API_PROXY;
  if (apiTarget) {
    app.use(
      '/api',
      createProxyMiddleware({
        target: apiTarget,
        changeOrigin: true,
        pathRewrite: { '^/api': '' },
      })
    );
  }
  const minioTarget = process.env.DEV_MINIO_PROXY;
  if (minioTarget) {
    app.use(
      '/minio',
      createProxyMiddleware({
        target: minioTarget,
        changeOrigin: true,
        pathRewrite: { '^/minio': '' },
      })
    );
  }
};
