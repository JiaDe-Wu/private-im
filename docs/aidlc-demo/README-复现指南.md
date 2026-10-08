---
title: "AI-DLC 2.0 × Kiro Crew Demo 复现指南（给人和 AI agent 读）"
date: 2026-10-06T17:30:00+08:00
lastmod: 2026-10-08T04:00:00+08:00
tags: [ai-dlc, deliverable]
status: archived
---

# AI-DLC 2.0 × Kiro Crew Demo 复现指南

| 版本 | 日期 | 主要变更 |
|---|---|---|
| v0.1 | 2026-10-06 | 骨架 |
| v0.2 | 2026-10-08 | 按现行方案重写：引擎改为本文件夹里的 kirocrew-team（本地安装）；新增规范包、接手运行的准备和发起脚本；补 node 版本要求和排错 E6、E7 |

> **读者**：要复现这个 demo 的人（Mac，已装 Kiro Crew），以及 Kiro Crew 里的 agent。用法：在 Kiro Crew 的会话里把本文交给 agent，说"按这份指南帮我复现 demo"。
>
> **给 AI agent 的说明**：按顺序执行每一步；每一步都有"验证"，不通过就停下，按"排错"处理或报告给人，不要跳步。标 **【人工】** 的步骤必须由人在界面上操作（安全授权、批准、花钱的决定），agent 只负责提示。不要修改本文以外的系统配置。路径都相对于本文件所在的文件夹（下称"demo 文件夹"）。
>
> 标 `TODO` 的地方在接手运行和重新部署之后补齐。

## 0. 你会得到什么

| 层级 | 内容 | 用时 | 花费 |
|---|---|---|---|
| **L1 演示复现**（推荐，够用来给客户演） | 打开已部署的 Private IM；在 Kiro Crew 里打开「多 Agent 团队」，回放录制好的那次接手运行；按脚本走一遍 10 分钟 demo | 约 30 分钟 | 0 credits |
| L2 完整复现 | 用同一支 agent 团队、同一份规范包，重新接手一次 Private IM | 数小时；每个角色开工要人批准 | TODO（录制后回填实测 credits） |

配套材料（demo 文件夹里）：

| 文件 | 内容 |
|---|---|
| `03-Demo演示脚本.md` | **演示时用这份**：概览 +（操作）/（讲述）逐字稿 + 常见追问 |
| `01-Demo剧本.md` | 演什么、为什么、素材清单、在 demo 里点出哪些 Crew 能力 |
| `00-Demo故事线.md` | 背景和论证 |
| `02-上架就绪清单.md` | 上架条款清单（已对照官方原文核对） |
| `spec-pack/` | 规范包：AI-DLC 官方专家副本 + 公司规范 + 公司下发的检查，见 `spec-pack/README.md` |
| `apps/kirocrew-team/` | 「多 Agent 团队」app（分支 `demo/aidlc-im`），团队配置 `team/team-im.json` |
| `takeover/` | 接手运行的准备、发起脚本和需求原文 |
| TODO | demo 录像 |

## 1. 前置条件

| 条件 | 验证命令 | 期望 |
|---|---|---|
| macOS（Apple Silicon 或 Intel） | `uname -sm` | `Darwin ...` |
| Kiro Crew 0.8.0.9 或以上，gateway 在跑 | `kirocrew --version`；`kirocrew status` | `kirocrew 0.8.0.9`；显示运行中 |
| kiro-cli 已登录 | `kiro-cli whoami` | 显示登录身份 |
| git | `git --version` | 有版本号 |
| **node 22 或以上**（测试墙要用，见排错 E6） | `/opt/homebrew/bin/node --version`，或 `node --version` | `v22.x` 或更高 |
| npm（构建 app 页面） | `npm --version` | 有版本号 |

没装 Kiro Crew 时：

```bash
curl -fsSL https://download.crew.kiro.dev/cli.sh | sh
kiro-cli login
kirocrew doctor
```

## 2. 安装「多 Agent 团队」app

```bash
cd apps/kirocrew-team
NODE_BIN="$(dirname "$(command -v node)")" scripts/dev-install.sh
```

这个脚本会：检查并构建页面 → 装进本机 Kiro Crew → **只给这个 app 授信** → 启用。【人工】运行前确认你同意给它授信（app 的后端跑在 Crew 网关进程里，见第 6 节）。

验证：

```bash
scripts/kcapi.sh GET /api/apps/kirocrew-team/health   # 期望 {"ok": true, "started": true}
scripts/kcapi.sh GET /api/apps/kirocrew-team/probe    # 期望 test_node 指向 node 22 以上
```

Kiro Crew 侧栏的 Apps 下出现「多 Agent 团队」，打开不报错。

可选：AI-DLC Studio（官方 AI-DLC 引擎的 Crew 控制台，第三幕可以展示）需要 Bun；按它自己的 README 安装。

## 3. L1 演示复现

### 3.1 打开 Private IM

| 项 | 值 |
|---|---|
| 网页 | `TODO`（重新部署后的 CloudFront 地址；浏览器认证密码单独发，不写进本文） |
| 安卓包 | `TODO`（下载地址） |
| 演示账号 | `TODO`（密码单独发） |

验证：浏览器和手机都能打开、登录、在群里收发消息。

### 3.2 回放接手运行

`TODO`（运行结束后补：运行记录在 Crew 给 app 的数据目录 `runs/<运行号>/`，含 `run.json` 和 `events.jsonl`；写清楚怎么拷到复现者的机器、怎么在看板上选中它）

