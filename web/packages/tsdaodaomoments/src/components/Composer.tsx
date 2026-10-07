import React, { useEffect, useRef, useState } from "react";
import classNames from "classnames";
import { Modal, Toast } from "@douyinfe/semi-ui";
import { MAX_IMAGES, MomentImage, MomentsAPI, MomentsStore, PrivacyFriends, PrivacyPrivate, uploadMomentImage } from "../service";
import { useMomentsStore } from "./useMomentsStore";

const MAX_LENGTH = 2000
const MAX_FILE_SIZE = 20 * 1024 * 1024

type Draft = {
    id: string
    preview: string // 本地预览地址
    uploaded?: MomentImage
    failed?: boolean
}

/** 发布动态弹窗：文字 + 最多 9 张图（支持选择、拖拽、粘贴），可选可见范围 */
export default function Composer() {
    const store = useMomentsStore()
    const [content, setContent] = useState("")
    const [drafts, setDrafts] = useState<Draft[]>([])
    const [privacy, setPrivacy] = useState(PrivacyFriends)
    const [publishing, setPublishing] = useState(false)
    const [dragging, setDragging] = useState(false)
    const fileRef = useRef<HTMLInputElement>(null)
    const textRef = useRef<HTMLTextAreaElement>(null)

    useEffect(() => {
        if (store.composerOpen) {
            setTimeout(() => textRef.current?.focus(), 120)
        }
    }, [store.composerOpen])

    const reset = () => {
        drafts.forEach((d) => URL.revokeObjectURL(d.preview))
        setContent("")
        setDrafts([])
        setPrivacy(PrivacyFriends)
    }

    const addFiles = (files: File[]) => {
        const images = files.filter((f) => f.type.startsWith("image/"))
        const room = MAX_IMAGES - drafts.length
        if (images.length > room) Toast.warning(`最多 ${MAX_IMAGES} 张图片`)
        images.slice(0, room).forEach((file) => {
            if (file.size > MAX_FILE_SIZE) {
                Toast.warning(`${file.name} 超过 20MB`)
                return
            }
            const id = Math.random().toString(36).slice(2)
            setDrafts((ds) => [...ds, { id, preview: URL.createObjectURL(file) }])
            uploadMomentImage(file)
                .then((img) => setDrafts((ds) => ds.map((d) => d.id === id ? { ...d, uploaded: img } : d)))
                .catch(() => setDrafts((ds) => ds.map((d) => d.id === id ? { ...d, failed: true } : d)))
        })
    }

    const removeDraft = (id: string) => {
        setDrafts((ds) => {
            const d = ds.find((x) => x.id === id)
            if (d) URL.revokeObjectURL(d.preview)
            return ds.filter((x) => x.id !== id)
        })
    }

    const uploading = drafts.some((d) => !d.uploaded && !d.failed)
    const hasFailed = drafts.some((d) => d.failed)
    const canPublish = (content.trim() !== "" || drafts.length > 0) && !uploading && !hasFailed && !publishing

    const publish = async () => {
        if (!canPublish) return
        setPublishing(true)
        try {
            await MomentsAPI.publish(content.trim(), drafts.map((d) => d.uploaded!), privacy)
            Toast.success("已发表")
            reset()
            MomentsStore.shared.closeComposer(true)
        } catch (err: any) {
            Toast.error(err?.msg || "发表失败")
        } finally {
            setPublishing(false)
        }
    }

    const close = () => {
        if (content.trim() || drafts.length) {
            Modal.confirm({
                title: "放弃这次编辑？",
                okText: "放弃",
                cancelText: "继续编辑",
                onOk: () => { reset(); MomentsStore.shared.closeComposer(false) },
            })
            return
        }
        MomentsStore.shared.closeComposer(false)
    }

    return <Modal
        visible={store.composerOpen}
        title="发表动态"
        width={520}
        className="wk-moments-composer"
        maskClosable={false}
        onCancel={close}
        footer={<div className="wk-moments-composer-footer">
            <div className="wk-moments-privacy" role="radiogroup" aria-label="可见范围">
                <button type="button" role="radio" aria-checked={privacy === PrivacyFriends} className={classNames(privacy === PrivacyFriends && "on")} onClick={() => setPrivacy(PrivacyFriends)}>好友可见</button>
                <button type="button" role="radio" aria-checked={privacy === PrivacyPrivate} className={classNames(privacy === PrivacyPrivate && "on")} onClick={() => setPrivacy(PrivacyPrivate)}>仅自己可见</button>
            </div>
            <button type="button" className="wk-moments-publish" disabled={!canPublish} onClick={publish}>
                {publishing ? "发表中…" : uploading ? "图片上传中…" : "发表"}
            </button>
        </div>}
    >
        <div className={classNames("wk-moments-composer-body", dragging && "dragging")}
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(Array.from(e.dataTransfer.files)) }}>
            <textarea ref={textRef} value={content} maxLength={MAX_LENGTH} placeholder="这一刻的想法…（可直接粘贴或拖入图片）"
                onChange={(e) => setContent(e.target.value)}
                onPaste={(e) => {
                    const files = Array.from(e.clipboardData.files)
                    if (files.length) { e.preventDefault(); addFiles(files) }
                }}
                onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") publish() }} />
            <div className="wk-moments-composer-count">{content.length}/{MAX_LENGTH}</div>
            <div className="wk-moments-composer-grid">
                {drafts.map((d) => <div key={d.id} className={classNames("wk-moments-composer-cell", !d.uploaded && !d.failed && "uploading", d.failed && "failed")}>
                    <img src={d.preview} alt="" />
                    {d.failed ? <span className="wk-moments-composer-tip">上传失败</span> : undefined}
                    <button type="button" aria-label="移除图片" onClick={() => removeDraft(d.id)}>×</button>
                </div>)}
                {drafts.length < MAX_IMAGES ? <button type="button" className="wk-moments-composer-add" aria-label="添加图片" onClick={() => fileRef.current?.click()}>
                    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
                </button> : undefined}
            </div>
            <input ref={fileRef} type="file" accept="image/*" multiple hidden
                onChange={(e) => { addFiles(Array.from(e.target.files || [])); e.target.value = "" }} />
        </div>
    </Modal>
}
