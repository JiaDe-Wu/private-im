import React, { useCallback, useEffect, useState } from "react";
import { Toast } from "@douyinfe/semi-ui";
import { FriendApply, FriendApplyState, WKApp } from "@tsdaodao/base";
import { CMDContent, Message, WKSDK } from "wukongimjssdk";
import { FriendAdd } from "../FriendAdd";
import { Empty, HeaderButton, Icons, ListRow, PageHeader } from "../ui";

async function fetchApplies(): Promise<FriendApply[]> {
    return (await WKApp.apiClient.get("/friend/apply", { param: { page_index: 1, page_size: 999 } })) || []
}

/** 清空「新朋友」红点（本地缓存 + 服务端） */
async function clearUnread() {
    if (WKApp.loginInfo.isLogined()) {
        WKApp.loginInfo.setStorageItem(`${WKApp.loginInfo.uid}-friend-applys-unread-count`, "0")
    }
    await WKApp.apiClient.delete("/user/reddot/friendApply").catch(() => undefined)
}

/** 新的朋友：好友申请列表，可接受 */
export function NewFriend() {
    const [applies, setApplies] = useState<FriendApply[]>([])
    const [loading, setLoading] = useState(true)
    const [accepting, setAccepting] = useState<string>()

    const load = useCallback(async () => {
        const list = await fetchApplies().catch(() => [])
        setApplies(list)
        setLoading(false)
        return list
    }, [])

    useEffect(() => {
        WKApp.shared.friendApplyMarkAllReaded()
        load().then((list) => { if (list.length === 0) clearUnread() })
        const onCMD = (message: Message) => {
            if ((message.content as CMDContent).cmd === "friendRequest") load()
        }
        WKSDK.shared().chatManager.addCMDListener(onCMD)
        return () => WKSDK.shared().chatManager.removeCMDListener(onCMD)
    }, [load])

    const accept = async (apply: FriendApply) => {
        setAccepting(apply.to_uid)
        try {
            await WKApp.dataSource.commonDataSource.friendSure(apply.token || "")
            apply.status = FriendApplyState.accepted
            setApplies((list) => [...list])
            Toast.success(`已添加 ${apply.to_name}`)
            await WKApp.apiClient.delete(`/friend/apply/${apply.to_uid}`).catch(() => undefined)
            await load()
        } catch (err: any) {
            Toast.error(err?.msg || "操作失败")
        } finally {
            setAccepting(undefined)
        }
    }

    const addFriend = () => WKApp.routeLeft.push(<FriendAdd onBack={() => WKApp.routeLeft.pop()} />)

    return <div className="ps-c-page">
        <PageHeader title="新的朋友" onBack={() => WKApp.routeLeft.pop()} action={<HeaderButton onClick={addFriend}>添加</HeaderButton>} />
        <div className="ps-c-scroll">
            {applies.map((a) => {
                const accepted = a.status === FriendApplyState.accepted
                return <ListRow key={a.to_uid}
                    avatar={<img src={WKApp.shared.avatarUser(a.to_uid)} alt="" />}
                    title={a.to_name}
                    subtitle={a.remark ? <span className="ps-c-bubble">{a.remark}</span> : "请求添加你为好友"}
                    onClick={() => WKApp.shared.baseContext.showUserInfo(a.to_uid)}
                    trailing={accepted
                        ? <span className="ps-c-done">{Icons.check}已添加</span>
                        : <button className="ps-c-primary" disabled={accepting === a.to_uid}
                            onClick={(e) => { e.stopPropagation(); accept(a) }}>{accepting === a.to_uid ? "处理中…" : "接受"}</button>} />
            })}
            {!loading && applies.length === 0 ? <Empty text="暂时没有新的好友申请" action={<button className="ps-c-primary" onClick={addFriend}>添加好友</button>} /> : undefined}
        </div>
    </div>
}
