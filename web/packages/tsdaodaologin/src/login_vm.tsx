import { WKApp, ProviderListener } from "@tsdaodao/base";


export class LoginStatus {
    static getUUID: string = "getUUID"
    static waitScan: string = "waitScan"
    static authed: string = "authed"
    static scanned: string = "scanned"
    static expired: string = "expired"
}

export enum LoginType {
    qrcode, // 二维码登录
    phone, // 手机号登录
}

// 卡片内的表单视图
export enum AuthView {
    login = "login", // 密码登录
    register = "register", // 注册
    forget = "forget", // 忘记密码
    qrcode = "qrcode", // 扫码登录
}

// 短信验证码类型（对应服务端不同的发送接口）
type CodeKind = "register" | "forget"

export const ZONES = [
    { code: "0086", label: "+86", name: "中国大陆" },
    { code: "00852", label: "+852", name: "中国香港" },
    { code: "00853", label: "+853", name: "中国澳门" },
    { code: "00886", label: "+886", name: "中国台湾" },
    { code: "001", label: "+1", name: "美国 / 加拿大" },
    { code: "0044", label: "+44", name: "英国" },
    { code: "0081", label: "+81", name: "日本" },
    { code: "0082", label: "+82", name: "韩国" },
    { code: "0065", label: "+65", name: "新加坡" },
    { code: "0060", label: "+60", name: "马来西亚" },
    { code: "0061", label: "+61", name: "澳大利亚" },
]

const CODE_COUNTDOWN = 60 // 验证码重发间隔（秒）
const PASSWORD_MIN_LENGTH = 6

export class LoginVM extends ProviderListener {
    loginStatus: string = LoginStatus.getUUID // 登录状态
    qrcodeLoading: boolean = false // 二维码加载中
    uuid?: string
    qrcode?: string
    expireMaxTryCount: number = 5 // 过期最多次数（超过指定次数则永远显示过期，需要用户手动刷新）
    private _expireTryCount: number = 0 // 过期尝试次数

    uid?: string // 当前扫描的用户uid
    private _loginType: LoginType = LoginType.phone

    private _pullMaxErrCount: number = 10 //  pull登录状态请求最大错误次数，超过指定次数将不再请求
    private _pullErrCount: number = 0 // 当前pull发生错误请求次数

    private _autoRefresh: boolean = true // 是否自动刷新二维码
    loginLoading: boolean = false // 登录中

    // ---------- 手机号表单 ----------
    private _view: AuthView = AuthView.login
    zone: string = ZONES[0].code
    phone: string = ""
    password: string = ""
    code: string = ""
    name: string = "" // 注册昵称（可选）
    passwordVisible: boolean = false

    codeSending: boolean = false
    codeCountdown: number = 0 // 验证码倒计时剩余秒数，0 表示可发送
    private _countdownTimer?: number

    // ---------- 动效状态 ----------
    errorTick: number = 0 // 每次出错自增，用于触发卡片抖动动画
    success: boolean = false // 登录成功，播放离场动画

    set autoRefresh(v: boolean) {
        this._autoRefresh = v
        this.notifyListener()

        if (v) {
            this.reStartAdvance()
        }
    }

    get autoRefresh() {
        return this._autoRefresh
    }

    didMount(): void {
        this.advance()
    }

    didUnMount(): void {
        this.loginType = LoginType.phone // 停止扫码状态轮询
        window.clearInterval(this._countdownTimer)
    }

    set loginType(v: LoginType) {
        this._loginType = v
        if (v === LoginType.qrcode) {
            this.reStartAdvance()
        }
        this.notifyListener()
    }
    get loginType(): LoginType {
        return this._loginType
    }

    set view(v: AuthView) {
        if (this._view === v) return
        this._view = v
        this.code = ""
        this.password = ""
        this.passwordVisible = false
        this.loginType = v === AuthView.qrcode ? LoginType.qrcode : LoginType.phone
    }
    get view(): AuthView {
        return this._view
    }

    // ---------- 表单与动效 ----------

    setField(field: "phone" | "password" | "code" | "name" | "zone", value: string) {
        this[field] = value
        this.notifyListener()
    }

