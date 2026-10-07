package com.chat.moments.ui;

import android.text.SpannableStringBuilder;
import android.text.Spanned;
import android.text.TextUtils;
import android.text.style.ForegroundColorSpan;
import android.text.style.StyleSpan;
import android.util.TypedValue;
import android.view.View;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.core.content.ContextCompat;

import com.chad.library.adapter.base.BaseQuickAdapter;
import com.chad.library.adapter.base.viewholder.BaseViewHolder;
import com.chat.base.config.WKApiConfig;
import com.chat.base.config.WKConfig;
import com.chat.base.ui.components.AvatarView;
import com.chat.base.utils.AndroidUtilities;
import com.chat.base.utils.WKTimeUtils;
import com.chat.moments.R;
import com.chat.moments.entity.Moment;
import com.chat.moments.entity.MomentComment;
import com.chat.moments.entity.MomentImage;
import com.chat.moments.entity.UserBrief;
import com.chat.moments.view.NineGridView;
import com.xinbida.wukongim.entity.WKChannelType;

import java.util.ArrayList;
import java.util.List;

/** 动态列表；交互事件交给 Listener（MomentListController） */
public class MomentAdapter extends BaseQuickAdapter<Moment, BaseViewHolder> {

    public interface Listener {
        void onUser(String uid, String name);

        void onLike(Moment m);

        void onComment(Moment m, MomentComment replyTo);

        void onDeleteComment(Moment m, MomentComment c);

        void onDelete(Moment m);

        void onImage(Moment m, int index, List<ImageView> views);
    }

    private final Listener listener;

    public MomentAdapter(Listener listener) {
        super(R.layout.item_moment);
        this.listener = listener;
    }

    @Override
    protected void convert(@NonNull BaseViewHolder h, Moment m) {
        String me = WKConfig.getInstance().getUid();
        AvatarView avatar = h.getView(R.id.avatarView);
        avatar.setSize(44);
        avatar.showAvatar(m.uid, WKChannelType.PERSONAL);
        avatar.setOnClickListener(v -> listener.onUser(m.uid, m.name));
        TextView nameTv = h.getView(R.id.nameTv);
        nameTv.setText(m.name);
        nameTv.setOnClickListener(v -> listener.onUser(m.uid, m.name));

        TextView contentTv = h.getView(R.id.contentTv);
        contentTv.setText(m.content);
        contentTv.setVisibility(TextUtils.isEmpty(m.content) ? View.GONE : View.VISIBLE);

        NineGridView grid = h.getView(R.id.gridView);
        grid.setImages(m.imgs == null ? new ArrayList<>() : m.imgs);
        grid.setOnImageClick((index, views) -> listener.onImage(m, index, views));

        h.setText(R.id.timeTv, WKTimeUtils.getInstance().getTimeFormatText(m.created_at));
        h.setGone(R.id.lockIv, m.privacy_type != 1);
        TextView deleteTv = h.getView(R.id.deleteTv);
        deleteTv.setVisibility(me.equals(m.uid) ? View.VISIBLE : View.GONE);
        deleteTv.setOnClickListener(v -> listener.onDelete(m));

        TextView likeBtn = h.getView(R.id.likeBtn);
        likeBtn.setText(m.liked ? R.string.moments_liked : R.string.moments_like);
        likeBtn.setTextColor(ContextCompat.getColor(getContext(), m.liked ? R.color.colorAccent : R.color.color999));
        likeBtn.setCompoundDrawablesRelativeWithIntrinsicBounds(m.liked ? R.drawable.ic_moment_like : R.drawable.ic_moment_like_outline, 0, 0, 0);
        resizeDrawable(likeBtn);
        likeBtn.setOnClickListener(v -> listener.onLike(m));
        TextView commentBtn = h.getView(R.id.commentBtn);
        resizeDrawable(commentBtn);
        commentBtn.setOnClickListener(v -> listener.onComment(m, null));

        boolean hasLikes = m.likes != null && !m.likes.isEmpty();
        boolean hasComments = m.comments != null && !m.comments.isEmpty();
        h.setGone(R.id.interactLayout, !hasLikes && !hasComments);
        h.setGone(R.id.likesTv, !hasLikes);
        h.setGone(R.id.interactDivider, !(hasLikes && hasComments));
        if (hasLikes) {
            List<String> names = new ArrayList<>();
            for (UserBrief u : m.likes) names.add(u.name);
            TextView likesTv = h.getView(R.id.likesTv);
            likesTv.setText(TextUtils.join("、", names));
            resizeDrawable(likesTv);
        }
        LinearLayout commentsLayout = h.getView(R.id.commentsLayout);
        commentsLayout.removeAllViews();
        if (hasComments) {
            for (MomentComment c : m.comments) commentsLayout.addView(commentView(m, c));
        }
    }

    private View commentView(Moment m, MomentComment c) {
        TextView tv = new TextView(getContext());
        tv.setTextSize(TypedValue.COMPLEX_UNIT_SP, 14);
        tv.setTextColor(ContextCompat.getColor(getContext(), R.color.colorDark));
        tv.setLineSpacing(AndroidUtilities.dp(2), 1f);
        tv.setPadding(0, AndroidUtilities.dp(3), 0, AndroidUtilities.dp(3));
        int nameColor = ContextCompat.getColor(getContext(), R.color.ps_moment_name);
        SpannableStringBuilder sb = new SpannableStringBuilder();
        appendName(sb, c.name, nameColor);
        if (!TextUtils.isEmpty(c.reply_name)) {
            sb.append(" 回复 ");
            appendName(sb, c.reply_name, nameColor);
        }
        sb.append("：").append(c.content);
        tv.setText(sb);
        tv.setBackgroundResource(android.R.drawable.list_selector_background);
        boolean mine = WKConfig.getInstance().getUid().equals(c.uid);
        tv.setOnClickListener(v -> {
            if (mine) listener.onDeleteComment(m, c);
            else listener.onComment(m, c);
        });
        return tv;
    }

    private static void appendName(SpannableStringBuilder sb, String name, int color) {
        int start = sb.length();
        sb.append(name);
        sb.setSpan(new ForegroundColorSpan(color), start, sb.length(), Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);
        sb.setSpan(new StyleSpan(android.graphics.Typeface.BOLD), start, sb.length(), Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);
    }

    /** 矢量图标默认 24dp，按钮里缩到 16dp */
    private static void resizeDrawable(TextView tv) {
        android.graphics.drawable.Drawable d = tv.getCompoundDrawablesRelative()[0];
        if (d != null) {
            int s = AndroidUtilities.dp(16);
            d.setBounds(0, 0, s, s);
            tv.setCompoundDrawablesRelative(d, null, null, null);
        }
    }

    public static List<Object> imageUrls(List<MomentImage> imgs) {
        List<Object> urls = new ArrayList<>();
        for (MomentImage i : imgs) urls.add(WKApiConfig.getShowUrl(i.url));
        return urls;
    }
}