看板操作：顶部选择运行；「投影」全屏大字；点任一角色只看这个角色；「跟随」自动跟最活跃的泳道。

### 3.3 按脚本走一遍

按 `03-Demo演示脚本.md` 第一部分第 4 节"开场前准备"打开页面，然后按第二部分逐段演。

## 4. L2 完整复现：重新接手一次

1. **准备源目录**（不改原仓库）：

   ```bash
   takeover/prepare-source.sh <冻结的提交号> <Private IM 本地克隆的路径>
   ```

   它会取这个提交里的文件，叠加 `spec-pack/aidlc/` 和 `spec-pack/tests/enterprise/`，跑一遍检查存为接手前基线。
   验证：输出里 `ℹ tests 10`，大部分是 ✖（接手前本来就不满足）；最后一行给出源目录路径。

2. **发起运行**：

   ```bash
   takeover/start-run.sh ~/workplace/kirocrew-team/sources/private-im-<短提交号>
   ```

   需求原文在 `takeover/requirement.md`。团队配置是 `apps/kirocrew-team/team/team-im.json`：架构师 → 产品经理 ∥ 体验设计 ∥ 合规与安全 → 测试 → 后端 ∥ 网页前端 ∥ 安卓 ∥ 运维 → 评审。

3. 【人工】**批准开工**：每个角色开工时，Kiro Crew 会弹出审批，人点批准。运行会花 credits。

4. **看板上看**：测试墙先红；实现角色合入后，失败的检查按文件名自动打回给负责的角色；最后评审给出"可以交付"或"要改"。

5. **结果在哪**：`~/workplace/kirocrew-team/runs/<运行号>/repo`，分支 `team/<运行号>/run`。交给负责部署的人重新部署网页和安卓包，然后在手机上试用补上的功能。

## 5. 排错

| 编号 | 现象 | 原因 | 处理 |
|---|---|---|---|
| E1 | 「发现」里显示 0 个 app，或从应用源安装失败 | Crew 匿名克隆 GitHub，会去掉代理环境变量、忽略全局 git 配置 | 让 Crew 能直接访问 GitHub（换网络或开 VPN 全局 / TUN 模式）。本 demo 的 app 用第 2 节本地安装，不依赖应用源 |
| E2 | 公司网络下 IM 打不开或消息收不到 | 公司 VPN 拦截出站的非标准端口 | 确认用的是 CloudFront 的 https 地址（只走 443）；或换手机蜂窝网络 |
| E3 | 角色一直不开工 | 在等人批准 | 【人工】到 Kiro Crew 的审批处点批准 |
| E3b | 角色一开工就失败：`spawn rejected: no surface could show the approval prompt` | 开工那一刻没有打开的 Kiro Crew 界面能显示审批框，Crew 直接拒绝（没有花 credits） | 【人工】先打开 Kiro Crew 桌面 app 或浏览器里的 dashboard，并在整个运行期间保持打开；再在看板上点「重试」或重新发起 |
| E4 | 某个角色 agent 没注册上 | Crew 0.8.0.8 会拒绝提示词里含 `{全大写变量}` 占位符的 agent | 查 gateway 日志里的 `unresolved placeholder` |
| E5 | 演示时出现个人会话或记忆 | app 装在了日常使用的 Crew 实例里 | 用独立实例：`infra/local-crew/start.sh`（端口 5477） |
| E6 | 测试墙上每个文件都显示"跑不起来"，信息里有 `bad option: --test-force-exit` | 网关找到的 node 低于 22 | 装 node 22 以上（Homebrew 的 `/opt/homebrew/bin/node` 会被优先选用），或在启动 gateway 前设 `KIROCREW_TEAM_NODE=<node 路径>`；重装 app 后用 `/probe` 确认 `test_node` |
| E7 | 手动跑 `node --test tests/` 报 `Cannot find module .../tests` | Node 22 起 `--test` 不再接受目录参数 | 用 `node tests/enterprise/_run.cjs` |
| E8 | 角色一开工没多久就失败：`turn_limit:100` | 本机 Crew 配置 `agent.subagent_max_turns` 是 100 | `team-im.json` 的 `defaults.max_turns` 已设为 300，按角色覆盖，不用改 Crew 设置 |
| E9 | 角色排队很久后失败：`never started: waiting for memory` | macOS 内存压力到"警告"级时，Crew 只要还有 agent 在跑就不让新的开工，等半小时放弃 | 运行前关掉不用的应用（尤其是会拉起 Java 语言服务和 Gradle 的 IDE 窗口），必要时重启；`sysctl kern.memorystatus_vm_pressure_level` 为 1 再开跑 |
| E10 | 评审意见在中间断掉 | Crew 只保留结果的前 3000 字（`agent.completion_keep_chars`） | 评审的任务说明已要求回复控制在 2500 字以内 |

## 6. 已知限制（对外讲时注意）

- 模型推理只走 Kiro 服务，不能直接接客户自己的 Bedrock。
- app 的后端运行在 Crew 网关进程内，与网关同权限，没有沙箱。
- 越界写是事后检查（看板标红，并要求恢复），不在运行时拦截。
- 接手运行里服务端和安卓没有编译，检查以静态为主；功能靠评审和部署后的人工试用确认。
- Private IM 的底座是开源 IM 唐僧叨叨（Apache-2.0，许可和第三方声明保留在仓库里）；demo 讲的是接手前后。被问到出处时如实回答（`03-Demo演示脚本.md`"常见追问"）。