    togglePasswordVisible() {
        this.passwordVisible = !this.passwordVisible
        this.notifyListener()
    }

    // 校验失败或接口报错：抖动卡片，返回错误文案便于 Toast
    fail(msg: string): string {
        this.errorTick++
        this.notifyListener()
        return msg
    }

    get fullPhone(): string {
        return `${this.zone}${this.phone.trim()}`
    }

    validatePhone(): string | undefined {
        const phone = this.phone.trim()
        if (!phone) return "请输入手机号"
        if (this.zone === "0086") {
            if (!/^1\d{10}$/.test(phone)) return "请输入正确的 11 位手机号"
        } else if (!/^\d{5,15}$/.test(phone)) {
            return "手机号格式不正确"
        }
        return undefined
    }

    validateNewPassword(): string | undefined {
        if (!this.password) return "请设置密码"
        if (this.password.length < PASSWORD_MIN_LENGTH) return `密码至少 ${PASSWORD_MIN_LENGTH} 位`
        return undefined
    }

    // ---------- 接口 ----------

    async sendCode(kind: CodeKind): Promise<void> {
        const invalid = this.validatePhone()
        if (invalid) throw this.fail(invalid)
        if (this.codeSending || this.codeCountdown > 0) return

        this.codeSending = true
        this.notifyListener()
        try {
            const path = kind === "register" ? "user/sms/registercode" : "user/sms/forgetpwd"
            const resp = await WKApp.apiClient.post(path, { zone: this.zone, phone: this.phone.trim() })
            if (kind === "register" && resp?.exist === 1) {
                throw { msg: "该手机号已注册，请直接登录" }
            }
            this.startCountdown()
        } catch (err: any) {
            throw this.fail(err?.msg || "验证码发送失败")
        } finally {
            this.codeSending = false
            this.notifyListener()
        }
    }

    private startCountdown() {
        this.codeCountdown = CODE_COUNTDOWN
        window.clearInterval(this._countdownTimer)
        this._countdownTimer = window.setInterval(() => {
            this.codeCountdown--
            if (this.codeCountdown <= 0) {
                this.codeCountdown = 0
                window.clearInterval(this._countdownTimer)
            }
            this.notifyListener()
        }, 1000)
    }

    async submitLogin(): Promise<void> {
        const invalid = this.validatePhone() || (!this.password ? "请输入密码" : undefined)
        if (invalid) throw this.fail(invalid)
        try {
            await this.requestLoginWithUsernameAndPwd(this.fullPhone, this.password)
        } catch (err: any) {
            throw this.fail(err?.msg || "登录失败")
        }
    }

    async submitRegister(): Promise<void> {
        const invalid = this.validatePhone() || (!this.code ? "请输入验证码" : undefined) || this.validateNewPassword()
        if (invalid) throw this.fail(invalid)
        this.loginLoading = true
        this.notifyListener()
        try {
            const result = await WKApp.apiClient.post("user/register", {
                zone: this.zone,
                phone: this.phone.trim(),
                code: this.code.trim(),
                password: this.password,
                name: this.name.trim(),
                flag: 1, // 0.APP 1.PC/Web
                device: this.getDevice(),
            })
            this.loginSuccess(result)
        } catch (err: any) {
            throw this.fail(err?.msg || "注册失败")
        } finally {
            this.loginLoading = false
            this.notifyListener()
        }
    }

    // 重置密码，成功后回到登录视图并保留手机号
    async submitResetPassword(): Promise<void> {
        const invalid = this.validatePhone() || (!this.code ? "请输入验证码" : undefined) || this.validateNewPassword()
        if (invalid) throw this.fail(invalid)
        this.loginLoading = true
        this.notifyListener()
        try {
            await WKApp.apiClient.post("user/pwdforget", {
                zone: this.zone,
                phone: this.phone.trim(),
                code: this.code.trim(),
                pwd: this.password,
            })
            this.view = AuthView.login
        } catch (err: any) {
            throw this.fail(err?.msg || "重置密码失败")
        } finally {
            this.loginLoading = false
            this.notifyListener()
        }
    }

