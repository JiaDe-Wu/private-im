package com.chat.moments.ui;

import android.app.Activity;
import android.content.Intent;
import android.view.LayoutInflater;
import android.view.View;
import android.widget.ImageView;

import androidx.recyclerview.widget.LinearLayoutManager;

import com.chat.base.config.WKConfig;
import com.chat.base.utils.WKDialogUtils;
import com.chat.base.utils.WKToastUtils;
import com.chat.moments.MomentsBadge;
import com.chat.moments.R;
import com.chat.moments.databinding.MomentHeaderBinding;
import com.chat.moments.databinding.MomentListLayoutBinding;
import com.chat.moments.entity.Moment;
import com.chat.moments.entity.MomentComment;
import com.chat.moments.entity.MomentPage;
import com.chat.moments.entity.UserBrief;
import com.chat.moments.service.MomentModel;
import com.xinbida.wukongim.entity.WKChannelType;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * 动态列表的加载与交互，供时间线（Fragment）、某人的动态、详情（Activity）共用。
 * mode：TIMELINE 显示封面头部和新消息提示；USER 显示头部不显示提示；DETAIL 只显示一条。
 */
public class MomentListController implements MomentAdapter.Listener {
    public enum Mode {TIMELINE, USER, DETAIL}

    private final Activity activity;
    private final MomentListLayoutBinding b;
    private final Mode mode;
    private final String uid;       // USER 模式
    private final String momentNo;  // DETAIL 模式
    private final MomentAdapter adapter = new MomentAdapter(this);
    private MomentHeaderBinding header;
    private long nextCursor = 0;
    private boolean loading = false;
    private final Runnable badgeListener = this::updateNoticePill;

    public MomentListController(Activity activity, MomentListLayoutBinding b, Mode mode, String uid, String momentNo) {
        this.activity = activity;
        this.b = b;
        this.mode = mode;
        this.uid = uid;
        this.momentNo = momentNo;
        b.recyclerView.setLayoutManager(new LinearLayoutManager(activity));
        b.recyclerView.setAdapter(adapter);
        if (mode != Mode.DETAIL) {
            header = MomentHeaderBinding.inflate(LayoutInflater.from(activity));
            adapter.addHeaderView(header.getRoot());
            String headUid = mode == Mode.USER ? uid : WKConfig.getInstance().getUid();
            header.myAvatarView.setSize(68);
            header.myAvatarView.showAvatar(headUid, WKChannelType.PERSONAL);
            header.myNameTv.setText(mode == Mode.USER ? "" : WKConfig.getInstance().getUserName());
            header.noticeTv.setOnClickListener(v -> activity.startActivity(new Intent(activity, MomentNoticesActivity.class)));
            if (mode == Mode.TIMELINE) MomentsBadge.get().addListener(badgeListener);
        }
        b.refreshLayout.setEnableLoadMore(mode != Mode.DETAIL);
        b.refreshLayout.setOnRefreshListener(l -> reload());
        b.refreshLayout.setOnLoadMoreListener(l -> loadMore());
    }

    public void setUserName(String name) {
        if (header != null) header.myNameTv.setText(name);
    }

    public void destroy() {
        MomentsBadge.get().removeListener(badgeListener);
    }

    private void updateNoticePill() {
        if (header == null || mode != Mode.TIMELINE) return;
        int n = MomentsBadge.get().noticeCount;
        header.noticeTv.setVisibility(n > 0 ? View.VISIBLE : View.GONE);
        header.noticeTv.setText(activity.getString(R.string.moments_new_notices, n));
    }

    public void reload() {
        if (mode == Mode.TIMELINE) {
            MomentsBadge.get().clearFeed();
            MomentsBadge.get().refresh();
        }
        if (mode == Mode.DETAIL) {
            MomentModel.getInstance().detail(momentNo, (m, err) -> {
                b.refreshLayout.finishRefresh();
                if (m != null) adapter.setList(Collections.singletonList(m));
                else toast(err);
            });
            return;
        }
        load(0);
    }

    private void loadMore() {
        if (nextCursor == 0) {
            b.refreshLayout.finishLoadMoreWithNoMoreData();
            return;
        }
        load(nextCursor);
    }

