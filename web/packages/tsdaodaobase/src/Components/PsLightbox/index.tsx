import React from "react"
import ReactDOM from "react-dom"
import "./index.css"

/**
 * 图片查看器：从缩略图原位展开（FLIP + clip-path 裁切过渡）、毛玻璃背景、滚轮缩放、拖动、左右切换。
 * 用法：PsLightbox.open({ images: [{ src, width, height }], index, getSource: (i) => 缩略图元素 })
 */

export interface LightboxImage {
    src: string
    width?: number
    height?: number
}

export interface LightboxOptions {
    images: LightboxImage[]
    index?: number
    /** 第 i 张图在页面上的缩略图元素，用于展开 / 收回动画；找不到时用淡入淡出 */
    getSource?: (i: number) => HTMLElement | null | undefined
}

const PAD_X = 72
const PAD_Y = 64
const OPEN_MS = 380
const MAX_ZOOM = 4

interface Rect { x: number, y: number, w: number, h: number }

interface State {
    index: number
    phase: "enter" | "open" | "leave"
    zoom: number
    panX: number
    panY: number
    dragging: boolean
    loaded: boolean
}

class Lightbox extends React.Component<LightboxOptions & { onClosed: () => void }, State> {
    private frameRef = React.createRef<HTMLDivElement>()
    private drag?: { x: number, y: number, panX: number, panY: number, moved: boolean }

    state: State = { index: this.props.index || 0, phase: "enter", zoom: 1, panX: 0, panY: 0, dragging: false, loaded: false }

    componentDidMount() {
        document.addEventListener("keydown", this.onKey)
        document.body.classList.add("ps-lightbox-lock")
        this.applyFlip(true)
        // 强制浏览器先算一次「收起」样式，否则刚插入的元素会直接跳到展开后的终点、没有过渡
        void this.frameRef.current?.getBoundingClientRect()
        requestAnimationFrame(() => {
            this.setState({ phase: "open" })
            this.applyFlip(false)
        })
    }

    componentWillUnmount() {
        document.removeEventListener("keydown", this.onKey)
        document.body.classList.remove("ps-lightbox-lock")
    }

    private current(): LightboxImage {
        return this.props.images[this.state.index]
    }

    /** 图片在屏幕中央的目标位置（按原图比例适配视口） */
    private targetRect(): Rect {
        const img = this.current()
        const src = this.sourceEl()
        const iw = img.width || (src instanceof HTMLImageElement ? src.naturalWidth : 0) || 1200
        const ih = img.height || (src instanceof HTMLImageElement ? src.naturalHeight : 0) || 800
        const vw = window.innerWidth - PAD_X * 2, vh = window.innerHeight - PAD_Y * 2
        const k = Math.min(vw / iw, vh / ih, 1.6) // 小图最多放大到 1.6 倍，避免糊
        const w = iw * k, h = ih * k
        return { x: (window.innerWidth - w) / 2, y: (window.innerHeight - h) / 2, w, h }
    }

    private sourceEl(): HTMLElement | null {
        const el = this.props.getSource?.(this.state.index)
        if (!el) return null
        return (el.querySelector("img") as HTMLElement) || el
    }

    /** collapsed=true：把居中的大图变换到缩略图的位置和裁切；false：恢复居中完整显示 */
    private applyFlip(collapsed: boolean) {
        const frame = this.frameRef.current
        if (!frame) return
        const t = this.targetRect()
        frame.style.left = `${t.x}px`
        frame.style.top = `${t.y}px`
        frame.style.width = `${t.w}px`
        frame.style.height = `${t.h}px`
        const src = this.sourceEl()
        const r = src?.getBoundingClientRect()
        if (!collapsed || !r || r.width === 0) {
            frame.style.transform = "none"
            frame.style.clipPath = "inset(0 round 4px)"
            frame.style.opacity = collapsed ? "0" : "1"
            return
        }
        // 统一缩放到能盖住缩略图的大小，再用 clip-path 裁成缩略图的形状（九宫格是正方形裁切）
        const k = Math.max(r.width / t.w, r.height / t.h)
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2
        const dx = cx - (t.w * k) / 2 - t.x, dy = cy - (t.h * k) / 2 - t.y
        const ix = (t.w - r.width / k) / 2, iy = (t.h - r.height / k) / 2
        const radius = parseFloat(getComputedStyle(src!).borderRadius) || 10
        frame.style.transform = `translate(${dx}px, ${dy}px) scale(${k})`
        frame.style.clipPath = `inset(${iy}px ${ix}px round ${radius / k}px)`
        frame.style.opacity = "1"
    }

    close = () => {
        if (this.state.phase === "leave") return
        this.setState({ phase: "leave", zoom: 1, panX: 0, panY: 0 }, () => {
            void this.frameRef.current?.getBoundingClientRect()
            this.applyFlip(true)
            window.setTimeout(this.props.onClosed, OPEN_MS)
        })
    }

    go = (delta: number) => {
        const n = this.props.images.length
        const index = (this.state.index + delta + n) % n
        if (index === this.state.index) return
        this.setState({ index, zoom: 1, panX: 0, panY: 0, loaded: false }, () => this.applyFlip(false))
    }

