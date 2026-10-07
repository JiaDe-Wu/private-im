import React, { Component } from "react";
import Mascot from "./Mascot";
import "./ChatShowcase.css";

// 登录页左侧的演示对话：逐条出现（对方消息先显示"正在输入"），播完后停在最终画面。

type ShowcaseMessage = {
    from: "me" | "them"
    kind: "text" | "slide" | "sticker"
    text?: string
    time: string
}

const SCRIPT: ShowcaseMessage[] = [
    { from: "them", kind: "text", text: "今晚的路演准备好了吗？🎤", time: "20:31" },
    { from: "me", kind: "text", text: "刚做完，发你看看", time: "20:32" },
    { from: "me", kind: "slide", time: "20:32" },
    { from: "them", kind: "text", text: "太酷了！这动画怎么做的 😍", time: "20:33" },
    { from: "me", kind: "text", text: "用 Private IM 发你的，只有我们俩能看到 🔒", time: "20:33" },
    { from: "them", kind: "sticker", time: "20:34" },
]

const TYPING_MS = 1100 // 对方"正在输入"时长
const GAP_MS = 900 // 消息间隔

type ShowcaseState = {
    shown: number
    typing: boolean
}

export default class ChatShowcase extends Component<{}, ShowcaseState> {
    state: ShowcaseState = { shown: 0, typing: false }
    private timer = 0

    componentDidMount() {
        this.schedule(600)
    }

    componentWillUnmount() {
        window.clearTimeout(this.timer)
    }

    private schedule(ms: number) {
        window.clearTimeout(this.timer)
        this.timer = window.setTimeout(this.step, ms)
    }

    private step = () => {
        const { shown, typing } = this.state
        if (shown >= SCRIPT.length) {
            return
        }
        const next = SCRIPT[shown]
        if (next.from === "them" && !typing) {
            this.setState({ typing: true })
            this.schedule(TYPING_MS)
            return
        }
        this.setState({ shown: shown + 1, typing: false })
        this.schedule(GAP_MS)
    }

    private renderContent(m: ShowcaseMessage) {
        switch (m.kind) {
            case "slide":
                return <div className="wk-showcase-slide">
                    <div className="wk-showcase-slide-canvas">
                        <span className="wk-showcase-slide-title" />
                        <span className="wk-showcase-slide-line" />
                        <span className="wk-showcase-slide-line short" />
                        <div className="wk-showcase-slide-bars">
                            <i style={{ height: "38%" }} /><i style={{ height: "62%" }} /><i style={{ height: "48%" }} /><i style={{ height: "86%" }} />
                        </div>
                    </div>
                    <div className="wk-showcase-slide-meta">产品方案.pdf · 12 页</div>
                </div>
            case "sticker":
                return <Mascot size={64} />
            default:
                return m.text
        }
    }

    render() {
        const { shown, typing } = this.state
        return <div className="wk-showcase" aria-hidden="true">
            <div className="wk-showcase-header">
                <div className="wk-showcase-avatar">L</div>
                <div>
                    <div className="wk-showcase-name">Lena</div>
                    <div className={`wk-showcase-status ${typing ? "typing" : ""}`}>{typing ? "正在输入…" : "在线"}</div>
                </div>
            </div>
            <div className="wk-showcase-body">
                {SCRIPT.slice(0, shown).map((m, i) => (
                    <div key={i} className={`wk-showcase-row ${m.from} ${m.kind}`}>
                        <div className={`wk-showcase-bubble ${m.kind}`}>
                            {this.renderContent(m)}
                            {m.kind !== "sticker" ? <span className="wk-showcase-time">{m.time}{m.from === "me" ? " ✓✓" : ""}</span> : undefined}
                        </div>
                    </div>
                ))}
                {typing ? <div className="wk-showcase-row them">
                    <div className="wk-showcase-bubble typing"><i /><i /><i /></div>
                </div> : undefined}
            </div>
        </div>
    }
}
