package com.chat.moments.entity;

import java.util.ArrayList;
import java.util.List;

/** 一条动态，字段与服务端 modules/moment 的 momentResp 一致 */
public class Moment {
    public String moment_no;
    public String uid;
    public String name;
    public String content;
    public int privacy_type;
    public List<MomentImage> imgs = new ArrayList<>();
    public List<UserBrief> likes = new ArrayList<>();
    public List<MomentComment> comments = new ArrayList<>();
    public boolean liked;
    public long created_at;
    public long cursor;
}
