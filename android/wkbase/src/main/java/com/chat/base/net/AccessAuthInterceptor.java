package com.chat.base.net;

import android.text.TextUtils;

import com.chat.base.config.WKApiConfig;

import org.jetbrains.annotations.NotNull;

import java.io.IOException;

import okhttp3.HttpUrl;
import okhttp3.Interceptor;
import okhttp3.Request;
import okhttp3.Response;

/**
 * PitchShow 开发环境的访问密码（CloudFront Basic Auth）。
 * 只对接口域名生效：头像等会 302 到 S3 签名地址，S3 不接受额外的 Authorization 头。
 */
public class AccessAuthInterceptor implements Interceptor {

    @NotNull
    @Override
    public Response intercept(Chain chain) throws IOException {
        Request request = chain.request();
        if (shouldAuth(request)) {
            request = request.newBuilder().header("Authorization", WKApiConfig.accessAuth).build();
        }
        return chain.proceed(request);
    }

    private static boolean shouldAuth(Request request) {
        if (TextUtils.isEmpty(WKApiConfig.accessAuth) || request.header("Authorization") != null) {
            return false;
        }
        HttpUrl api = HttpUrl.parse(WKApiConfig.baseUrl);
        return api != null && api.host().equalsIgnoreCase(request.url().host());
    }
}
