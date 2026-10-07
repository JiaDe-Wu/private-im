# Private IM tool · Web 端

Private IM tool 的浏览器客户端，提供聊天、联系人、朋友圈和个人设置。

![登录页](../docs/images/web-login.png)

- React 17 + TypeScript，Create React App（react-app-rewired）
- Yarn workspaces + Turbo 管理多包
- UI 组件：Semi UI；品牌主题（主色 `#7c3aed`，字体 Space Grotesk）
- 长连接：IM SDK（WSS）

## 目录结构

| 路径 | 内容 |
|---|---|
| `apps/web` | 应用入口：注册各功能模块、全局主题、开发代理 |
| `packages/tsdaodaobase` | 基础框架：应用壳、会话列表、聊天窗口、消息类型、设置页、主题样式（`src/theme/pitchshow-chat.css`） |
| `packages/tsdaodaologin` | 登录、注册、找回密码；动效登录页 |
| `packages/tsdaodaocontacts` | 联系人、新朋友、黑名单、群聊列表、添加好友 |
| `packages/tsdaodaomoments` | **朋友圈**：时间线、发布、点赞评论、互动消息、新动态红点 |
| `packages/tsdaodaodatasource` | 数据源：频道信息、联系人同步、表情等接口 |

功能模块的接入方式：在模块的 `module.tsx` 里通过 `WKApp.menus.register` / `WKApp.route.register` 注册菜单和页面，然后在 `apps/web/src/index.tsx` 中 `registerModule`。

## 开发

```bash
yarn install
cd apps/web
yarn dev            # http://127.0.0.1:3000，/api 代理到本机业务服务（见 .env.development.local）
yarn build          # 产物在 apps/web/build
```

发布到云上开发环境：`~/tsdd/infra/scripts/deploy-web.sh`。正式构建使用相对接口地址 `/api/v1/`，由 CloudFront 转发到业务服务。

## 样式约定

- 全局主题覆盖文件必须在 `index.tsx` 中**最后**引入，选择器统一加 `body` 前缀，以保证优先级。
- 聊天输入框工具栏的按钮不要使用 `transform` / `scale` 动效，表情面板是相对它们绝对定位的。
- 新页面优先复用 `packages/tsdaodaocontacts/src/ui.tsx` 里的页头、搜索框、列表行等组件。

## 许可

见 [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md)。
