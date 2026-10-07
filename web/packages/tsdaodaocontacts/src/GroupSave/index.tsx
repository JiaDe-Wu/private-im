import React, { useCallback, useEffect, useRef, useState } from "react";
import { Toast } from "@douyinfe/semi-ui";
import { ContactsSelect, IndexTableItem, WKApp } from "@tsdaodao/base";
import { FinishButtonContext } from "@tsdaodao/base/src/Service/Context";
import { ChannelInfo, WKSDK } from "wukongimjssdk";
import { Empty, HeaderButton, ListRow, PageHeader } from "../ui";

/** 打开「选择联系人」建群 */
function createGroup() {
    let selected: IndexTableItem[] = []
    let finish: FinishButtonContext | undefined
    WKApp.routeLeft.push(<ContactsSelect
        showHeader={true}
        showFinishButton={true}
        onFinishButtonContext={(ctx) => { finish = ctx }}
        onSelect={(items) => { selected = items }}
        onBack={() => WKApp.routeLeft.pop()}
        onFinished={async () => {
            if (!selected.length) return
            finish?.loading(true)
            try {
                await WKApp.dataSource.channelDataSource.createChannel(selected.map((i) => i.id))
                WKApp.routeLeft.pop()
            } catch (err: any) {
                Toast.error(err?.msg || "建群失败")
            } finally {
                finish?.loading(false)
            }
        }} />)
}

/** 保存到通讯录的群聊 */
export default function GroupSave() {
    const [groups, setGroups] = useState<ChannelInfo[]>([])
    const [loading, setLoading] = useState(true)
    const groupsRef = useRef<ChannelInfo[]>([])
    const load = useCallback(async () => {
        const list = await WKApp.dataSource.channelDataSource.groupSaveList().catch(() => [])
        groupsRef.current = list
        setGroups(list)
        setLoading(false)
    }, [])

    useEffect(() => {
        load()
        // 已保存的群资料变化（改名、换头像）时刷新
        const onInfo = (info: ChannelInfo) => {
            if (groupsRef.current.some((g) => g.channel.isEqual(info.channel))) load()
        }
        WKSDK.shared().channelManager.addListener(onInfo)
        return () => WKSDK.shared().channelManager.removeListener(onInfo)
    }, [load])

    return <div className="ps-c-page">
        <PageHeader title="群聊" onBack={() => WKApp.routeLeft.pop()} action={<HeaderButton onClick={createGroup}>新建群</HeaderButton>} />
        <div className="ps-c-scroll">
            {groups.map((g) => <ListRow key={g.channel.channelID}
                avatar={<img src={WKApp.shared.avatarChannel(g.channel)} alt="" />}
                title={g.title}
                onClick={() => WKApp.endpoints.showConversation(g.channel)} />)}
            {!loading && groups.length === 0 ? <Empty text="还没有保存的群聊。在群设置里打开「保存到通讯录」即可出现在这里"
                action={<button className="ps-c-primary" onClick={createGroup}>新建群聊</button>} /> : undefined}
        </div>
    </div>
}