    private void load(long before) {
        if (loading) return;
        loading = true;
        MomentModel.getInstance().list(mode == Mode.USER ? uid : null, before, (MomentPage page, String err) -> {
            loading = false;
            b.refreshLayout.finishRefresh();
            if (page == null) {
                b.refreshLayout.finishLoadMore(false);
                toast(err);
                return;
            }
            nextCursor = page.next_cursor;
            if (before == 0) adapter.setList(page.list);
            else adapter.addData(page.list);
            if (nextCursor == 0) b.refreshLayout.finishLoadMoreWithNoMoreData();
            else b.refreshLayout.finishLoadMore();
            if (header != null) {
                header.emptyTv.setText(mode == Mode.USER ? R.string.moments_user_empty : R.string.moments_empty);
                header.emptyTv.setVisibility(adapter.getData().isEmpty() ? View.VISIBLE : View.GONE);
            }
        });
    }

    private void toast(String msg) {
        if (msg != null) WKToastUtils.getInstance().showToastNormal(msg);
    }

    private void notifyItem(Moment m) {
        int i = adapter.getData().indexOf(m);
        if (i >= 0) adapter.notifyItemChanged(i + adapter.getHeaderLayoutCount());
    }

    // ---------- 交互 ----------

    @Override
    public void onUser(String targetUid, String name) {
        if (mode == Mode.USER && targetUid.equals(uid)) return;
        MomentListActivity.openUser(activity, targetUid, name);
    }

    @Override
    public void onLike(Moment m) {
        boolean target = !m.liked;
        // 先本地更新，失败再回滚
        applyLike(m, target);
        MomentModel.getInstance().setLiked(m.moment_no, target, (r, err) -> {
            if (err != null) {
                applyLike(m, !target);
                toast(err);
            }
        });
    }

    private void applyLike(Moment m, boolean liked) {
        String me = WKConfig.getInstance().getUid();
        m.liked = liked;
        if (m.likes == null) m.likes = new ArrayList<>();
        m.likes.removeIf(u -> me.equals(u.uid));
        if (liked) {
            UserBrief u = new UserBrief();
            u.uid = me;
            u.name = WKConfig.getInstance().getUserName();
            m.likes.add(u);
        }
        notifyItem(m);
    }

    @Override
    public void onComment(Moment m, MomentComment replyTo) {
        String hint = replyTo == null ? activity.getString(R.string.moments_comment_hint) : activity.getString(R.string.moments_reply_to, replyTo.name);
        new CommentDialog(activity, hint, text -> MomentModel.getInstance().comment(m.moment_no, text, replyTo == null ? 0 : replyTo.id, (c, err) -> {
            if (c == null) {
                toast(err);
                return;
            }
            if (m.comments == null) m.comments = new ArrayList<>();
            m.comments.add(c);
            notifyItem(m);
        })).show();
    }

    @Override
    public void onDeleteComment(Moment m, MomentComment c) {
        WKDialogUtils.getInstance().showDialog(activity, "", activity.getString(R.string.moments_delete_comment_confirm), true, "", activity.getString(R.string.moments_delete), 0, 0, index -> {
            if (index != 1) return;
            MomentModel.getInstance().deleteComment(m.moment_no, c.id, (r, err) -> {
                if (err != null) {
                    toast(err);
                    return;
                }
                m.comments.remove(c);
                notifyItem(m);
            });
        });
    }

    @Override
    public void onDelete(Moment m) {
        WKDialogUtils.getInstance().showDialog(activity, "", activity.getString(R.string.moments_delete_confirm), true, "", activity.getString(R.string.moments_delete), 0, 0, index -> {
            if (index != 1) return;
            MomentModel.getInstance().delete(m.moment_no, (r, err) -> {
                if (err != null) {
                    toast(err);
                    return;
                }
                adapter.remove(m);
                if (mode == Mode.DETAIL) activity.finish();
            });
        });
    }

    @Override
    public void onImage(Moment m, int index, List<ImageView> views) {
        WKDialogUtils.getInstance().showImagePopup(activity, MomentAdapter.imageUrls(m.imgs), views, views.get(index), index, new ArrayList<>(), null, null);
    }
}
