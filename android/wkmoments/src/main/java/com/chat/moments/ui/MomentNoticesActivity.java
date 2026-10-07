package com.chat.moments.ui;

import android.text.TextUtils;
import android.view.View;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.LinearLayoutManager;

import com.chad.library.adapter.base.BaseQuickAdapter;
import com.chad.library.adapter.base.viewholder.BaseViewHolder;
import com.chat.base.base.WKBaseActivity;
import com.chat.base.config.WKApiConfig;
import com.chat.base.glide.GlideUtils;
import com.chat.base.ui.components.AvatarView;
import com.chat.base.utils.WKTimeUtils;
import com.chat.moments.MomentsBadge;
import com.chat.moments.R;
import com.chat.moments.databinding.ActMomentNoticesBinding;
import com.chat.moments.entity.MomentNotice;
import com.chat.moments.service.MomentModel;
import com.xinbida.wukongim.entity.WKChannelType;

/** 与我相关：赞和评论。进入即标记已读，点击打开对应动态 */
public class MomentNoticesActivity extends WKBaseActivity<ActMomentNoticesBinding> {

    @Override
    protected ActMomentNoticesBinding getViewBinding() {
        return ActMomentNoticesBinding.inflate(getLayoutInflater());
    }

    @Override
    protected void setTitle(TextView titleTv) {
        titleTv.setText(R.string.moments_notices_title);
    }

    @Override
    protected void initView() {
        NoticeAdapter adapter = new NoticeAdapter();
        wkVBinding.recyclerView.setLayoutManager(new LinearLayoutManager(this));
        wkVBinding.recyclerView.setAdapter(adapter);
        adapter.setOnItemClickListener((a, v, pos) -> MomentListActivity.openDetail(this, adapter.getItem(pos).moment_no));
        MomentModel.getInstance().notices(0, (page, err) -> {
            if (page == null) {
                showToast(err);
                return;
            }
            adapter.setList(page.list);
            wkVBinding.emptyTv.setVisibility(page.list.isEmpty() ? View.VISIBLE : View.GONE);
            MomentsBadge.get().clearNotices();
        });
    }

    private static class NoticeAdapter extends BaseQuickAdapter<MomentNotice, BaseViewHolder> {
        NoticeAdapter() {
            super(R.layout.item_moment_notice);
        }

        @Override
        protected void convert(@NonNull BaseViewHolder h, MomentNotice n) {
            AvatarView avatar = h.getView(R.id.avatarView);
            avatar.setSize(44);
            avatar.showAvatar(n.uid, WKChannelType.PERSONAL);
            h.setText(R.id.nameTv, n.name);
            TextView action = h.getView(R.id.actionTv);
            if ("like".equals(n.action)) {
                action.setText(R.string.moments_notice_liked);
                action.setCompoundDrawablesRelativeWithIntrinsicBounds(R.drawable.ic_moment_like, 0, 0, 0);
                android.graphics.drawable.Drawable d = action.getCompoundDrawablesRelative()[0];
                int s = com.chat.base.utils.AndroidUtilities.dp(15);
                d.setBounds(0, 0, s, s);
                action.setCompoundDrawablesRelative(d, null, null, null);
            } else {
                action.setText(n.comment);
                action.setCompoundDrawablesRelative(null, null, null, null);
            }
            h.setText(R.id.timeTv, WKTimeUtils.getInstance().getTimeFormatText(n.created_at));
            String img = n.moment == null ? null : n.moment.img;
            h.setGone(R.id.thumbIv, TextUtils.isEmpty(img));
            h.setGone(R.id.thumbTv, !TextUtils.isEmpty(img));
            if (!TextUtils.isEmpty(img)) GlideUtils.getInstance().showImg(getContext(), WKApiConfig.getShowUrl(img), h.getView(R.id.thumbIv));
            else h.setText(R.id.thumbTv, n.moment == null ? "" : n.moment.content);
        }
    }
}
