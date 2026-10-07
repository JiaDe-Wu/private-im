import React, { useEffect, useReducer } from "react";
import { UserRelation, WKApp } from "@tsdaodao/base";
import { Empty, ListRow, PageHeader } from "../ui";

/** 黑名单：点击查看资料（在资料页可移出黑名单） */
export default function Blacklist() {
    const [, refresh] = useReducer((n: number) => n + 1, 0)
    useEffect(() => {
        WKApp.dataSource.addContactsChangeListener(refresh)
        return () => WKApp.dataSource.removeContactsChangeListener(refresh)
    }, [])
    const list = WKApp.dataSource.contactsList.filter((c) => c.status === UserRelation.blacklist)

    return <div className="ps-c-page">
        <PageHeader title="黑名单" onBack={() => WKApp.routeLeft.pop()} />
        <div className="ps-c-scroll">
            {list.length > 0 ? <p className="ps-c-hint">你不会收到他们的消息，点击可查看资料或移出黑名单</p> : undefined}
            {list.map((c) => <ListRow key={c.uid}
                avatar={<img src={WKApp.shared.avatarUser(c.uid)} alt="" />}
                title={c.name}
                onClick={() => WKApp.shared.baseContext.showUserInfo(c.uid)} />)}
            {list.length === 0 ? <Empty text="黑名单是空的" /> : undefined}
        </div>
    </div>
}
