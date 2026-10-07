import axios from "axios";
import { WKApp } from "@tsdaodao/base";

// ---------- 类型（与服务端 modules/moment 响应一致） ----------

export interface MomentImage {
    url: string
    width: number
    height: number
}

export interface UserBrief {
    uid: string
    name: string
}

export interface MomentComment {
    id: number
    uid: string
    name: string
    content: string
    reply_uid?: string
    reply_name?: string
    created_at: number
}

export interface Moment {
    moment_no: string
    uid: string
    name: string
    content: string
    privacy_type: number
    imgs: MomentImage[]
    likes: UserBrief[]
    comments: MomentComment[]
    liked: boolean
    created_at: number
    cursor: number
}

export interface MomentPage {
    list: Moment[]
    next_cursor: number
}

export interface MomentNotice {
    id: number
    moment_no: string
    uid: string
    name: string
    action: "like" | "comment"
    comment: string
    moment: { content: string, img: string } | null
    created_at: number
}

export const PrivacyFriends = 0
export const PrivacyPrivate = 1
export const MAX_IMAGES = 9

// ---------- 接口 ----------

export const MomentsAPI = {
    timeline(before = 0, limit = 10): Promise<MomentPage> {
        return WKApp.apiClient.get("moments", { param: { before, limit } })
    },
    userMoments(uid: string, before = 0, limit = 10): Promise<MomentPage> {
        return WKApp.apiClient.get(`moments/user/${uid}`, { param: { before, limit } })
    },
    detail(momentNo: string): Promise<Moment> {
        return WKApp.apiClient.get(`moments/${momentNo}`)
    },
    publish(content: string, imgs: MomentImage[], privacyType: number): Promise<{ moment_no: string }> {
        return WKApp.apiClient.post("moments", { content, imgs, privacy_type: privacyType })
    },
    remove(momentNo: string) {
        return WKApp.apiClient.delete(`moments/${momentNo}`)
    },
    like(momentNo: string) {
        return WKApp.apiClient.put(`moments/${momentNo}/like`)
    },
    unlike(momentNo: string) {
        return WKApp.apiClient.delete(`moments/${momentNo}/like`)
    },
    comment(momentNo: string, content: string, replyCommentID?: number): Promise<MomentComment> {
        return WKApp.apiClient.post(`moments/${momentNo}/comments`, { content, reply_comment_id: replyCommentID || 0 })
    },
    removeComment(momentNo: string, commentID: number) {
        return WKApp.apiClient.delete(`moments/${momentNo}/comments/${commentID}`)
    },
    notices(before = 0, limit = 20): Promise<{ list: MomentNotice[], next_cursor: number }> {
        return WKApp.apiClient.get("moments/notices", { param: { before, limit } })
    },
    feedUnread(): Promise<{ count: number, latest_uid: string }> {
        return WKApp.apiClient.get("moments/unread")
    },
    noticeUnread(): Promise<{ count: number }> {
        return WKApp.apiClient.get("moments/notices/unread")
    },
    markFeedRead() {
        return WKApp.apiClient.put("moments/read")
    },
    markNoticeRead() {
        return WKApp.apiClient.put("moments/notices/read")
    },
    setting(uid?: string): Promise<{ uid: string, cover: string }> {
        return WKApp.apiClient.get("moments/setting", { param: uid ? { uid } : {} })
    },
    updateCover(cover: string) {
        return WKApp.apiClient.put("moments/setting/cover", { cover })
    },
}

// ---------- 图片 ----------

export function imageURL(path: string): string {
    return path ? WKApp.dataSource.commonDataSource.getImageURL(path) : ""
}

function readImageSize(file: File): Promise<{ width: number, height: number }> {
    return new Promise((resolve) => {
        const url = URL.createObjectURL(file)
        const img = new Image()
        img.onload = () => {
            resolve({ width: img.naturalWidth, height: img.naturalHeight })
            URL.revokeObjectURL(url)
        }
        img.onerror = () => {
            resolve({ width: 0, height: 0 })
            URL.revokeObjectURL(url)
        }
        img.src = url
    })
}

function randomID(): string {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
}

