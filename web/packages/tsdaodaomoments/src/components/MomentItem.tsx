import React, { useEffect, useRef, useState } from "react";
import classNames from "classnames";
import Viewer from "react-viewer";
import { Toast, Modal } from "@douyinfe/semi-ui";
import { WKApp } from "@tsdaodao/base";
import { Moment, MomentComment, MomentsAPI, PrivacyPrivate, imageURL } from "../service";
import { formatMomentTime, gridColumns, singleImageSize } from "../utils";

const COLLAPSE_LINES = 6

export interface MomentItemProps {
    moment: Moment
    onChange: (m: Moment) => void
    onDeleted: (momentNo: string) => void
    onOpenUser?: (uid: string, name: string) => void
}

const HeartIcon = ({ filled }: { filled?: boolean }) => (
    <svg viewBox="0 0 24 24" width="15" height="15" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z" />
    </svg>
)
const CommentIcon = () => (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.9A8 8 0 1 1 21 12z" />
    </svg>
)
const LockIcon = () => (
    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
)

export default function MomentItem(props: MomentItemProps) {
    const { moment: m, onChange, onDeleted, onOpenUser } = props
    const loginUID = WKApp.loginInfo.uid
    const [menuOpen, setMenuOpen] = useState(false)
    const [replyTo, setReplyTo] = useState<MomentComment | null | undefined>(undefined) // undefined=不在输入, null=评论动态
    const [draft, setDraft] = useState("")
    const [sending, setSending] = useState(false)
    const [expanded, setExpanded] = useState(false)
    const [collapsible, setCollapsible] = useState(false)
    const [viewerIndex, setViewerIndex] = useState(-1)
    const [likeBurst, setLikeBurst] = useState(0)
    const textRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    const menuRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const el = textRef.current
        if (el) {
            const lineHeight = parseFloat(getComputedStyle(el).lineHeight) || 22
            setCollapsible(el.scrollHeight > lineHeight * COLLAPSE_LINES + 4)
        }
    }, [m.content])

    useEffect(() => {
        if (replyTo !== undefined) inputRef.current?.focus()
    }, [replyTo])

    useEffect(() => {
        if (!menuOpen) return
        const close = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
        }
        document.addEventListener("mousedown", close)
        return () => document.removeEventListener("mousedown", close)
    }, [menuOpen])

    const toggleLike = async () => {
        setMenuOpen(false)
        const liked = !m.liked
        const me = { uid: loginUID || "", name: WKApp.loginInfo.name || "我" }
        const next = { ...m, liked, likes: liked ? [...m.likes, me] : m.likes.filter((l) => l.uid !== loginUID) }
        onChange(next) // 乐观更新
        if (liked) setLikeBurst((n) => n + 1)
        try {
            await (liked ? MomentsAPI.like(m.moment_no) : MomentsAPI.unlike(m.moment_no))
        } catch (err: any) {
            onChange(m)
            Toast.error(err?.msg || "操作失败")
        }
    }

    const startComment = (target: MomentComment | null) => {
        setMenuOpen(false)
        setDraft("")
        setReplyTo(target)
    }

    const sendComment = async () => {
        const content = draft.trim()
        if (!content || sending) return
        setSending(true)
        try {
            const c = await MomentsAPI.comment(m.moment_no, content, replyTo?.id)
            onChange({ ...m, comments: [...m.comments, c] })
            setReplyTo(undefined)
            setDraft("")
        } catch (err: any) {
            Toast.error(err?.msg || "评论失败")
        } finally {
            setSending(false)
        }
    }

    const removeComment = (c: MomentComment) => {
        Modal.confirm({
            title: c.uid === loginUID ? "删除这条评论？" : `删除 ${c.name} 的评论？`,
            okText: "删除",
            okButtonProps: { type: "danger" },
            onOk: async () => {
                try {
                    await MomentsAPI.removeComment(m.moment_no, c.id)
                    onChange({ ...m, comments: m.comments.filter((x) => x.id !== c.id) })
                } catch (err: any) {
                    Toast.error(err?.msg || "删除失败")
                }
            },
        })
    }

    // 点自己的评论 = 删除；点别人的评论 = 回复
    const onCommentClick = (c: MomentComment) => {
        if (c.uid === loginUID) {
            removeComment(c)
        } else {
            startComment(c)
        }
    }

    const remove = () => {
        Modal.confirm({
            title: "删除这条动态？",
            content: "删除后好友将无法再看到",
            okText: "删除",
            okButtonProps: { type: "danger" },
            onOk: async () => {
                try {
                    await MomentsAPI.remove(m.moment_no)
                    onDeleted(m.moment_no)
                } catch (err: any) {
                    Toast.error(err?.msg || "删除失败")
                }
            },
        })
    }

    const cols = gridColumns(m.imgs.length)
    const single = m.imgs.length === 1 ? singleImageSize(m.imgs[0].width, m.imgs[0].height) : undefined
    const images = m.imgs.map((img) => ({ src: imageURL(img.url), alt: "", downloadUrl: imageURL(img.url) }))
    const hasSocial = m.likes.length > 0 || m.comments.length > 0

    return <article className="wk-moment">
        <img className="wk-moment-avatar" src={WKApp.shared.avatarUser(m.uid)} alt="" onClick={() => onOpenUser?.(m.uid, m.name)} />
        <div className="wk-moment-main">
            <div className="wk-moment-name" onClick={() => onOpenUser?.(m.uid, m.name)}>{m.name}</div>
            {m.content ? <>
                <div ref={textRef} className={classNames("wk-moment-text", collapsible && !expanded && "collapsed")}>{m.content}</div>
                {collapsible ? <button className="wk-moment-more" onClick={() => setExpanded(!expanded)}>{expanded ? "收起" : "全文"}</button> : undefined}
            </> : undefined}
            {m.imgs.length > 0 ? <div className={classNames("wk-moment-grid", `cols-${cols}`)}>
                {m.imgs.map((img, i) => (
                    <div key={i} className="wk-moment-cell" style={single ? { width: single.width, height: single.height } : undefined}
                        onClick={() => setViewerIndex(i)}>
                        <img src={imageURL(img.url)} alt="" loading="lazy" />
                    </div>
                ))}
            </div> : undefined}

            <div className="wk-moment-meta">
                <span className="wk-moment-time">{formatMomentTime(m.created_at)}</span>
                {m.privacy_type === PrivacyPrivate ? <span className="wk-moment-private" title="仅自己可见"><LockIcon />仅自己可见</span> : undefined}
                {m.uid === loginUID ? <button className="wk-moment-delete" onClick={remove}>删除</button> : undefined}
                <div className="wk-moment-actions" ref={menuRef}>
                    <div className={classNames("wk-moment-actions-menu", menuOpen && "open")}>
                        <button onClick={toggleLike}><HeartIcon filled={m.liked} />{m.liked ? "取消" : "赞"}</button>
                        <i />
                        <button onClick={() => startComment(null)}><CommentIcon />评论</button>
                    </div>
                    <button className="wk-moment-actions-toggle" aria-label="点赞或评论" onClick={() => setMenuOpen(!menuOpen)}>
                        <span /><span />
                    </button>
                </div>
            </div>

            {hasSocial || replyTo !== undefined ? <div className="wk-moment-social">
                {m.likes.length > 0 ? <div className="wk-moment-likes">
                    <span key={likeBurst} className={classNames("wk-moment-likes-icon", likeBurst > 0 && "burst")}><HeartIcon filled /></span>
                    {m.likes.map((l, i) => <React.Fragment key={l.uid}>
                        {i > 0 ? "，" : ""}<span className="wk-moment-user" onClick={() => onOpenUser?.(l.uid, l.name)}>{l.name}</span>
                    </React.Fragment>)}
                </div> : undefined}
                {m.comments.length > 0 ? <ul className={classNames("wk-moment-comments", m.likes.length > 0 && "divided")}>
                    {m.comments.map((c) => <li key={c.id} onClick={() => onCommentClick(c)}>
                        <span className="wk-moment-user" onClick={(e) => { e.stopPropagation(); onOpenUser?.(c.uid, c.name) }}>{c.name}</span>
                        {c.reply_uid ? <><span className="wk-moment-reply-word">回复</span><span className="wk-moment-user" onClick={(e) => { e.stopPropagation(); onOpenUser?.(c.reply_uid!, c.reply_name || "") }}>{c.reply_name}</span></> : undefined}
                        ：{c.content}
                        {m.uid === loginUID && c.uid !== loginUID ? <button className="wk-moment-comment-delete" aria-label="删除评论"
                            onClick={(e) => { e.stopPropagation(); removeComment(c) }}>×</button> : undefined}
                    </li>)}
                </ul> : undefined}
                {replyTo !== undefined ? <form className="wk-moment-reply" onSubmit={(e) => { e.preventDefault(); sendComment() }}>
                    <input ref={inputRef} value={draft} maxLength={500}
                        placeholder={replyTo ? `回复 ${replyTo.name}` : "评论"}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Escape") setReplyTo(undefined) }}
                        onBlur={() => { if (!draft.trim()) setReplyTo(undefined) }} />
                    <button type="submit" disabled={!draft.trim() || sending}>发送</button>
                </form> : undefined}
            </div> : undefined}
        </div>

        <Viewer
            visible={viewerIndex >= 0}
            activeIndex={Math.max(0, viewerIndex)}
            images={images}
            noImgDetails={true}
            downloadable={true}
            rotatable={false}
            showTotal={images.length > 1}
            changeable={images.length > 1}
            onMaskClick={() => setViewerIndex(-1)}
            onClose={() => setViewerIndex(-1)}
        />
    </article>
}
