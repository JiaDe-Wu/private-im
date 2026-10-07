package com.chat.moments.ui;

import android.content.Context;
import android.content.Intent;
import android.widget.TextView;

import com.chat.base.base.WKBaseActivity;
import com.chat.base.config.WKConfig;
import com.chat.moments.R;
import com.chat.moments.databinding.MomentListLayoutBinding;

/** 某人的动态（uid）或一条动态的详情（moment_no） */
public class MomentListActivity extends WKBaseActivity<MomentListLayoutBinding> {
    private MomentListController controller;
    private String uid, name, momentNo;

    public static void openUser(Context ctx, String uid, String name) {
        ctx.startActivity(new Intent(ctx, MomentListActivity.class).putExtra("uid", uid).putExtra("name", name));
    }

    public static void openDetail(Context ctx, String momentNo) {
        ctx.startActivity(new Intent(ctx, MomentListActivity.class).putExtra("moment_no", momentNo));
    }

    @Override
    protected MomentListLayoutBinding getViewBinding() {
        uid = getIntent().getStringExtra("uid");
        name = getIntent().getStringExtra("name");
        momentNo = getIntent().getStringExtra("moment_no");
        return MomentListLayoutBinding.inflate(getLayoutInflater());
    }

    @Override
    protected void setTitle(TextView titleTv) {
        if (momentNo != null) titleTv.setText(R.string.moments_detail_title);
        else if (WKConfig.getInstance().getUid().equals(uid)) titleTv.setText(R.string.moments_my_title);
        else titleTv.setText(getString(R.string.moments_user_title, name == null ? "" : name));
    }

    @Override
    protected void initView() {
        boolean detail = momentNo != null;
        controller = new MomentListController(this, wkVBinding, detail ? MomentListController.Mode.DETAIL : MomentListController.Mode.USER, uid, momentNo);
        if (!detail) controller.setUserName(name);
        controller.reload();
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        if (controller != null) controller.destroy();
    }
}
