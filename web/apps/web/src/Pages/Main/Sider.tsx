import React, { useEffect, useReducer, useRef } from "react";
import classNames from "classnames";
import { Modal, Progress, Toast } from "@douyinfe/semi-ui";
import { MeInfo, Menus, ThemeMode, WKApp } from "@tsdaodao/base";
import MainVM, { VersionInfo } from "./vm";
import "./Sider.css";

const icon = (d: React.ReactNode) => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{d}</svg>
)
const ICONS = {
    settings: icon(<><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></>),
    moon: icon(<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />),
    bell: icon(<><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></>),
    refresh: icon(<><path d="M20 11a8 8 0 1 0-2.3 5.7" /><path d="M20 4v7h-7" /></>),
    logout: icon(<><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5M21 12H9" /></>),
}

function Switch(props: { on: boolean }) {
    return <span className={classNames("ps-sider-switch", props.on && "on")} aria-hidden="true"><i /></span>
}

/** 设置菜单：浅色卡片，点击外部或 Esc 关闭 */
function SettingsMenu(props: { vm: MainVM, onClose: () => void }) {
    const { vm, onClose } = props
    const ref = useRef<HTMLDivElement>(null)
    const [, refresh] = useReducer((n: number) => n + 1, 0)

    useEffect(() => {
        const onDown = (e: MouseEvent) => {
            const target = e.target as HTMLElement
            if (ref.current && !ref.current.contains(target) && !target.closest(".ps-sider-settings-btn")) onClose()
        }
        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
        document.addEventListener("mousedown", onDown)
        document.addEventListener("keydown", onKey)
        return () => {
            document.removeEventListener("mousedown", onDown)
            document.removeEventListener("keydown", onKey)
        }
    }, [onClose])

    const dark = WKApp.config.themeMode === ThemeMode.dark
    const notifyOn = !WKApp.shared.notificationIsClose

    const checkUpdate = () => {
        onClose()
        if ((window as any).__POWERED_ELECTRON__) {
            (window as any).ipc.send("check-update")
        } else if (vm.hasNewVersion) {
            vm.showNewVersion = true
        } else {
            Toast.success("已经是最新版本")
        }
    }

    return <div className="ps-sider-menu" ref={ref} role="menu">
        <div className="ps-sider-menu-user">
            <img src={WKApp.shared.avatarUser(WKApp.loginInfo.uid || "")} alt="" />
            <div>
                <b>{WKApp.loginInfo.name}</b>
                <small>{WKApp.config.appName} 号 {WKApp.loginInfo.shortNo}</small>
            </div>
        </div>
        <button role="menuitemcheckbox" aria-checked={dark} onClick={() => {
            WKApp.config.themeMode = dark ? ThemeMode.light : ThemeMode.dark
            refresh()
        }}>{ICONS.moon}<span>深色模式</span><Switch on={dark} /></button>
        <button role="menuitemcheckbox" aria-checked={notifyOn} onClick={() => {
            WKApp.shared.notificationIsClose = notifyOn
            refresh()
        }}>{ICONS.bell}<span>桌面通知</span><Switch on={notifyOn} /></button>
        <button role="menuitem" onClick={checkUpdate}>
            {ICONS.refresh}<span>检查更新</span>
            <em>v{WKApp.config.appVersion}{vm.hasNewVersion ? <i className="ps-sider-dot" /> : undefined}</em>
        </button>
        <div className="ps-sider-menu-sep" />
        <button role="menuitem" className="danger" onClick={() => {
            onClose()
            Modal.confirm({ title: "退出登录？", okText: "退出", okButtonProps: { type: "danger" }, onOk: () => WKApp.shared.logout() })
        }}>{ICONS.logout}<span>退出登录</span></button>
    </div>
}

function VersionNotes(props: { info: VersionInfo, children?: React.ReactNode }) {
    return <div className="ps-version">
        <div className="ps-version-tags">
            <span>当前 v{WKApp.config.appVersion}</span><span className="arrow">→</span><span className="new">新版本 v{props.info.appVersion}</span>
        </div>
        {props.info.updateDesc ? <pre>{props.info.updateDesc}</pre> : undefined}
        {props.children}
    </div>
}

/** 左侧导航栏 */
export function Sider(props: { vm: MainVM }) {
    const { vm } = props
    const [, refresh] = useReducer((n: number) => n + 1, 0)
    useEffect(() => {
        WKApp.menus.setRefresh = refresh
        return () => { WKApp.menus.setRefresh = undefined }
    }, [])

    const openMe = () => {
        WKApp.apiClient.get(`/users/${WKApp.loginInfo.uid}`).then((data) => {
            const info = WKApp.loginInfo
            info.shortNo = data.short_no
            info.name = data.name
            info.sex = data.sex
            info.save()
            vm.showMeInfo = true
        }).catch(() => { vm.showMeInfo = true })
    }

    const selectMenu = (menus: Menus) => {
        const prev = vm.currentMenus
        // 带 onPress 的菜单（如朋友圈）会整块替换右侧内容；切到别的菜单时还原为空状态，避免残留
        if (prev && prev.id !== menus.id && prev.onPress) {
            WKApp.routeRight.replaceToRoot(<ChatEmpty />)
        }
        vm.currentMenus = menus
        if (menus.onPress) {
            menus.onPress()
        } else {
            WKApp.routeLeft.popToRoot()
        }
    }

    return <div className="ps-sider">
        <button className="ps-sider-avatar" title="我的资料" onClick={openMe}>
            <img src={WKApp.shared.avatarUser(WKApp.loginInfo.uid || "")} alt="" />
        </button>
        <nav className="ps-sider-menus">
            {vm.menusList.map((menus: Menus) => {
                const active = menus.id === vm.currentMenus?.id
                return <button key={menus.id} className={classNames("ps-sider-item", active && "active")} onClick={() => selectMenu(menus)}
                    aria-label={menus.title} aria-current={active ? "page" : undefined}>
                    {active ? menus.selectedIcon : menus.icon}
                    {menus.badge && menus.badge > 0 ? <span className="ps-sider-badge">{menus.badge > 99 ? "99+" : menus.badge}</span> : undefined}
                    <span className="ps-sider-tip">{menus.title}</span>
                </button>
            })}
        </nav>
        <button className={classNames("ps-sider-item ps-sider-settings-btn", vm.settingSelected && "active")} aria-label="设置"
            onClick={() => { vm.settingSelected = !vm.settingSelected }}>
            {ICONS.settings}
            {vm.hasNewVersion ? <i className="ps-sider-dot corner" /> : undefined}
            <span className="ps-sider-tip">设置</span>
        </button>
        {vm.settingSelected ? <SettingsMenu vm={vm} onClose={() => { vm.settingSelected = false }} /> : undefined}

        {/* 网页版：提示刷新获取新版本 */}
        <Modal title="发现新版本" visible={vm.showNewVersion} footer={null} className="ps-modal" onCancel={() => { vm.showNewVersion = false }}>
            {vm.lastVersionInfo ? <VersionNotes info={vm.lastVersionInfo}>
                <p className="ps-version-howto">刷新页面即可更新：Windows 按 <kbd>Ctrl</kbd> + <kbd>F5</kbd>，Mac 按 <kbd>⌘</kbd> + <kbd>Shift</kbd> + <kbd>R</kbd>。仍是旧版本时请清除浏览器缓存后再刷新。</p>
            </VersionNotes> : undefined}
        </Modal>

        {/* 桌面版：下载并安装更新 */}
        <Modal title="检查更新" visible={vm.showAppVersion} centered closeOnEsc={false} maskClosable={false} className="ps-modal"
            onCancel={() => { vm.showAppVersion = false; vm.notifyListener() }}
            footer={vm.showAppUpdateOperation ? <div className="ps-modal-actions">
                <button className="ps-btn" onClick={() => { vm.showAppVersion = false; vm.notifyListener() }}>稍后</button>
                <button className="ps-btn primary" onClick={() => vm.installUpdate()}>立即更新</button>
            </div> : null}>
            {vm.lastVersionInfo ? <VersionNotes info={vm.lastVersionInfo}>
                {vm.showAppUpdate ? <Progress percent={vm.appUpdateProgress} showInfo aria-label="下载进度" stroke="#7c3aed" style={{ height: 8 }} /> : undefined}
            </VersionNotes> : undefined}
        </Modal>

        <Modal width={400} className="wk-main-sider-modal wk-main-sider-meinfo" footer={null} closeIcon={<div />}
            visible={vm.showMeInfo} mask={false} onCancel={() => { vm.showMeInfo = false }}>
            <MeInfo onClose={() => { vm.showMeInfo = false }} />
        </Modal>
    </div>
}

/** 右侧未选择会话时的空状态：桃子 + 漂浮的聊天气泡 */
export function ChatEmpty() {
    return <div className="ps-chat-empty">
        <div className="ps-chat-empty-art" aria-hidden="true">
            <span className="bubble left"><i /><i /><i /></span>
            <span className="bubble right">Hi 👋</span>
            <img src={`${process.env.PUBLIC_URL}/logo.png`} alt="" />
        </div>
        <h3>选择一个会话，开始聊天</h3>
        <p>按 <kbd>Enter</kbd> 发送，<kbd>Ctrl</kbd> + <kbd>Enter</kbd> 换行</p>
    </div>
}
