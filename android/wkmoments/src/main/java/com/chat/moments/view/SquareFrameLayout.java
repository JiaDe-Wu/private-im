package com.chat.moments.view;

import android.content.Context;
import android.util.AttributeSet;
import android.widget.FrameLayout;

/** 高度等于宽度的 FrameLayout（发布页图片格子） */
public class SquareFrameLayout extends FrameLayout {
    public SquareFrameLayout(Context context) {
        super(context);
    }

    public SquareFrameLayout(Context context, AttributeSet attrs) {
        super(context, attrs);
    }

    @Override
    protected void onMeasure(int widthMeasureSpec, int heightMeasureSpec) {
        super.onMeasure(widthMeasureSpec, widthMeasureSpec);
    }
}
