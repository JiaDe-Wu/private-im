import React from "react";
import classNames from "classnames";
import { WKApp } from "@tsdaodao/base";
import { MomentsStore } from "../service";
import Feed from "./Feed";
import Composer from "./Composer";
import { MomentDetail, Notices } from "./Notices";
import { useMomentsStore } from "./useMomentsStore";

const openUser = (uid: string, name: string) => MomentsStore.shared.push({ kind: "user", uid, name })

/** 右侧内容：按导航栈显示时间线 / 与我相关 / 个人动态 / 详情 */
export function MomentsMain() {
    const store = useMomentsStore()
    const view = store.view
    const canBack = store.stack.length > 1
    let content: JSX.Element
    switch (view.kind) {
        case "notices":
            content = <Notices onOpenMoment={(momentNo) => store.push({ kind: "detail", momentNo })} />
            break
        case "detail":
            content = <MomentDetail momentNo={view.momentNo} onOpenUser={openUser} onBack={() => store.back()} />
            break
        case "user":
            content = <Feed key={`user-${view.uid}`} mode={view} onOpenUser={openUser} />
            break
        default:
            content = <Feed key="timeline" mode={{ kind: "timeline" }} onOpenUser={openUser} />
    }
    return <div className="wk-moments-main">
        {canBack && view.kind === "user" ? <button className="wk-moments-floatback" onClick={() => store.back()} aria-label="返回">‹ 返回</button> : undefined}
        <div className="wk-moments-main-scroll" key={store.stack.length}>{content}</div>
        <Composer />
    </div>
}

type SidebarEntry = { key: "timeline" | "notices" | "mine", title: string, desc: string, icon: JSX.Element }

const ENTRIES: SidebarEntry[] = [
    {
        key: "timeline", title: "好友动态", desc: "看看大家最近在做什么",
        icon: <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 3l2.4 5.6M21 12l-5.6 2.4M12 21l-2.4-5.6M3 12l5.6-2.4" /></svg>,
    },
    {
        key: "notices", title: "与我相关", desc: "赞和评论",
        icon: <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></svg>,
    },
    {
        key: "mine", title: "我的动态", desc: "我发过的全部动态",
        icon: <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="3" /><circle cx="9" cy="10" r="2" /><path d="M21 16l-5-5-8 9" /></svg>,
    },
]

/** 左侧栏：入口列表 + 发动态按钮 */
export function MomentsSidebar() {
    const store = useMomentsStore()
    const root = store.stack[0]
    const selected = root.kind === "user" ? "mine" : root.kind === "detail" ? "notices" : root.kind

    const open = (key: SidebarEntry["key"]) => {
        if (key === "mine") {
            store.showRoot({ kind: "user", uid: WKApp.loginInfo.uid || "", name: WKApp.loginInfo.name || "" })
        } else {
            store.showRoot({ kind: key })
        }
    }

    return <div className="wk-moments-sidebar">
        <div className="wk-moments-sidebar-header">朋友圈</div>
        <ul>
            {ENTRIES.map((e) => <li key={e.key} className={classNames(selected === e.key && "selected")} onClick={() => open(e.key)}>
                <span className="wk-moments-sidebar-icon">{e.icon}</span>
                <span className="wk-moments-sidebar-text">
                    <b>{e.title}</b>
                    <small>{e.desc}</small>
                </span>
                {e.key === "timeline" && store.feedUnread > 0 ? <span className="wk-moments-sidebar-dot">
                    {store.latestUID ? <img src={WKApp.shared.avatarUser(store.latestUID)} alt="" /> : undefined}
                </span> : undefined}
                {e.key === "notices" && store.noticeUnread > 0 ? <span className="wk-moments-sidebar-badge">{store.noticeUnread > 99 ? "99+" : store.noticeUnread}</span> : undefined}
            </li>)}
        </ul>
        <button className="wk-moments-sidebar-publish" onClick={() => store.openComposer()}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
            发动态
        </button>
    </div>
}