    onKey = (e: KeyboardEvent) => {
        if (e.key === "Escape") this.close()
        else if (e.key === "ArrowLeft") this.go(-1)
        else if (e.key === "ArrowRight") this.go(1)
    }

    onWheel = (e: React.WheelEvent) => {
        const frame = this.frameRef.current
        if (!frame) return
        const zoom = Math.min(MAX_ZOOM, Math.max(1, this.state.zoom * (e.deltaY < 0 ? 1.15 : 1 / 1.15)))
        if (zoom === this.state.zoom) return
        // 以鼠标位置为中心缩放
        const rect = frame.getBoundingClientRect()
        const ox = e.clientX - rect.left - rect.width / 2, oy = e.clientY - rect.top - rect.height / 2
        const f = zoom / this.state.zoom
        const panX = zoom === 1 ? 0 : (this.state.panX - ox) * f + ox
        const panY = zoom === 1 ? 0 : (this.state.panY - oy) * f + oy
        this.setState({ zoom, panX, panY })
    }

    onDoubleClick = (e: React.MouseEvent) => {
        e.stopPropagation()
        if (this.state.zoom > 1) this.setState({ zoom: 1, panX: 0, panY: 0 })
        else this.setState({ zoom: 2 })
    }

    onPointerDown = (e: React.PointerEvent) => {
        if (this.state.zoom <= 1) return
        e.preventDefault()
        ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
        this.drag = { x: e.clientX, y: e.clientY, panX: this.state.panX, panY: this.state.panY, moved: false }
        this.setState({ dragging: true })
    }

    onPointerMove = (e: React.PointerEvent) => {
        if (!this.drag) return
        const dx = e.clientX - this.drag.x, dy = e.clientY - this.drag.y
        if (Math.abs(dx) + Math.abs(dy) > 3) this.drag.moved = true
        this.setState({ panX: this.drag.panX + dx, panY: this.drag.panY + dy })
    }

    onPointerUp = () => {
        this.drag = undefined
        this.setState({ dragging: false })
    }

    download = (e: React.MouseEvent) => {
        e.stopPropagation()
        window.open(this.current().src, "_blank", "noopener")
    }

    render() {
        const { images } = this.props
        const { index, phase, zoom, panX, panY, dragging, loaded } = this.state
        const many = images.length > 1
        return <div className={`ps-lightbox ps-lightbox-${phase}${zoom > 1 ? " zoomed" : ""}`} onClick={this.close} onWheel={this.onWheel}>
            <div className="ps-lightbox-backdrop" />
            <div className="ps-lightbox-frame" ref={this.frameRef} onClick={(e) => e.stopPropagation()} onDoubleClick={this.onDoubleClick}>
                <img key={index} className={`ps-lightbox-img${loaded ? " loaded" : ""}${dragging ? " dragging" : ""}`} src={images[index].src} alt="" draggable={false}
                    style={{ transform: `translate(${panX}px, ${panY}px) scale(${zoom})` }}
                    onLoad={() => this.setState({ loaded: true })}
                    onPointerDown={this.onPointerDown} onPointerMove={this.onPointerMove} onPointerUp={this.onPointerUp} onPointerCancel={this.onPointerUp} />
            </div>
            <div className="ps-lightbox-bar" onClick={(e) => e.stopPropagation()}>
                {many ? <span className="ps-lightbox-count">{index + 1} / {images.length}</span> : null}
                {zoom > 1 ? <button className="ps-lightbox-btn" title="还原" onClick={() => this.setState({ zoom: 1, panX: 0, panY: 0 })}>{Icons.fit}</button> : null}
                <button className="ps-lightbox-btn" title="查看原图" onClick={this.download}>{Icons.download}</button>
                <button className="ps-lightbox-btn" title="关闭（Esc）" onClick={this.close}>{Icons.close}</button>
            </div>
            {many ? <>
                <button className="ps-lightbox-nav prev" title="上一张（←）" onClick={(e) => { e.stopPropagation(); this.go(-1) }}>{Icons.prev}</button>
                <button className="ps-lightbox-nav next" title="下一张（→）" onClick={(e) => { e.stopPropagation(); this.go(1) }}>{Icons.next}</button>
                <div className="ps-lightbox-dots" onClick={(e) => e.stopPropagation()}>
                    {images.map((_, i) => <i key={i} className={i === index ? "on" : ""} onClick={() => this.go(i - index)} />)}
                </div>
            </> : null}
            <div className="ps-lightbox-hint">滚轮缩放 · 双击放大{many ? " · ← → 切换" : ""} · Esc 关闭</div>
        </div>
    }
}

const svg = (d: string) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
const Icons = {
    close: svg("M6 6l12 12M18 6L6 18"),
    download: svg("M12 4v11m0 0l-4-4m4 4l4-4M5 20h14"),
    fit: svg("M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"),
    prev: svg("M15 5l-7 7 7 7"),
    next: svg("M9 5l7 7-7 7"),
}

export const PsLightbox = {
    open(options: LightboxOptions) {
        if (!options.images || options.images.length === 0) return
        const host = document.createElement("div")
        document.body.appendChild(host)
        const onClosed = () => {
            ReactDOM.unmountComponentAtNode(host)
            host.remove()
        }
        ReactDOM.render(<Lightbox {...options} onClosed={onClosed} />, host)
    },
}

export default PsLightbox
