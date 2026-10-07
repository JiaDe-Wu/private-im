import React, { useEffect, useState } from "react";
import { Spin, Toast } from "@douyinfe/semi-ui";
import { WKApp } from "@tsdaodao/base";
import { Moment, MomentNotice, MomentsAPI, MomentsStore, imageURL } from "../service";
import { formatMomentTime } from "../utils";
import MomentItem from "./MomentItem";

/** 与我相关：点赞与评论提醒，打开即标记已读 */
export function Notices(props: { onOpenMoment: (momentNo: string) => void }) {
    const [list, setList] = useState<MomentNotice[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        MomentsAPI.notices(0, 50)
            .then((r) => setList(r.list))
            .catch((err) => Toast.error(err?.msg || "加载失败"))
            .finally(() => setLoading(false))
        MomentsStore.shared.readNotices()
    }, [])

    return <div className="wk-moments-panel">
        <h2 className="wk-moments-panel-title">与我相关</h2>
        {loading ? <div className="wk-moments-sentinel"><Spin /></div> : undefined}
        {!loading && list.length === 0 ? <div className="wk-moments-empty"><p>暂时还没有人点赞或评论</p></div> : undefined}
        <ul className="wk-moments-notices">
            {list.map((n) => <li key={n.id} onClick={() => n.moment ? props.onOpenMoment(n.moment_no) : Toast.info("该动态已删除")}>
                <img className="wk-moments-notice-avatar" src={WKApp.shared.avatarUser(n.uid)} alt="" />
                <div className="wk-moments-notice-main">
                    <div className="wk-moments-notice-name">{n.name}</div>
                    <div className="wk-moments-notice-action">
                        {n.action === "like" ? <span className="wk-moments-notice-heart">♥</span> : n.comment}
                    </div>
                    <div className="wk-moments-notice-time">{formatMomentTime(n.created_at)}</div>
                </div>
                <div className="wk-moments-notice-thumb">
                    {!n.moment ? <span className="deleted">已删除</span>
                        : n.moment.img ? <img src={imageURL(n.moment.img)} alt="" />
                            : <span>{n.moment.content}</span>}
                </div>
            </li>)}
        </ul>
    </div>
}

/** 单条动态详情（从提醒进入） */
export function MomentDetail(props: { momentNo: string, onOpenUser: (uid: string, name: string) => void, onBack: () => void }) {
    const [moment, setMoment] = useState<Moment | undefined>()
    const [error, setError] = useState("")

    useEffect(() => {
        MomentsAPI.detail(props.momentNo).then(setMoment).catch((err) => setError(err?.msg || "加载失败"))
    }, [props.momentNo])

    return <div className="wk-moments-panel">
        <div className="wk-moments-panel-title">
            <button className="wk-moments-back" onClick={props.onBack} aria-label="返回">‹</button>
            详情
        </div>
        {error ? <div className="wk-moments-empty"><p>{error}</p></div> : undefined}
        {!moment && !error ? <div className="wk-moments-sentinel"><Spin /></div> : undefined}
        {moment ? <div className="wk-moments-list"><MomentItem moment={moment} onChange={setMoment} onOpenUser={props.onOpenUser}
            onDeleted={() => props.onBack()} /></div> : undefined}
    </div>
}
