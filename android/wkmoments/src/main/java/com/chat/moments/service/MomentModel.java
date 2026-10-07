package com.chat.moments.service;

import android.graphics.BitmapFactory;

import com.alibaba.fastjson.JSONArray;
import com.alibaba.fastjson.JSONObject;
import com.chat.base.base.WKBaseModel;
import com.chat.base.config.WKApiConfig;
import com.chat.base.config.WKConfig;
import com.chat.base.net.ApiService;
import com.chat.base.net.IRequestResultListener;
import com.chat.base.net.entity.CommonResponse;
import com.chat.base.net.entity.UploadFileUrl;
import com.chat.base.net.ud.WKUploader;
import com.chat.moments.entity.Moment;
import com.chat.moments.entity.MomentComment;
import com.chat.moments.entity.MomentImage;
import com.chat.moments.entity.MomentNoticePage;
import com.chat.moments.entity.MomentPage;
import com.chat.moments.entity.UnreadCount;

import java.io.File;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/** 朋友圈接口调用（单例），回调都在主线程 */
public class MomentModel extends WKBaseModel {
    public static final int PAGE_SIZE = 10;

    private MomentModel() {
    }

    private static class Holder {
        static final MomentModel INSTANCE = new MomentModel();
    }

    public static MomentModel getInstance() {
        return Holder.INSTANCE;
    }

    private MomentService api() {
        return createService(MomentService.class);
    }

    public interface Callback<T> {
        void onResult(T data, String error); // 成功时 error 为 null
    }

    private <T> IRequestResultListener<T> wrap(Callback<T> cb) {
        return new IRequestResultListener<>() {
            @Override
            public void onSuccess(T result) {
                cb.onResult(result, null);
            }

            @Override
            public void onFail(int code, String msg) {
                cb.onResult(null, msg == null || msg.isEmpty() ? "网络异常，请稍后重试" : msg);
            }
        };
    }

    /** uid 为空时取好友时间线，否则取某人的动态 */
    public void list(String uid, long before, Callback<MomentPage> cb) {
        if (uid == null || uid.isEmpty()) request(api().timeline(before, PAGE_SIZE), wrap(cb));
        else request(api().userMoments(uid, before, PAGE_SIZE), wrap(cb));
    }

    public void detail(String momentNo, Callback<Moment> cb) {
        request(api().detail(momentNo), wrap(cb));
    }

    public void publish(String content, List<MomentImage> imgs, int privacyType, Callback<JSONObject> cb) {
        JSONObject body = new JSONObject();
        body.put("content", content);
        JSONArray arr = new JSONArray();
        for (MomentImage img : imgs) {
            JSONObject o = new JSONObject();
            o.put("url", img.url);
            o.put("width", img.width);
            o.put("height", img.height);
            arr.add(o);
        }
        body.put("imgs", arr);
        body.put("privacy_type", privacyType);
        request(api().publish(body), wrap(cb));
    }

    public void delete(String momentNo, Callback<CommonResponse> cb) {
        request(api().delete(momentNo), wrap(cb));
    }

    public void setLiked(String momentNo, boolean liked, Callback<CommonResponse> cb) {
        request(liked ? api().like(momentNo) : api().unlike(momentNo), wrap(cb));
    }

    public void comment(String momentNo, String content, long replyCommentId, Callback<MomentComment> cb) {
        JSONObject body = new JSONObject();
        body.put("content", content);
        body.put("reply_comment_id", replyCommentId);
        request(api().comment(momentNo, body), wrap(cb));
    }

    public void deleteComment(String momentNo, long commentId, Callback<CommonResponse> cb) {
        request(api().deleteComment(momentNo, commentId), wrap(cb));
    }

    public void notices(long before, Callback<MomentNoticePage> cb) {
        request(api().notices(before, 20), wrap(cb));
    }

    public void feedUnread(Callback<UnreadCount> cb) {
        request(api().feedUnread(), wrap(cb));
    }

    public void noticeUnread(Callback<UnreadCount> cb) {
        request(api().noticeUnread(), wrap(cb));
    }

    public void feedRead() {
        request(api().feedRead(), wrap((d, e) -> {
        }));
    }

    public void noticeRead() {
        request(api().noticeRead(), wrap((d, e) -> {
        }));
    }

    /** 依次上传本地图片（type=moment，路径固定在自己的 uid 目录下），全部成功才回调列表 */
    public void uploadImages(List<String> localPaths, Callback<List<MomentImage>> cb) {
        uploadNext(localPaths, 0, new ArrayList<>(), cb);
    }

    private void uploadNext(List<String> paths, int index, List<MomentImage> done, Callback<List<MomentImage>> cb) {
        if (index >= paths.size()) {
            cb.onResult(done, null);
            return;
        }
        String local = paths.get(index);
        String name = new File(local).getName();
        String ext = name.contains(".") ? name.substring(name.lastIndexOf('.')).toLowerCase() : ".jpg";
        String path = "/" + WKConfig.getInstance().getUid() + "/" + UUID.randomUUID().toString().replace("-", "").substring(0, 16) + ext;
        request(createService(ApiService.class).getUploadFileUrl(WKApiConfig.baseUrl + "file/upload?type=moment&path=" + path), new IRequestResultListener<UploadFileUrl>() {
            @Override
            public void onSuccess(UploadFileUrl result) {
                WKUploader.getInstance().upload(result.url, local, new WKUploader.IUploadBack() {
                    @Override
                    public void onSuccess(String url) {
                        BitmapFactory.Options o = new BitmapFactory.Options();
                        o.inJustDecodeBounds = true;
                        BitmapFactory.decodeFile(local, o);
                        done.add(new MomentImage(url, o.outWidth, o.outHeight));
                        uploadNext(paths, index + 1, done, cb);
                    }

                    @Override
                    public void onError() {
                        cb.onResult(null, "第 " + (index + 1) + " 张图片上传失败");
                    }
                });
            }

            @Override
            public void onFail(int code, String msg) {
                cb.onResult(null, "获取上传地址失败：" + msg);
            }
        });
    }
}
