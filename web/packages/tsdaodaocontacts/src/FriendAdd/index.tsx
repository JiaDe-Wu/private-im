import React, { useState } from "react";
import { Toast } from "@douyinfe/semi-ui";
import { QRCodeMy, WKApp } from "@tsdaodao/base";
import { Icons, PageHeader, SearchBox } from "../ui";

export interface FriendAddProps {
    onBack?: () => void
}

/** 添加好友：按 PitchShow 号或手机号搜索 */
export function FriendAdd(props: FriendAddProps) {
    const [keyword, setKeyword] = useState("")
    const [searching, setSearching] = useState(false)
    const appName = WKApp.config.appName

    const search = async () => {
        const kw = keyword.trim()
        if (!kw || searching) return
        setSearching(true)
        try {
            const result = await WKApp.dataSource.commonDataSource.searchUser(kw)
            if (result?.exist !== 1) {
                Toast.warning("没有找到这个用户")
            } else {
                WKApp.shared.baseContext.showUserInfo(result.data.uid, undefined, result.data.vercode)
            }
        } catch (err: any) {
            Toast.error(err?.msg || "搜索失败")
        } finally {
            setSearching(false)
        }
    }

    return <div className="ps-c-page">
        <PageHeader title="添加好友" onBack={props.onBack} />
        <div className="ps-c-scroll ps-c-padded">
            <div className="ps-c-searchrow">
                <SearchBox placeholder={`${appName} 号 / 手机号`} value={keyword} autoFocus onChange={setKeyword} onEnter={search} />
                <button className="ps-c-primary" disabled={!keyword.trim() || searching} onClick={search}>{searching ? "搜索中…" : "搜索"}</button>
            </div>
            <button className="ps-c-mycard" onClick={() => WKApp.routeLeft.push(<QRCodeMy />)}>
                <img src={WKApp.shared.avatarUser(WKApp.loginInfo.uid || "")} alt="" />
                <span className="ps-c-mycard-text">
                    <b>{WKApp.loginInfo.name}</b>
                    <small>我的 {appName} 号：{WKApp.loginInfo.shortNo}</small>
                </span>
                <span className="ps-c-mycard-qr" title="我的二维码">{Icons.qrcode}</span>
            </button>
            <p className="ps-c-hint">把你的 {appName} 号或二维码分享给朋友，对方搜索后即可发起好友申请</p>
        </div>
    </div>
}