/** 上传一张动态图片；路径固定在自己的 uid 目录下，避免与他人冲突 */
export async function uploadMomentImage(file: File, type: "moment" | "momentcover" = "moment"): Promise<MomentImage> {
    const ext = (file.name.match(/\.[a-zA-Z0-9]+$/)?.[0] || ".jpg").toLowerCase()
    const path = `/${WKApp.loginInfo.uid}/${randomID()}${ext}`
    const [{ url }, size] = await Promise.all([
        WKApp.apiClient.get(`file/upload?type=${type}&path=${encodeURIComponent(path)}`) as Promise<{ url: string }>,
        readImageSize(file),
    ])
    const form = new FormData()
    form.append("file", file)
    form.append("contenttype", file.type || "application/octet-stream") // 否则存储为 octet-stream
    const resp = await axios.post(url, form, { headers: { "Content-Type": "multipart/form-data", token: WKApp.loginInfo.token || "" } })
    return { url: resp.data.path, width: size.width, height: size.height }
}

// ---------- 红点状态 ----------

type Listener = () => void

export type MomentsView =
    | { kind: "timeline" }
    | { kind: "notices" }
    | { kind: "user", uid: string, name: string }
    | { kind: "detail", momentNo: string }

/** 朋友圈未读状态：与我相关未读数、新动态数及最新发布者，供菜单红点和侧栏使用 */
export class MomentsStore {
    static shared = new MomentsStore()

    noticeUnread = 0
    feedUnread = 0
    latestUID = ""
    private listeners = new Set<Listener>()
    // 已读操作的版本号：比最近一次已读更早发起的未读查询，结果返回时直接丢弃，避免红点"复活"
    private feedReadEpoch = 0
    private noticeReadEpoch = 0

    subscribe(l: Listener): () => void {
        this.listeners.add(l)
        return () => { this.listeners.delete(l) }
    }

    private emit() {
        this.listeners.forEach((l) => l())
        WKApp.menus.refresh()
    }

    async refresh() {
        if (!WKApp.loginInfo.isLogined()) return
        const feedEpoch = this.feedReadEpoch
        const noticeEpoch = this.noticeReadEpoch
        try {
            const [feed, notice] = await Promise.all([MomentsAPI.feedUnread(), MomentsAPI.noticeUnread()])
            if (feedEpoch === this.feedReadEpoch) {
                this.feedUnread = feed.count
                this.latestUID = feed.latest_uid
            }
            if (noticeEpoch === this.noticeReadEpoch) {
                this.noticeUnread = notice.count
            }
            this.emit()
        } catch (e) {
            console.log("刷新朋友圈红点失败", e)
        }
    }

    async readFeed() {
        this.feedReadEpoch++
        this.feedUnread = 0
        this.latestUID = ""
        this.emit()
        await MomentsAPI.markFeedRead().catch(() => undefined)
        this.feedReadEpoch++ // 标记期间发起的查询同样作废
    }

    async readNotices() {
        this.noticeReadEpoch++
        this.noticeUnread = 0
        this.emit()
        await MomentsAPI.markNoticeRead().catch(() => undefined)
        this.noticeReadEpoch++ // 标记期间发起的查询同样作废
    }

    // ---------- 右侧页面导航（侧栏与右侧内容共享） ----------
    stack: MomentsView[] = [{ kind: "timeline" }]

    get view(): MomentsView {
        return this.stack[this.stack.length - 1]
    }

    /** 侧栏切换：重置为根页面 */
    showRoot(view: MomentsView) {
        this.stack = [view]
        this.listeners.forEach((l) => l())
    }

    push(view: MomentsView) {
        this.stack = [...this.stack, view]
        this.listeners.forEach((l) => l())
    }

    back() {
        if (this.stack.length > 1) {
            this.stack = this.stack.slice(0, -1)
            this.listeners.forEach((l) => l())
        }
    }

    // ---------- 发布弹窗（侧栏按钮与时间线相机按钮共用） ----------
    composerOpen = false
    publishedTick = 0 // 每次发布成功自增，时间线据此刷新

    openComposer() {
        this.composerOpen = true
        this.listeners.forEach((l) => l())
    }

    closeComposer(published: boolean) {
        this.composerOpen = false
        if (published) this.publishedTick++
        this.listeners.forEach((l) => l())
    }

    /** 菜单角标：有互动提醒显示提醒数，否则显示新动态数 */
    get badge(): number {
        return this.noticeUnread > 0 ? this.noticeUnread : this.feedUnread
    }
}
