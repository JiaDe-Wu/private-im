import React, { Component } from "react";
import { WKApp, WKBase, Provider } from "@tsdaodao/base"
import { listen } from '@tauri-apps/api/event'
// import Provider from "limbase/src/Service/Provider";
import { MainPage } from "../Pages/Main";
import { Notification as NotificationUI, Button } from '@douyinfe/semi-ui';
import { checkUpdate, installUpdate, UpdateManifest } from '@tauri-apps/api/updater'
import { relaunch } from '@tauri-apps/api/process'
import { os } from "@tauri-apps/api";
import { getSid } from "@tsdaodao/base/src/Utils/search";


// 登录离场动效时长（与 login.css 的 wk-login-card-out 一致），结束后切到首页
const LOGIN_EXIT_MS = 520
// 首页入场动效时长（pitchshow-motion.css 的 body.ps-app-entering）
const APP_ENTER_MS = 1200

export default class AppLayout extends Component {
    onLogin!: () => void
    private entering = false
    componentDidMount() {
        this.onLogin = () => {
            // 不再整页刷新：应用已在登录回调里直接初始化（WKApp.startMain），这里只做界面切换
            const sid = getSid()
            window.history.replaceState({}, "", `./index.html?sid=${sid}`)
            this.entering = true
            window.setTimeout(() => {
                this.entering = false
                document.body.classList.add("ps-app-entering")
                window.setTimeout(() => document.body.classList.remove("ps-app-entering"), APP_ENTER_MS)
                WKApp.shared.notifyListener()
            }, LOGIN_EXIT_MS)

            Notification.requestPermission() // 请求通知权限
        }
        WKApp.endpoints.addOnLogin(this.onLogin)


        this.tauriCheckUpdate()

    }

    componentWillUnmount() {
        WKApp.endpoints.removeOnLogin(this.onLogin)
    }

    async tauriCheckUpdate() {
        if(!(window as any).__TAURI_IPC__) {
            return
        }

        listen('tauri://update-status', function (res) {
            console.log('New status: ', res)
        })


        try {
            const { shouldUpdate, manifest } = await checkUpdate()
            if (shouldUpdate) {
                // display dialog
                console.log(`Installing update ${manifest.version}, ${manifest?.date}, ${manifest.body}`);
                if(await os.platform() === "darwin") { // mac 自动下载更新
                    await installUpdate()
                }
                this.showUpdateUI(manifest)

            }
        } catch (error) {
            console.log(error)
        }
    }

    showUpdateUI(manifest: UpdateManifest) {
      const notifyID =  NotificationUI.info({
            title: `有新版本 ${manifest.version}`,
            duration: 0,
            content: (
                <>
                    <div>{manifest.body}</div>
                    <div style={{ marginTop: 8 }}>
                        <Button onClick={ async () => {
                           // install complete, restart app
                           if(await os.platform() !== "darwin") {
                                await installUpdate()
                            }
                          await relaunch()
                        }}>更新</Button>
                        <Button onClick={()=>{
                            NotificationUI.close(notifyID)
                        }} type="secondary" style={{ marginLeft: 20 }}>
                            下次
                        </Button>
                    </div>
                </>
            ),
        })
    }

    showProgressUI() {

    }

    render() {
        return <Provider create={() => {
            return WKApp.shared
        }} render={(vm: WKApp): any => {
            if (!WKApp.shared.isLogined() || this.entering || window.location.pathname === '/login') {
                const loginComponent = WKApp.route.get("/login")
                if (!loginComponent) {
                    return <div>没有登录模块！</div>
                }
                return loginComponent
            }
            return <WKBase onContext={(ctx) => {
                WKApp.shared.baseContext = ctx
            }}>
                <MainPage />
            </WKBase>
        }} />

    }
}