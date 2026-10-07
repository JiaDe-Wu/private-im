package com.chat.moments.ui;

import android.content.Intent;
import android.widget.ImageView;
import android.widget.TextView;

import com.chat.base.base.WKBaseFragment;
import com.chat.moments.R;
import com.chat.moments.databinding.MomentListLayoutBinding;

/** 底部「朋友圈」标签页：好友时间线。每次切到本页都刷新并清除新动态红点 */
public class MomentsFragment extends WKBaseFragment<MomentListLayoutBinding> {
    private MomentListController controller;
    static final int REQ_PUBLISH = 701;

    @Override
    protected MomentListLayoutBinding getViewBinding() {
        return MomentListLayoutBinding.inflate(getLayoutInflater());
    }

    @Override
    protected boolean isShowBackLayout() {
        return false;
    }

    @Override
    protected void setTitle(TextView titleTv) {
        titleTv.setText(R.string.moments_title);
    }

    @Override
    protected int getRightIvResourceId(ImageView imageView) {
        return R.drawable.ic_moment_camera;
    }

    @Override
    protected void getRightView(ImageView rightIv) {
        rightIv.setContentDescription(getString(R.string.moments_publish_title));
        // 直接绑在图标上：基类挂在 titleRightLayout 上的点击在真机上没有触发
        rightIv.setOnClickListener(v -> openPublish());
        android.util.Log.i("PSMoments", "camera bound fragment=" + System.identityHashCode(this));
        rightIv.setOnTouchListener((v, e) -> {
            if (e.getActionMasked() == android.view.MotionEvent.ACTION_DOWN)
                android.util.Log.i("PSMoments", "camera touch down fragment=" + System.identityHashCode(this) + " added=" + isAdded());
            return false;
        });
    }

    @Override
    protected void rightLayoutClick() {
        openPublish();
    }

    private void openPublish() {
        android.util.Log.i("PSMoments", "openPublish");
        startActivityForResult(new Intent(getActivity(), MomentPublishActivity.class), REQ_PUBLISH);
    }

    @Override
    protected void initView() {
        // 标签页不需要返回键（基类的 isShowBackLayout 没有生效）
        android.view.View back = wkVBinding.getRoot().findViewById(com.chat.base.R.id.backIv);
        if (back != null) back.setVisibility(android.view.View.GONE);
        controller = new MomentListController(requireActivity(), wkVBinding, MomentListController.Mode.TIMELINE, null, null);
    }

    @Override
    public void onResume() {
        super.onResume();
        android.util.Log.i("PSMoments", "onResume fragment=" + System.identityHashCode(this) + " viewAttached=" + (wkVBinding.getRoot().isAttachedToWindow()));
        controller.reload(); // ViewPager2 只在当前页 RESUMED，切到本页即刷新
    }

    @Override
    public void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == REQ_PUBLISH && resultCode == android.app.Activity.RESULT_OK) controller.reload();
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        if (controller != null) controller.destroy();
    }
}
