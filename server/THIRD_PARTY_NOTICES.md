# 第三方声明

本服务在以下开源项目的基础上修改和扩展，原项目的版权与许可声明按许可证要求保留。

| 组件 | 用途 | 许可证 | 来源 |
|---|---|---|---|
| TangSengDaoDaoServer | 业务服务的初始代码；我们在此基础上新增了朋友圈模块、S3 存储后端，并修改了品牌、默认头像、事件重试、搜索降级、短信等逻辑 | Apache-2.0（见 `LICENSE`） | https://github.com/TangSengDaoDao/TangSengDaoDaoServer |
| WuKongIM | IM 网关（运行时组件，独立部署，未修改） | Apache-2.0 | https://github.com/WuKongIM/WuKongIM |

其余 Go 依赖见 `go.mod`，它们的许可证随各自的模块分发。