    reStartAdvance() {
        this.restCount()
        this.loginStatus = LoginStatus.getUUID
        this._autoRefresh = true
        this.notifyListener()
        this.advance()
    }


    advance(data?: any) {
        if (this.loginType !== LoginType.qrcode) {
            return
        }
        switch (this.loginStatus) {
            case LoginStatus.getUUID:
                this.requestUUID()
                break
            case LoginStatus.waitScan:
                this.pullLoginStatus(this.uuid)
                break
            case LoginStatus.scanned:
                this.uid = data.uid
                this.notifyListener()
                this.pullLoginStatus(this.uuid)
                break
            case LoginStatus.authed:
                this.restCount()
                this.requestLogin(data.auth_code)
                break
            case LoginStatus.expired:
                this._expireTryCount++
                if (this._expireTryCount > this.expireMaxTryCount) {
                    this.autoRefresh = false
                } else {
                    this.loginStatus = LoginStatus.getUUID
                    this.advance()
                }

        }
    }

    restCount() {
        this._expireTryCount = 0
        this._pullErrCount = 0
    }

    async requestLogin(authCode: string) {
        if (this.loginLoading) {
            return
        }
        this.loginLoading = true
        const resp = await WKApp.apiClient.post(`user/login_authcode/${authCode}`);
        if (resp) {
            this.loginSuccess(resp)
        }
        this.loginLoading = false
    }

    async requestLoginWithUsernameAndPwd(username: string, password: string) {
        this.loginLoading = true
        this.notifyListener()
        const device = this.getDevice()
        let deviceFlag = 1 // web
        // if(WKApp.shared.isPC) {
        //     deviceFlag = 2 // pc

        // }
        return WKApp.apiClient.post(`user/login`, { "username": username, "password": password, "flag": deviceFlag,"device":device }).then((result)=>{
            this.loginSuccess(result)
        }).finally(()=>{
            this.loginLoading = false
            this.notifyListener()
        }) // flag 0.app 1.pc
    }

    getDevice() {
        return {
            "device_id": WKApp.shared.deviceId,
            "device_name": WKApp.shared.deviceName,
            "device_model": WKApp.shared.deviceModel,
        }
    }

    // 立即写入登录信息并开始初始化（建连、同步）；离场动效与初始化并行，由外层布局在动效结束后切到首页
    loginSuccess(data:any) {
        this.success = true
        this.notifyListener()
        const loginInfo = WKApp.loginInfo
        loginInfo.appID = data.app_id
        loginInfo.uid = data.uid
        loginInfo.shortNo = data.short_no
        loginInfo.token = data.token
        loginInfo.name = data.name
        loginInfo.sex = data.sex
        loginInfo.save()

        WKApp.endpoints.callOnLogin()
    }

    requestUUID() {
        if (this.qrcodeLoading) {
            return
        }
        this.qrcodeLoading = true
        this.notifyListener()
        const device = this.getDevice()
        WKApp.apiClient.get('user/loginuuid',{
            param: device,
        }).then((result) => {
            this.uuid = result.uuid
            this.qrcodeLoading = false
            this.qrcode = result.qrcode
            this.loginStatus = LoginStatus.waitScan
            this.notifyListener()
            this.advance()
        }).catch(() => {
            this.qrcodeLoading = false
            this.notifyListener()
        })
    }

    // 轮训登录状态
    pullLoginStatus(uuid?: string) {
        if (this.loginType !== LoginType.qrcode) {
            return
        }
        if (!uuid) {
            return
        }
        if (uuid !== this.uuid) return;
        if (this._pullErrCount >= this._pullMaxErrCount) {
            this._pullErrCount = 0
            this.loginStatus = LoginStatus.getUUID
            this.advance()
            return
        }

        WKApp.apiClient.get(`user/loginstatus?uuid=${uuid}`).then((result: any) => {
            this._pullErrCount = 0
            const loginStatus = result.status;
            this.loginStatus = loginStatus
            this.advance(result)
        }).catch(() => {
            this._pullErrCount++
            this.pullLoginStatus(uuid)
        })
    }
    showAvatar() {
        return this.loginStatus === LoginStatus.scanned && this.uid
    }
}
