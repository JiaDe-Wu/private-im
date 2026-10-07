import React, { Component, createRef } from "react";
import { Spin, Toast } from '@douyinfe/semi-ui';
import './login.css'
import QRCode from 'qrcode.react';
import { WKApp, Provider } from "@tsdaodao/base"
import { AuthView, LoginStatus, LoginVM, ZONES } from "./login_vm";
import classNames from "classnames";
import Mascot from "./components/Mascot";
import ChatShowcase from "./components/ChatShowcase";

const HEADLINE = ["你的对话，", "只属于"]
const HEADLINE_ACCENT = "你。"
const CONFETTI_COUNT = 18

// 逐字入场的标题
function StaggerText(props: { text: string, start: number }) {
    return <span>
        {Array.from(props.text).map((ch, i) => (
            <span key={i} className="wk-login-char" style={{ "--i": props.start + i } as React.CSSProperties}>{ch === " " ? " " : ch}</span>
        ))}
    </span>
}

const Icon = {
    phone: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="2.5" width="12" height="19" rx="3" /><path d="M10.5 18h3" /></svg>,
    lock: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="4.5" y="10.5" width="15" height="10.5" rx="2.5" /><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" /></svg>,
    shield: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3 4.5 6v5.5c0 4.6 3.2 8.2 7.5 9.5 4.3-1.3 7.5-4.9 7.5-9.5V6z" /><path d="m9 12 2 2 4-4" /></svg>,
    user: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>,
    eye: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg>,
    eyeOff: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3l18 18" /><path d="M10.6 5.1A10.8 10.8 0 0 1 12 5c6.4 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4.2M6.6 6.6C3.8 8.4 2 12 2 12s3.6 7 10 7a9.7 9.7 0 0 0 5.4-1.6" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></svg>,
    qrcode: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3.5" y="3.5" width="6" height="6" rx="1" /><rect x="14.5" y="3.5" width="6" height="6" rx="1" /><rect x="3.5" y="14.5" width="6" height="6" rx="1" /><path d="M14.5 14.5h2.5v2.5M20.5 14.5v.01M14.5 20.5h.01M17.5 20.5h3v-3" /></svg>,
    back: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>,
    refresh: <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 11a8 8 0 1 0-2.3 5.7" /><path d="M20 4v7h-7" /></svg>,
    message: <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.9A8 8 0 1 1 21 12z" /></svg>,
    image: <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="3" /><circle cx="9" cy="10" r="2" /><path d="m21 16-5-5-8 9" /></svg>,
    mic: <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>,
}

class Login extends Component {
    private rootRef = createRef<HTMLDivElement>()
    private frame = 0
    private pointer = { x: 0.5, y: 0.5 }

    componentWillUnmount() {
        cancelAnimationFrame(this.frame)
    }

    // 鼠标位置写入 CSS 变量，驱动背景聚光、视差与卡片倾斜（不触发 React 重渲染）
    private onPointerMove = (e: React.PointerEvent) => {
        if (e.pointerType !== "mouse") return
        const root = this.rootRef.current
        if (!root) return
        const rect = root.getBoundingClientRect()
        this.pointer = { x: (e.clientX - rect.left) / rect.width, y: (e.clientY - rect.top) / rect.height }
        if (!this.frame) {
            this.frame = requestAnimationFrame(() => {
                this.frame = 0
                root.style.setProperty("--mx", this.pointer.x.toFixed(4))
                root.style.setProperty("--my", this.pointer.y.toFixed(4))
            })
        }
    }

    private async run(task: () => Promise<void>) {
        try {
            await task()
        } catch (msg: any) {
            Toast.error(typeof msg === "string" ? msg : msg?.msg || "操作失败")
        }
    }

    private renderPhoneField(vm: LoginVM) {
        return <div className="wk-login-field">
            <span className="wk-login-field-icon">{Icon.phone}</span>
            <select className="wk-login-zone" value={vm.zone} aria-label="国家或地区" onChange={(e) => vm.setField("zone", e.target.value)}>
                {ZONES.map((z) => <option key={z.code} value={z.code}>{z.label} {z.name}</option>)}
            </select>
            <span className="wk-login-zone-label">{ZONES.find((z) => z.code === vm.zone)?.label}</span>
            <input type="tel" inputMode="numeric" autoComplete="tel-national" placeholder=" " value={vm.phone} maxLength={15}
                onChange={(e) => vm.setField("phone", e.target.value.replace(/\D/g, ""))} />
            <label>手机号</label>
        </div>
    }

