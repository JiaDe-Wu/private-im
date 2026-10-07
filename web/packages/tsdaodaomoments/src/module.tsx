import React from "react";
import { IModule, Menus, WKApp } from "@tsdaodao/base";
import { CMDContent, Message, WKSDK } from "wukongimjssdk";
import { MomentsStore } from "./service";
import { MomentsMain, MomentsSidebar } from "./components/MomentsPage";
import "./moments.css";

const CMD_MOMENT = "momentMsg" // 服务端 modules/moment 推送的命令，iOS 客户端已有同名约定

export default class MomentsModule implements IModule {
    id(): string {
        return "MomentsModule"
    }

    init(): void {
        console.log("【MomentsModule】初始化")
        const store = MomentsStore.shared

        WKApp.route.register("/moments", () => <MomentsSidebar />)

        WKApp.menus.register("moments", () => {
            const m = new Menus("moments", "/moments", "朋友圈",
                <img alt="朋友圈" src={require("./assets/MomentsTab.svg").default} />,
                <img alt="朋友圈" src={require("./assets/MomentsTabSelected.svg").default} />,
                () => {
                    WKApp.routeLeft.popToRoot()
                    WKApp.routeRight.replaceToRoot(<MomentsMain />)
                    store.refresh()
                })
            m.badge = store.badge
            return m
        }, 3000) // 位于「会话」(1000) 与「通讯录」(4000) 之间

        // 好友发布、点赞、评论时实时刷新红点
        WKSDK.shared().chatManager.addCMDListener((message: Message) => {
            const content = message.content as CMDContent
            if (content.cmd === CMD_MOMENT) {
                store.refresh()
            }
        })

        WKApp.endpoints.addOnLogin(() => store.refresh())
        store.refresh()
    }
}
