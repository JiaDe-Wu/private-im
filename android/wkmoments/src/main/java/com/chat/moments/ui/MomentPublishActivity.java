package com.chat.moments.ui;

import android.app.Activity;
import android.text.TextUtils;
import android.view.View;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.GridLayoutManager;

import com.chad.library.adapter.base.BaseQuickAdapter;
import com.chad.library.adapter.base.viewholder.BaseViewHolder;
import com.chat.base.base.WKBaseActivity;
import com.chat.base.glide.ChooseMimeType;
import com.chat.base.glide.ChooseResult;
import com.chat.base.glide.GlideUtils;
import com.chat.base.utils.SoftKeyboardUtils;
import com.chat.moments.R;
import com.chat.moments.databinding.ActMomentPublishBinding;
import com.chat.moments.service.MomentModel;

import java.util.ArrayList;
import java.util.List;

/** 发布动态：文字 + 最多 9 张图 + 仅自己可见 */
public class MomentPublishActivity extends WKBaseActivity<ActMomentPublishBinding> {
    private static final int MAX = 9;
    private static final String ADD = "__add__";
    private final List<String> paths = new ArrayList<>();
    private ImgAdapter imgAdapter;
    private boolean publishing = false;

    @Override
    protected ActMomentPublishBinding getViewBinding() {
        return ActMomentPublishBinding.inflate(getLayoutInflater());
    }

    @Override
    protected void setTitle(TextView titleTv) {
        titleTv.setText(R.string.moments_publish_title);
    }

    @Override
    protected String getRightTvText(TextView textView) {
        return getString(R.string.moments_publish);
    }

    @Override
    protected void initView() {
        imgAdapter = new ImgAdapter();
        wkVBinding.imgRecyclerView.setLayoutManager(new GridLayoutManager(this, 3));
        wkVBinding.imgRecyclerView.setAdapter(imgAdapter);
        refreshImages();
        imgAdapter.setOnItemClickListener((a, v, pos) -> {
            if (ADD.equals(imgAdapter.getItem(pos))) pick();
        });
        imgAdapter.addChildClickViewIds(R.id.removeIv);
        imgAdapter.setOnItemChildClickListener((a, v, pos) -> {
            paths.remove(pos);
            refreshImages();
        });
    }

    private void refreshImages() {
        List<String> items = new ArrayList<>(paths);
        if (paths.size() < MAX) items.add(ADD);
        imgAdapter.setList(items);
    }

    private void pick() {
        SoftKeyboardUtils.getInstance().hideInput(this, wkVBinding.contentEt);
        GlideUtils.getInstance().chooseIMG(this, MAX - paths.size(), true, ChooseMimeType.img, false, new GlideUtils.ISelectBack() {
            @Override
            public void onBack(List<ChooseResult> list) {
                for (ChooseResult r : list) if (paths.size() < MAX && r.path != null) paths.add(r.path);
                refreshImages();
            }

            @Override
            public void onCancel() {
            }
        });
    }

    @Override
    protected void rightLayoutClick() {
        if (publishing) return;
        String content = wkVBinding.contentEt.getText() == null ? "" : wkVBinding.contentEt.getText().toString().trim();
        if (TextUtils.isEmpty(content) && paths.isEmpty()) {
            showToast(getString(R.string.moments_publish_empty));
            return;
        }
        publishing = true;
        showTitleRightLoading();
        int privacy = wkVBinding.privateSwitch.isChecked() ? 1 : 0;
        MomentModel.getInstance().uploadImages(paths, (imgs, err) -> {
            if (imgs == null) {
                fail(err);
                return;
            }
            MomentModel.getInstance().publish(content, imgs, privacy, (r, e) -> {
                if (e != null) {
                    fail(e);
                    return;
                }
                setResult(Activity.RESULT_OK);
                finish();
            });
        });
    }

    private void fail(String msg) {
        publishing = false;
        hideTitleRightLoading();
        showToast(msg);
    }

    private static class ImgAdapter extends BaseQuickAdapter<String, BaseViewHolder> {
        ImgAdapter() {
            super(R.layout.item_publish_img);
        }

        @Override
        protected void convert(@NonNull BaseViewHolder h, String item) {
            boolean add = ADD.equals(item);
            h.setGone(R.id.removeIv, add);
            if (add) {
                h.setImageResource(R.id.imgIv, R.drawable.ps_moment_add_cell);
            } else {
                GlideUtils.getInstance().showImg(getContext(), item, h.getView(R.id.imgIv));
            }
            h.getView(R.id.imgIv).setClipToOutline(true);
            h.getView(R.id.imgIv).setOutlineProvider(new android.view.ViewOutlineProvider() {
                @Override
                public void getOutline(View view, android.graphics.Outline outline) {
                    outline.setRoundRect(0, 0, view.getWidth(), view.getHeight(), com.chat.base.utils.AndroidUtilities.dp(10));
                }
            });
        }
    }
}