    private renderPasswordField(vm: LoginVM, label: string, autoComplete: string) {
        return <div className="wk-login-field">
            <span className="wk-login-field-icon">{Icon.lock}</span>
            <input type={vm.passwordVisible ? "text" : "password"} autoComplete={autoComplete} placeholder=" " value={vm.password}
                onChange={(e) => vm.setField("password", e.target.value)} />
            <label>{label}</label>
            <button type="button" className="wk-login-field-action" aria-label={vm.passwordVisible ? "隐藏密码" : "显示密码"}
                onMouseDown={(e) => e.preventDefault()} onClick={() => vm.togglePasswordVisible()}>
                {vm.passwordVisible ? Icon.eye : Icon.eyeOff}
            </button>
        </div>
    }

    private renderCodeField(vm: LoginVM, kind: "register" | "forget") {
        return <div className="wk-login-field">
            <span className="wk-login-field-icon">{Icon.shield}</span>
            <input type="text" inputMode="numeric" autoComplete="one-time-code" placeholder=" " value={vm.code} maxLength={6}
                onChange={(e) => vm.setField("code", e.target.value.replace(/\D/g, ""))} />
            <label>验证码</label>
            <button type="button" className="wk-login-code-btn" disabled={vm.codeSending || vm.codeCountdown > 0}
                onClick={() => this.run(() => vm.sendCode(kind).then(() => { Toast.success("验证码已发送") }))}>
                {vm.codeSending ? "发送中…" : vm.codeCountdown > 0 ? `${vm.codeCountdown}s 后重发` : "获取验证码"}
            </button>
        </div>
    }

    private renderSubmit(vm: LoginVM, text: string) {
        return <button type="submit" className={classNames("wk-login-submit", vm.loginLoading && "loading")} disabled={vm.loginLoading || vm.success}>
            <span className="wk-login-submit-text">{text}</span>
            <span className="wk-login-submit-dots"><i /><i /><i /></span>
        </button>
    }

    private renderLogin(vm: LoginVM) {
        return <form className="wk-login-form" noValidate onSubmit={(e) => { e.preventDefault(); this.run(() => vm.submitLogin()) }}>
            {this.renderPhoneField(vm)}
            {this.renderPasswordField(vm, "密码", "current-password")}
            <div className="wk-login-row">
                <button type="button" className="wk-login-link" onClick={() => { vm.view = AuthView.forget }}>忘记密码？</button>
            </div>
            {this.renderSubmit(vm, "登录")}
            <div className="wk-login-divider"><span>或</span></div>
            <button type="button" className="wk-login-secondary" onClick={() => { vm.view = AuthView.qrcode }}>
                {Icon.qrcode}<span>扫码登录</span>
            </button>
        </form>
    }

    private renderRegister(vm: LoginVM) {
        return <form className="wk-login-form" noValidate onSubmit={(e) => { e.preventDefault(); this.run(() => vm.submitRegister()) }}>
            {this.renderPhoneField(vm)}
            {this.renderCodeField(vm, "register")}
            {this.renderPasswordField(vm, "设置密码（至少 6 位）", "new-password")}
            <div className="wk-login-field">
                <span className="wk-login-field-icon">{Icon.user}</span>
                <input type="text" autoComplete="nickname" placeholder=" " value={vm.name} maxLength={20}
                    onChange={(e) => vm.setField("name", e.target.value)} />
                <label>昵称（选填）</label>
            </div>
            {this.renderSubmit(vm, "创建账号")}
        </form>
    }

    private renderForget(vm: LoginVM) {
        return <form className="wk-login-form" noValidate onSubmit={(e) => {
            e.preventDefault()
            this.run(() => vm.submitResetPassword().then(() => { Toast.success("密码已重置，请使用新密码登录") }))
        }}>
            <p className="wk-login-hint">输入注册手机号，验证后设置新密码</p>
            {this.renderPhoneField(vm)}
            {this.renderCodeField(vm, "forget")}
            {this.renderPasswordField(vm, "新密码（至少 6 位）", "new-password")}
            {this.renderSubmit(vm, "重置密码")}
        </form>
    }

    private renderQRCode(vm: LoginVM) {
        const appName = WKApp.config.appName
        return <div className="wk-login-qrcode">
            <Spin size="large" spinning={vm.qrcodeLoading}>
                <div className={classNames("wk-login-qrcode-box", vm.showAvatar() && "scanned")}>
                    {vm.qrcodeLoading || !vm.qrcode ? <div className="wk-login-qrcode-placeholder" /> : <QRCode value={vm.qrcode} size={196} fgColor="#2e1065" bgColor="transparent" />}
                    <span className="wk-login-qrcode-scanline" />
                    {vm.showAvatar() ? <div className="wk-login-qrcode-avatar"><img src={WKApp.shared.avatarUser(vm.uid!)} alt="" /></div> : undefined}
                    {!vm.autoRefresh ? <button type="button" className="wk-login-qrcode-expire" onClick={() => vm.reStartAdvance()}>
                        {Icon.refresh}<span>二维码已失效，点击刷新</span>
                    </button> : undefined}
                </div>
            </Spin>
            <div className="wk-login-qrcode-status">
                {vm.loginStatus === LoginStatus.scanned ? "已扫码，请在手机上确认登录" : `使用手机 ${appName} 扫码登录`}
            </div>
            <ol className="wk-login-qrcode-steps">
                <li>打开手机 {appName}</li>
                <li>进入 <b>消息</b> › <b>+</b> › <b>扫一扫</b></li>
                <li>扫描上方二维码并确认</li>
            </ol>
        </div>
    }

