package com.chat.moments.entity;

/** 动态图片：url 为服务端相对路径（file/preview/moment/...） */
public class MomentImage {
    public String url;
    public int width;
    public int height;

    public MomentImage() {
    }

    public MomentImage(String url, int width, int height) {
        this.url = url;
        this.width = width;
        this.height = height;
    }
}
