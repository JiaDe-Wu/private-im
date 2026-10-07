package com.chat.moments.service;

import com.alibaba.fastjson.JSONObject;
import com.chat.base.net.entity.CommonResponse;
import com.chat.moments.entity.Moment;
import com.chat.moments.entity.MomentComment;
import com.chat.moments.entity.MomentNoticePage;
import com.chat.moments.entity.MomentPage;
import com.chat.moments.entity.UnreadCount;

import io.reactivex.rxjava3.core.Observable;
import retrofit2.http.Body;
import retrofit2.http.DELETE;
import retrofit2.http.GET;
import retrofit2.http.POST;
import retrofit2.http.PUT;
import retrofit2.http.Path;
import retrofit2.http.Query;

/** 服务端 modules/moment 的接口，路径相对 /v1/ */
public interface MomentService {
    @GET("moments")
    Observable<MomentPage> timeline(@Query("before") long before, @Query("limit") int limit);

    @GET("moments/user/{uid}")
    Observable<MomentPage> userMoments(@Path("uid") String uid, @Query("before") long before, @Query("limit") int limit);

    @GET("moments/{moment_no}")
    Observable<Moment> detail(@Path("moment_no") String momentNo);

    @POST("moments")
    Observable<JSONObject> publish(@Body JSONObject body);

    @DELETE("moments/{moment_no}")
    Observable<CommonResponse> delete(@Path("moment_no") String momentNo);

    @PUT("moments/{moment_no}/like")
    Observable<CommonResponse> like(@Path("moment_no") String momentNo);

    @DELETE("moments/{moment_no}/like")
    Observable<CommonResponse> unlike(@Path("moment_no") String momentNo);

    @POST("moments/{moment_no}/comments")
    Observable<MomentComment> comment(@Path("moment_no") String momentNo, @Body JSONObject body);

    @DELETE("moments/{moment_no}/comments/{comment_id}")
    Observable<CommonResponse> deleteComment(@Path("moment_no") String momentNo, @Path("comment_id") long commentId);

    @GET("moments/notices")
    Observable<MomentNoticePage> notices(@Query("before") long before, @Query("limit") int limit);

    @GET("moments/unread")
    Observable<UnreadCount> feedUnread();

    @GET("moments/notices/unread")
    Observable<UnreadCount> noticeUnread();

    @PUT("moments/read")
    Observable<CommonResponse> feedRead();

    @PUT("moments/notices/read")
    Observable<CommonResponse> noticeRead();
}
