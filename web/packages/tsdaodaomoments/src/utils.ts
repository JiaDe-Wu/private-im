import moment from "moment";

/** 朋友圈时间：刚刚 / N 分钟前 / N 小时前 / 昨天 HH:mm / M月D日 / YYYY年M月D日 */
export function formatMomentTime(unixSeconds: number): string {
    const t = moment.unix(unixSeconds)
    const now = moment()
    const diffMinutes = now.diff(t, "minutes")
    if (diffMinutes < 1) return "刚刚"
    if (diffMinutes < 60) return `${diffMinutes} 分钟前`
    if (t.isSame(now, "day")) return `${now.diff(t, "hours")} 小时前`
    if (t.isSame(now.clone().subtract(1, "day"), "day")) return `昨天 ${t.format("HH:mm")}`
    if (t.isSame(now, "year")) return t.format("M月D日")
    return t.format("YYYY年M月D日")
}

/** 九宫格布局：1 张按比例显示，4 张 2×2，其余 3 列 */
export function gridColumns(count: number): number {
    if (count <= 1) return 1
    if (count === 2 || count === 4) return 2
    return 3
}

/** 单张图按原始比例缩放到最大边界内 */
export function singleImageSize(width: number, height: number, max = 280, min = 120): { width: number, height: number } {
    if (!width || !height) return { width: 200, height: 200 }
    const ratio = width / height
    if (ratio >= 1) {
        const w = Math.min(max, width)
        return { width: w, height: Math.max(min, Math.round(w / ratio)) }
    }
    const h = Math.min(max, height)
    return { width: Math.max(min, Math.round(h * ratio)), height: h }
}
