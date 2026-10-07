import React, { Component, createRef } from "react";
import "./Mascot.css";

// PitchShow 桃子吉祥物（浅色背景版），造型来自 pitchshow.ai/__preview__/pitchshow-logo-v4
// 只有一个状态：呼吸、眨眼，眼睛跟随鼠标。

const INK = "#1a0810"
const BODY = "M24,14 C21.5,5.5 4,9.5 4,21.5 C4,34 12.5,45 24,45 C35.5,45.5 44,34 44,21 C44,9 26.5,5 24,14 Z"
const MAX_EYE_OFFSET = 2.6 // 眼睛最大位移（viewBox 单位）

type MascotProps = {
    size?: number
    className?: string
}

export default class Mascot extends Component<MascotProps> {
    private svgRef = createRef<SVGSVGElement>()
    private eyesRef = createRef<SVGGElement>()
    private frame = 0
    private pointer?: { x: number, y: number }

    componentDidMount() {
        window.addEventListener("pointermove", this.onPointerMove, { passive: true })
    }

    componentWillUnmount() {
        window.removeEventListener("pointermove", this.onPointerMove)
        cancelAnimationFrame(this.frame)
    }

    private onPointerMove = (e: PointerEvent) => {
        this.pointer = { x: e.clientX, y: e.clientY }
        if (!this.frame) {
            this.frame = requestAnimationFrame(this.updateEyes)
        }
    }

    private updateEyes = () => {
        this.frame = 0
        const svg = this.svgRef.current
        const eyes = this.eyesRef.current
        if (!svg || !eyes || !this.pointer) return
        const rect = svg.getBoundingClientRect()
        const dx = this.pointer.x - (rect.left + rect.width / 2)
        const dy = this.pointer.y - (rect.top + rect.height * 0.56)
        const dist = Math.hypot(dx, dy) || 1
        // 距离越近位移越小，避免鼠标在脸上时眼睛"斗鸡"
        const strength = Math.min(1, dist / (rect.width * 1.5))
        const ox = (dx / dist) * MAX_EYE_OFFSET * strength
        const oy = (dy / dist) * MAX_EYE_OFFSET * strength * 0.8
        eyes.style.transform = `translate(${ox.toFixed(2)}px, ${oy.toFixed(2)}px)`
    }

    render() {
        const { size = 96, className } = this.props
        return <div className={`wk-mascot ${className ?? ""}`} style={{ width: size, height: size }}>
            <svg ref={this.svgRef} viewBox="0 0 48 48" width={size} height={size} fill="none" aria-hidden="true">
                <defs>
                    <radialGradient id="wk-mascot-body" cx="40%" cy="28%" r="64%">
                        <stop offset="0%" stopColor="#FFCDB0" />
                        <stop offset="55%" stopColor="#FFAB91" />
                        <stop offset="100%" stopColor="#FF8B70" />
                    </radialGradient>
                </defs>
                <g className="wk-mascot-body">
                    <path d={BODY} fill="url(#wk-mascot-body)" stroke="rgba(0,0,0,0.07)" strokeWidth="1.2" />
                    <ellipse className="wk-mascot-leaf" cx="27.5" cy="9.5" rx="4.8" ry="7.2" fill="#4CAF50" transform="rotate(20 27.5 9.5)" />
                    <path d="M24,14 C24.5,11.5 26,10 27.5,8.5" stroke="#3a7020" strokeWidth="1.3" fill="none" strokeLinecap="round" />
                    <ellipse cx="10" cy="33.5" rx="5.5" ry="3.2" fill="rgba(255,120,90,0.22)" />
                    <ellipse cx="38" cy="33.5" rx="5.5" ry="3.2" fill="rgba(255,120,90,0.22)" />
                    <g ref={this.eyesRef} className="wk-mascot-eyes">
                        <g className="wk-mascot-blink"><circle cx="16" cy="27" r="2.2" fill={INK} /></g>
                        <g className="wk-mascot-blink"><circle cx="32" cy="27" r="2.2" fill={INK} /></g>
                    </g>
                </g>
            </svg>
            <div className="wk-mascot-shadow" />
        </div>
    }
}
