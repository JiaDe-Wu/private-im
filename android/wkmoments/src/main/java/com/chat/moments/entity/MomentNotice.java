package com.chat.moments.entity;

/** 与我相关：别人赞了 / 评论了我的动态，或回复了我的评论 */
public class MomentNotice {
    public long id;
    public String moment_no;
    public String uid;
    public String name;
    public String action; // like | comment
    public String comment;
    public Meta moment;
    public long created_at;

    public static class Meta {
        public String content;
        public String img;
    }
}
