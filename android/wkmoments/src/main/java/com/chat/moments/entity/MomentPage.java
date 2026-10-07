package com.chat.moments.entity;

import java.util.ArrayList;
import java.util.List;

public class MomentPage {
    public List<Moment> list = new ArrayList<>();
    public long next_cursor; // 0 表示没有更多
}
