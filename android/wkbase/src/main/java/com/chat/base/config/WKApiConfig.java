package com.chat.base.config;

import android.text.TextUtils;
import android.util.Base64;

import com.xinbida.wukongim.entity.WKChannelType;

/**
 * 2019-11-20 10:11
 * api地址
 */
public class WKApiConfig {
    public static String baseUrl = "";
    public static String baseWebUrl = "";
    // 开发环境访问密码（CloudFront Basic Auth），为空表示不需要
    public static String accessAuth = "";
    public static String accessPassword = "";

    public static void setAccessPassword(String password) {
        accessPassword = password == null ? "" : password;
        accessAuth = TextUtils.isEmpty(password) ? "" : "Basic " + Base64.encodeToString(("app:" + password).getBytes(), Base64.NO_WRAP);
    }

    public static void initBaseURL(String apiURL) {
        baseUrl = apiURL + "/v1/";
        baseWebUrl = apiURL + "/web/";
    }

    public static void initBaseURLIncludeIP(String apiURL) {
        baseUrl = apiURL + "/v1/";
        baseWebUrl = apiURL + "/web/";
    }

    public static String getAvatarUrl(String uid) {
        return baseUrl + "users/" + uid + "/avatar";
    }

    public static String getGroupUrl(String groupId) {
        return baseUrl + "groups/" + groupId + "/avatar";
    }

    public static String getShowAvatar(String channelID, byte channelType) {
        return channelType == WKChannelType.PERSONAL ? getAvatarUrl(channelID) : getGroupUrl(channelID);
    }

    public static String getShowUrl(String url) {
        if (TextUtils.isEmpty(url) || url.startsWith("http") || url.startsWith("HTTP")) {
            return url;
        } else {
            return baseUrl + url;
        }
    }

}