    private renderCard(vm: LoginVM) {
        const isTabView = vm.view === AuthView.login || vm.view === AuthView.register
        const subTitle = vm.view === AuthView.forget ? "找回密码" : "扫码登录"
        // 抖动动画在 shake-0 / shake-1 两个同款 keyframes 间交替，每次出错都能重新触发且不重建 DOM
        return <section className={classNames("wk-login-card", vm.errorTick > 0 && `shake-${vm.errorTick % 2}`, vm.success && "success")}>
            <Mascot size={84} className="wk-login-card-mascot" />
            <div className="wk-login-card-inner">
                {isTabView ? <div className={classNames("wk-login-tabs", vm.view === AuthView.register && "right")} role="tablist">
                    <span className="wk-login-tabs-indicator" />
                    <button type="button" role="tab" aria-selected={vm.view === AuthView.login} onClick={() => { vm.view = AuthView.login }}>登录</button>
                    <button type="button" role="tab" aria-selected={vm.view === AuthView.register} onClick={() => { vm.view = AuthView.register }}>注册</button>
                </div> : <div className="wk-login-subheader">
                    <button type="button" className="wk-login-back" aria-label="返回登录" onClick={() => { vm.view = AuthView.login }}>{Icon.back}</button>
                    <span>{subTitle}</span>
                </div>}
                <div className="wk-login-panel" key={vm.view}>
                    {vm.view === AuthView.login ? this.renderLogin(vm) : undefined}
                    {vm.view === AuthView.register ? this.renderRegister(vm) : undefined}
                    {vm.view === AuthView.forget ? this.renderForget(vm) : undefined}
                    {vm.view === AuthView.qrcode ? this.renderQRCode(vm) : undefined}
                </div>
            </div>
            {vm.success ? <div className="wk-login-confetti" aria-hidden="true">
                {Array.from({ length: CONFETTI_COUNT }).map((_, i) => (
                    <i key={i} style={{ "--a": `${(360 / CONFETTI_COUNT) * i}deg`, "--d": `${110 + (i % 4) * 28}px`, "--c": i % 3 === 0 ? "#FF9A80" : i % 3 === 1 ? "#7c3aed" : "#a78bfa" } as React.CSSProperties} />
                ))}
            </div> : undefined}
        </section>
    }

    render() {
        return <Provider create={() => {
            return new LoginVM()
        }} render={(vm: LoginVM) => {
            return <div className={classNames("wk-login", vm.success && "wk-login-success")} ref={this.rootRef} onPointerMove={this.onPointerMove}>
                <div className="wk-login-bg" aria-hidden="true">
                    <span className="wk-login-blob a" /><span className="wk-login-blob b" /><span className="wk-login-blob c" />
                    <span className="wk-login-grid" />
                    <span className="wk-login-spotlight" />
                </div>

                <header className="wk-login-brand">
                    <img src={`${process.env.PUBLIC_URL}/logo.png`} alt="" />
                    <span>{WKApp.config.appName}</span>
                </header>

                <main className="wk-login-main">
                    <section className="wk-login-hero">
                        <h1 className="wk-login-headline">
                            <StaggerText text={HEADLINE[0]} start={0} />
                            <br />
                            <StaggerText text={HEADLINE[1]} start={HEADLINE[0].length} />
                            <span className="wk-login-headline-accent" style={{ "--i": HEADLINE[0].length + HEADLINE[1].length } as React.CSSProperties}>{HEADLINE_ACCENT}</span>
                        </h1>
                        <p className="wk-login-tagline">私密、轻快、即时。只和重要的人说话。</p>
                        <div className="wk-login-stage">
                            <div className="wk-login-chip a">{Icon.message}<span>实时消息</span></div>
                            <div className="wk-login-chip b">{Icon.image}<span>图片 · 文件</span></div>
                            <div className="wk-login-chip c">{Icon.mic}<span>语音</span></div>
                            <div className="wk-login-stage-parallax"><ChatShowcase /></div>
                        </div>
                    </section>

                    {this.renderCard(vm)}
                </main>

                <footer className="wk-login-footer">© {new Date().getFullYear()} {WKApp.config.appName}</footer>
            </div>
        }}>
        </Provider>
    }
}

export default Login
