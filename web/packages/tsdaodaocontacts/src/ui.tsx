import React from "react";
import classNames from "classnames";
import "./contacts.css";

// 通讯录通用组件（PitchShow 风格）：页头、列表项、入口方块、空状态、图标

const svg = (d: React.ReactNode, size = 20) => (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{d}</svg>
)

export const Icons = {
    back: svg(<path d="M15 18l-6-6 6-6" />),
    search: svg(<><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></>, 18),
    userPlus: svg(<><circle cx="10" cy="8" r="4" /><path d="M3 20a7 7 0 0 1 14 0M19 8v6M16 11h6" /></>),
    users: svg(<><circle cx="9" cy="8" r="3.5" /><path d="M2.5 19a6.5 6.5 0 0 1 13 0" /><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 13.5a6.5 6.5 0 0 1 3.5 5.5" /></>),
    ban: svg(<><circle cx="12" cy="12" r="9" /><path d="M5.6 5.6l12.8 12.8" /></>),
    qrcode: svg(<><rect x="3.5" y="3.5" width="6" height="6" rx="1" /><rect x="14.5" y="3.5" width="6" height="6" rx="1" /><rect x="3.5" y="14.5" width="6" height="6" rx="1" /><path d="M14.5 14.5h2.5v2.5M20.5 14.5v.01M14.5 20.5h.01M17.5 20.5h3v-3" /></>),
    plus: svg(<path d="M12 5v14M5 12h14" />, 16),
    check: svg(<path d="M5 12.5l4.5 4.5L19 7.5" />, 16),
    chevron: svg(<path d="M9 6l6 6-6 6" />, 16),
}

/** 左栏子页面的页头：返回 + 标题 + 右侧操作 */
export function PageHeader(props: { title: string, onBack?: () => void, action?: React.ReactNode }) {
    return <div className="ps-c-header">
        {props.onBack ? <button className="ps-c-iconbtn" aria-label="返回" onClick={props.onBack}>{Icons.back}</button> : undefined}
        <h2>{props.title}</h2>
        <div className="ps-c-header-action">{props.action}</div>
    </div>
}

/** 页头右侧的小按钮 */
export function HeaderButton(props: { children: React.ReactNode, onClick: () => void }) {
    return <button className="ps-c-headerbtn" onClick={props.onClick}>{Icons.plus}{props.children}</button>
}

/** 搜索框 */
export function SearchBox(props: { placeholder: string, value?: string, autoFocus?: boolean, onChange: (v: string) => void, onEnter?: () => void }) {
    return <label className="ps-c-search">
        {Icons.search}
        <input value={props.value} autoFocus={props.autoFocus} placeholder={props.placeholder}
            onChange={(e) => props.onChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") props.onEnter?.() }} />
    </label>
}

/** 通讯录顶部入口：紫色图标方块 + 标题 + 角标 */
export function EntryTile(props: { icon: React.ReactNode, title: string, badge?: number, onClick: () => void }) {
    return <button className="ps-c-entry" onClick={props.onClick}>
        <span className="ps-c-entry-icon">{props.icon}</span>
        <span className="ps-c-entry-title">{props.title}</span>
        {props.badge && props.badge > 0 ? <span className="ps-c-badge">{props.badge > 99 ? "99+" : props.badge}</span> : <span className="ps-c-entry-chevron">{Icons.chevron}</span>}
    </button>
}

/** 列表项：头像 + 标题/副标题 + 右侧内容 */
export function ListRow(props: {
    avatar: React.ReactNode, title: React.ReactNode, subtitle?: React.ReactNode, trailing?: React.ReactNode,
    selected?: boolean, onClick?: () => void, onContextMenu?: (e: React.MouseEvent) => void, style?: React.CSSProperties,
}) {
    return <div className={classNames("ps-c-row", props.selected && "selected", props.onClick && "clickable")} style={props.style}
        onClick={props.onClick} onContextMenu={props.onContextMenu}>
        <div className="ps-c-row-avatar">{props.avatar}</div>
        <div className="ps-c-row-main">
            <div className="ps-c-row-title">{props.title}</div>
            {props.subtitle ? <div className="ps-c-row-subtitle">{props.subtitle}</div> : undefined}
        </div>
        {props.trailing ? <div className="ps-c-row-trailing">{props.trailing}</div> : undefined}
    </div>
}

/** 空状态：漂浮的桃子 + 文案 */
export function Empty(props: { text: string, action?: React.ReactNode }) {
    return <div className="ps-c-empty">
        <img src={`${process.env.PUBLIC_URL}/logo.png`} alt="" />
        <p>{props.text}</p>
        {props.action}
    </div>
}
