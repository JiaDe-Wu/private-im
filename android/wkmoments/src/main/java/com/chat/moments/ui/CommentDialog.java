package com.chat.moments.ui;

import android.app.Dialog;
import android.content.Context;
import android.text.TextUtils;
import android.view.Gravity;
import android.view.LayoutInflater;
import android.view.ViewGroup;
import android.view.Window;
import android.view.WindowManager;
import android.view.inputmethod.EditorInfo;

import androidx.annotation.NonNull;

import com.chat.moments.databinding.DialogMomentCommentBinding;

/** 底部评论输入条：弹出即聚焦并显示键盘，发送后关闭 */
public class CommentDialog extends Dialog {
    public interface OnSend {
        void onSend(String text);
    }

    public CommentDialog(@NonNull Context context, String hint, OnSend onSend) {
        super(context, android.R.style.Theme_Material_Light_Dialog_NoActionBar);
        DialogMomentCommentBinding b = DialogMomentCommentBinding.inflate(LayoutInflater.from(context));
        setContentView(b.getRoot());
        b.inputEt.setHint(hint);
        Runnable send = () -> {
            String text = b.inputEt.getText() == null ? "" : b.inputEt.getText().toString().trim();
            if (TextUtils.isEmpty(text)) return;
            onSend.onSend(text);
            dismiss();
        };
        b.sendBtn.setOnClickListener(v -> send.run());
        b.inputEt.setOnEditorActionListener((v, actionId, e) -> {
            if (actionId == EditorInfo.IME_ACTION_SEND) {
                send.run();
                return true;
            }
            return false;
        });
        Window w = getWindow();
        if (w != null) {
            w.setGravity(Gravity.BOTTOM);
            w.setLayout(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
            w.setBackgroundDrawableResource(android.R.color.transparent);
            w.getDecorView().setPadding(0, 0, 0, 0);
            w.setDimAmount(0.25f);
            w.setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_STATE_ALWAYS_VISIBLE | WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE);
        }
        setCanceledOnTouchOutside(true);
        b.inputEt.requestFocus();
    }
}
