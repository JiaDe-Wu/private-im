package com.chat.moments.view;

import android.content.Context;
import android.graphics.Outline;
import android.util.AttributeSet;
import android.view.View;
import android.view.ViewGroup;
import android.view.ViewOutlineProvider;
import android.widget.ImageView;

import androidx.appcompat.widget.AppCompatImageView;

import com.chat.base.config.WKApiConfig;
import com.chat.base.glide.GlideUtils;
import com.chat.base.utils.AndroidUtilities;
import com.chat.moments.entity.MomentImage;

import java.util.ArrayList;
import java.util.List;

/**
 * 朋友圈九宫格：1 张按原图比例显示（限制最大宽高），4 张排成 2×2，其余 3 列。
 * 图片格圆角 8dp，点击回调 index。
 */
public class NineGridView extends ViewGroup {
    public interface OnImageClick {
        void onClick(int index, List<ImageView> views);
    }

    private final int gap = AndroidUtilities.dp(4);
    private final List<ImageView> cells = new ArrayList<>();
    private List<MomentImage> images = new ArrayList<>();
    private OnImageClick onImageClick;

    public NineGridView(Context context) {
        super(context);
    }

    public NineGridView(Context context, AttributeSet attrs) {
        super(context, attrs);
    }

    public void setOnImageClick(OnImageClick l) {
        onImageClick = l;
    }

    public List<ImageView> getCells() {
        return new ArrayList<>(cells.subList(0, images.size()));
    }

    public void setImages(List<MomentImage> list) {
        images = list == null ? new ArrayList<>() : list;
        setVisibility(images.isEmpty() ? GONE : VISIBLE);
        while (cells.size() < images.size()) {
            AppCompatImageView iv = new AppCompatImageView(getContext());
            iv.setScaleType(ImageView.ScaleType.CENTER_CROP);
            iv.setBackgroundColor(0x14000000);
            iv.setOutlineProvider(new ViewOutlineProvider() {
                @Override
                public void getOutline(View view, Outline outline) {
                    outline.setRoundRect(0, 0, view.getWidth(), view.getHeight(), AndroidUtilities.dp(8));
                }
            });
            iv.setClipToOutline(true);
            final int index = cells.size();
            iv.setOnClickListener(v -> {
                if (onImageClick != null) onImageClick.onClick(index, getCells());
            });
            cells.add(iv);
            addView(iv);
        }
        for (int i = 0; i < cells.size(); i++) {
            ImageView iv = cells.get(i);
            if (i < images.size()) {
                iv.setVisibility(VISIBLE);
                GlideUtils.getInstance().showImg(getContext(), WKApiConfig.getShowUrl(images.get(i).url), iv);
            } else {
                iv.setVisibility(GONE);
                iv.setImageDrawable(null);
            }
        }
        requestLayout();
    }

    private int columns() {
        int n = images.size();
        return n == 1 ? 1 : (n == 2 || n == 4) ? 2 : 3;
    }

    @Override
    protected void onMeasure(int widthMeasureSpec, int heightMeasureSpec) {
        int width = MeasureSpec.getSize(widthMeasureSpec);
        int n = images.size();
        if (n == 0) {
            setMeasuredDimension(width, 0);
            return;
        }
        int cell3 = (width - gap * 2) / 3;
        if (n == 1) {
            MomentImage img = images.get(0);
            int max = cell3 * 2 + gap;
            int w = max, h = max;
            if (img.width > 0 && img.height > 0) {
                float ratio = img.width / (float) img.height;
                if (ratio >= 1) h = Math.max(cell3, (int) (max / Math.min(ratio, 3f)));
                else w = Math.max(cell3, (int) (max * Math.max(ratio, 1 / 3f)));
            }
            measureCell(0, w, h);
            setMeasuredDimension(width, h);
            return;
        }
        int cols = columns(), rows = (n + cols - 1) / cols;
        for (int i = 0; i < n; i++) measureCell(i, cell3, cell3);
        setMeasuredDimension(width, rows * cell3 + (rows - 1) * gap);
    }

    private void measureCell(int i, int w, int h) {
        cells.get(i).measure(MeasureSpec.makeMeasureSpec(w, MeasureSpec.EXACTLY), MeasureSpec.makeMeasureSpec(h, MeasureSpec.EXACTLY));
    }

    @Override
    protected void onLayout(boolean changed, int l, int t, int r, int b) {
        int n = images.size(), cols = columns();
        for (int i = 0; i < n; i++) {
            ImageView iv = cells.get(i);
            int w = iv.getMeasuredWidth(), h = iv.getMeasuredHeight();
            int x = (i % cols) * (w + gap), y = (i / cols) * (h + gap);
            iv.layout(x, y, x + w, y + h);
        }
    }
}
