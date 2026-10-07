package com.chat.base.glide;

import java.util.Collections;

import com.chat.base.net.AccessAuthInterceptor;

import okhttp3.OkHttpClient;
import okhttp3.Protocol;

public class UnsafeOkHttpClient {
    // 原实现信任任意证书，已改为系统默认校验；类名保留以免改动调用方
    public static OkHttpClient getUnsafeOkHttpClient() {
        return new OkHttpClient
                .Builder()
                .protocols(Collections.singletonList(Protocol.HTTP_1_1))
                .addInterceptor(new AccessAuthInterceptor())
                .build();
    }
}
