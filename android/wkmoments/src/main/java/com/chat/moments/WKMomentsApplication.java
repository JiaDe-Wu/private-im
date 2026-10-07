package com.chat.moments;

import android.content.Context;

import com.chat.base.endpoint.EndpointManager;
import com.chat.moments.ui.MomentListActivity;
import com.chat.moments.ui.MomentsFragment;
import com.xinbida.wukongim.WKIM;

/**
 * 朋友圈模块入口（TSApplication 启动时调用 init）。
 * 对外提供：get_moments_fragment（底部标签页）、show_user_moments（某人的动态）；
 * 监听服务端 momentMsg 命令刷新红点。
 */
public class WKMomentsApplication {
    public static final String CMD_MOMENT = "momentMsg"; // 与服务端 modules/moment、Web 端一致

    private WKMomentsApplication() {
    }

    private static class Holder {
        static final WKMomentsApplication INSTANCE = new WKMomentsApplication();
    }

    public static WKMomentsApplication getInstance() {
        return Holder.INSTANCE;
    }

    public void init(Context context) {
        EndpointManager.getInstance().setMethod("get_moments_fragment", object -> new MomentsFragment());
        EndpointManager.getInstance().setMethod("show_user_moments", object -> {
            if (object instanceof String[] && ((String[]) object).length == 2) {
                String[] a = (String[]) object;
                MomentListActivity.openUser(context, a[0], a[1]);
            }
            return null;
        });
        EndpointManager.getInstance().setMethod("moments_refresh_badge", object -> {
            MomentsBadge.get().refresh();
            return null;
        });
        WKIM.getInstance().getCMDManager().addCmdListener("moments", cmd -> {
            if (CMD_MOMENT.equals(cmd.cmdKey)) MomentsBadge.get().refresh();
        });
    }
}
