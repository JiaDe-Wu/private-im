import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Toast } from "@douyinfe/semi-ui";
import { Contacts, ContextMenus, ContextMenusContext, UserRelation, WKApp, getPinyin, toSimplized } from "@tsdaodao/base";
import WKAvatar from "@tsdaodao/base/src/Components/WKAvatar";
import { Card } from "@tsdaodao/base/src/Messages/Card";
import { Channel, ChannelInfo, ChannelTypePerson, WKSDK } from "wukongimjssdk";
import { ContactsListManager } from "../Service/ContactsListManager";
import { Empty, ListRow, SearchBox } from "../ui";

const displayName = (c: Contacts) => (c.remark && c.remark !== "" ? c.remark : c.name)

/** 按显示名拼音首字母分组；非字母归入 #，排在最后 */
function groupByInitial(list: Contacts[]): [string, Contacts[]][] {
    const groups = new Map<string, Contacts[]>()
    for (const c of list) {
        const py = getPinyin(toSimplized(displayName(c))).toUpperCase()
        const key = py && /[A-Z]/.test(py[0]) ? py[0] : "#"
        groups.set(key, [...(groups.get(key) || []), c])
    }
    return Array.from(groups.entries())
        .sort(([a], [b]) => (a === "#" ? 1 : b === "#" ? -1 : a.localeCompare(b)))
        .map(([k, items]) => [k, items.sort((x, y) => displayName(x).localeCompare(displayName(y), "zh-Hans-CN"))])
}

/** 好友 = 已关注且未拉黑 */
const friendsOf = (all: Contacts[]) => all.filter((c) => c.follow === 1 && c.status !== UserRelation.blacklist)

export default function ContactsList() {
    const [keyword, setKeyword] = useState("")
    const [version, setVersion] = useState(0) // 数据源变化时自增以触发重算
    const [selected, setSelected] = useState<Contacts | undefined>()
    const menusRef = useRef<ContextMenusContext>()
    const listRef = useRef<HTMLDivElement>(null)
    const refresh = useCallback(() => setVersion((v) => v + 1), [])

    useEffect(() => {
        const onChannelInfo = (info: ChannelInfo) => {
            if (info.channel.channelType !== ChannelTypePerson) return
            const c = WKApp.dataSource.contactsList.find((x) => x.uid === info.channel.channelID)
            if (c) {
                c.name = info.title
                c.remark = info?.orgData?.remark
                refresh()
            }
        }
        WKApp.dataSource.addContactsChangeListener(refresh)
        WKSDK.shared().channelManager.addListener(onChannelInfo)
        ContactsListManager.shared.setRefreshList = refresh
        return () => {
            WKApp.dataSource.removeContactsChangeListener(refresh)
            WKSDK.shared().channelManager.removeListener(onChannelInfo)
            ContactsListManager.shared.setRefreshList = undefined
        }
    }, [refresh])

    const friends = useMemo(() => friendsOf(WKApp.dataSource.contactsList),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [version])
    const groups = useMemo(() => {
        const kw = keyword.trim()
        return groupByInitial(kw ? friends.filter((c) => displayName(c).includes(kw) || c.name.includes(kw)) : friends)
    }, [friends, keyword])

    const open = (c: Contacts) => {
        WKApp.endpoints.showConversation(new Channel(c.uid, ChannelTypePerson))
        refresh()
    }

    const jumpTo = (letter: string) => {
        listRef.current?.querySelector(`[data-initial="${letter}"]`)?.scrollIntoView({ behavior: "smooth", block: "start" })
    }

    const openChannel = WKApp.shared.openChannel
    return <div className="ps-c-page ps-contacts">
        <div className="ps-c-title">
            <h1>通讯录</h1>
            <span>{friends.length} 位好友</span>
        </div>
        <div className="ps-c-toolbar">
            <SearchBox placeholder="搜索好友" value={keyword} onChange={setKeyword} />
        </div>
        <div className="ps-c-scroll" ref={listRef}>
            {!keyword ? <div className="ps-c-entries">
                {WKApp.endpoints.contactsHeaders().map((view, i) => <React.Fragment key={i}>{view}</React.Fragment>)}
            </div> : undefined}
            {groups.map(([letter, items]) => <section key={letter} className="ps-c-section" data-initial={letter}>
                <div className="ps-c-section-title">{letter}</div>
                {items.map((c) => <ListRow key={c.uid}
                    avatar={<WKAvatar channel={new Channel(c.uid, ChannelTypePerson)} />}
                    title={displayName(c)}
                    subtitle={c.remark && c.remark !== c.name ? c.name : undefined}
                    selected={openChannel?.channelType === ChannelTypePerson && openChannel?.channelID === c.uid}
                    onClick={() => open(c)}
                    onContextMenu={(e) => { setSelected(c); menusRef.current?.show(e) }} />)}
            </section>)}
            {groups.length === 0 ? <Empty text={keyword ? `没有找到「${keyword}」` : "还没有好友，去添加一个吧"} /> : undefined}
            {groups.length > 0 && !keyword ? <div className="ps-c-footnote">共 {friends.length} 位好友</div> : undefined}
        </div>
        {groups.length > 6 && !keyword ? <nav className="ps-c-rail" aria-label="按首字母跳转">
            {groups.map(([letter]) => <button key={letter} onClick={() => jumpTo(letter)}>{letter}</button>)}
        </nav> : undefined}
        <ContextMenus onContext={(ctx: ContextMenusContext) => { menusRef.current = ctx }} menus={[
            { title: "查看资料", onClick: () => selected && WKApp.shared.baseContext.showUserInfo(selected.uid) },
            {
                title: "分享给朋友…", onClick: () => {
                    WKApp.shared.baseContext.showConversationSelect((channels: Channel[]) => {
                        if (!selected || !channels?.length) return
                        for (const channel of channels) {
                            const card = new Card()
                            card.uid = selected.uid
                            card.name = selected.name
                            card.vercode = selected.vercode || ""
                            WKSDK.shared().chatManager.send(card, channel)
                        }
                        Toast.success("已分享")
                    }, "分享名片")
                },
            },
        ]} />
    </div>
}
