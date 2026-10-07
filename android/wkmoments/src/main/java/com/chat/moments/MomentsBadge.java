package com.chat.moments;

import com.chat.base.endpoint.EndpointManager;
import com.chat.moments.service.MomentModel;

import java.util.ArrayList;
import java.util.List;

/**
 * 朋友圈红点：noticeCount = 与我相关的未读数（显示数字），feedCount = 好友新动态数（显示圆点）。
 * 变化时通知底部标签（TabActivity 注册的 tab_moments_dot）和朋友圈页头部。
 */
public class MomentsBadge {
    public int noticeCount;
    public int feedCount;
    public String latestUid;
    private int epoch; // 本地清零后丢弃更早发出的刷新结果，避免红点「复活」
    private final List<Runnable> listeners = new ArrayList<>();

    private static final MomentsBadge INSTANCE = new MomentsBadge();

    public static MomentsBadge get() {
        return INSTANCE;
    }

    public void addListener(Runnable r) {
        listeners.add(r);
    }

    public void removeListener(Runnable r) {
        listeners.remove(r);
    }

    public void refresh() {
        final int e = epoch;
        MomentModel.getInstance().noticeUnread((d, err) -> {
            if (d != null && e == epoch) {
                noticeCount = d.count;
                notifyChanged();
            }
        });
        MomentModel.getInstance().feedUnread((d, err) -> {
            if (d != null && e == epoch) {
                feedCount = d.count;
                latestUid = d.latest_uid;
                notifyChanged();
            }
        });
    }

    public void clearFeed() {
        epoch++;
        feedCount = 0;
        notifyChanged();
        MomentModel.getInstance().feedRead();
    }

    public void clearNotices() {
        epoch++;
        noticeCount = 0;
        notifyChanged();
        MomentModel.getInstance().noticeRead();
    }

    public void reset() {
        epoch++;
        noticeCount = 0;
        feedCount = 0;
        notifyChanged();
    }

    private void notifyChanged() {
        EndpointManager.getInstance().invoke("tab_moments_dot", new int[]{noticeCount, feedCount});
        for (Runnable r : new ArrayList<>(listeners)) r.run();
    }
}
