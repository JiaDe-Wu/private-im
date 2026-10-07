import React, { useCallback, useEffect, useRef, useState } from "react";
import { Spin, Toast } from "@douyinfe/semi-ui";
import { WKApp } from "@tsdaodao/base";
import { Moment, MomentsAPI, MomentsStore, imageURL, uploadMomentImage } from "../service";
import MomentItem from "./MomentItem";
import { useMomentsStore } from "./useMomentsStore";

const PAGE_SIZE = 10

export type FeedMode = { kind: "timeline" } | { kind: "user", uid: string, name: string }

const CameraIcon = () => (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" /><circle cx="12" cy="13.5" r="3.5" />
    </svg>
)

/** 时间线 / 个人动态：顶部封面 + 动态列表，滚动到底自动加载下一页 */
export default function Feed(props: { mode: FeedMode, onOpenUser: (uid: string, name: string) => void }) {
    const { mode, onOpenUser } = props
    const store = useMomentsStore()
    const ownerUID = mode.kind === "user" ? mode.uid : WKApp.loginInfo.uid || ""
    const ownerName = mode.kind === "user" ? mode.name : WKApp.loginInfo.name || ""
    const isMine = ownerUID === WKApp.loginInfo.uid

    const [list, setList] = useState<Moment[]>([])
    const [cursor, setCursor] = useState(0)
    const [hasMore, setHasMore] = useState(true)
    const [loading, setLoading] = useState(false)
    const [cover, setCover] = useState("")
    const [coverUploading, setCoverUploading] = useState(false)
    const sentinelRef = useRef<HTMLDivElement>(null)
    const coverInputRef = useRef<HTMLInputElement>(null)
    const loadingRef = useRef(false)

    const fetchPage = useCallback((before: number) => mode.kind === "user"
        ? MomentsAPI.userMoments(mode.uid, before, PAGE_SIZE)
        : MomentsAPI.timeline(before, PAGE_SIZE), [mode])

    const load = useCallback(async (reset: boolean) => {
        if (loadingRef.current) return
        loadingRef.current = true
        setLoading(true)
        try {
            const page = await fetchPage(reset ? 0 : cursor)
            setList((old) => reset ? page.list : [...old, ...page.list.filter((m) => !old.some((o) => o.moment_no === m.moment_no))])
            setCursor(page.next_cursor)
            setHasMore(page.next_cursor > 0)
            if (reset && mode.kind === "timeline") MomentsStore.shared.readFeed()
        } catch (err: any) {
            Toast.error(err?.msg || "加载失败")
        } finally {
            loadingRef.current = false
            setLoading(false)
        }
    }, [fetchPage, cursor, mode.kind])

    useEffect(() => {
        load(true)
        MomentsAPI.setting(ownerUID).then((s) => setCover(s.cover)).catch(() => undefined)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ownerUID, mode.kind, store.publishedTick])

    useEffect(() => {
        const el = sentinelRef.current
        if (!el || !hasMore) return
        const io = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) load(false)
        }, { rootMargin: "300px" })
        io.observe(el)
        return () => io.disconnect()
    }, [hasMore, load])

    const changeCover = async (file?: File) => {
        if (!file) return
        setCoverUploading(true)
        try {
            const img = await uploadMomentImage(file, "momentcover")
            const path = `${img.url}?v=${Date.now()}` // 封面路径固定，加版本号避免缓存
            await MomentsAPI.updateCover(path)
            setCover(path)
        } catch (err: any) {
            Toast.error(err?.msg || "封面上传失败")
        } finally {
            setCoverUploading(false)
        }
    }

    const showNewBanner = mode.kind === "timeline" && store.feedUnread > 0 && list.length > 0

    return <div className="wk-moments-feed">
        <header className="wk-moments-cover" style={cover ? { backgroundImage: `url(${imageURL(cover)})` } : undefined}>
            {isMine ? <button className="wk-moments-cover-change" disabled={coverUploading} onClick={() => coverInputRef.current?.click()}>
                {coverUploading ? "上传中…" : "更换封面"}
            </button> : undefined}
            {mode.kind === "timeline" ? <button className="wk-moments-camera" aria-label="发动态" onClick={() => MomentsStore.shared.openComposer()}><CameraIcon /></button> : undefined}
            <div className="wk-moments-owner" onClick={() => onOpenUser(ownerUID, ownerName)}>
                <span>{ownerName}</span>
                <img src={WKApp.shared.avatarUser(ownerUID)} alt="" />
            </div>
            <input ref={coverInputRef} type="file" accept="image/*" hidden onChange={(e) => { changeCover(e.target.files?.[0]); e.target.value = "" }} />
        </header>

        {showNewBanner ? <button className="wk-moments-newbanner" onClick={() => load(true)}>
            {store.latestUID ? <img src={WKApp.shared.avatarUser(store.latestUID)} alt="" /> : undefined}
            {store.feedUnread} 条新动态
        </button> : undefined}

        <div className="wk-moments-list">
            {list.map((m) => <MomentItem key={m.moment_no} moment={m} onOpenUser={onOpenUser}
                onChange={(next) => setList((ls) => ls.map((x) => x.moment_no === next.moment_no ? next : x))}
                onDeleted={(no) => setList((ls) => ls.filter((x) => x.moment_no !== no))} />)}
            {!loading && list.length === 0 ? <div className="wk-moments-empty">
                <img src={`${process.env.PUBLIC_URL}/logo.png`} alt="" />
                <p>{mode.kind === "timeline" ? "还没有动态，发一条和好友分享吧" : isMine ? "你还没有发过动态" : "暂时没有可以看的动态"}</p>
                {mode.kind === "timeline" || isMine ? <button onClick={() => MomentsStore.shared.openComposer()}>发动态</button> : undefined}
            </div> : undefined}
            <div ref={sentinelRef} className="wk-moments-sentinel">
                {loading ? <Spin /> : !hasMore && list.length > 0 ? <span>— 没有更多了 —</span> : undefined}
            </div>
        </div>
    </div>
}
