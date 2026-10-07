# 朋友圈接口

业务服务模块 `modules/moment`。所有接口都在 `/v1/moments` 下，需要登录：请求头带上 `token`。

时间字段都是 Unix 秒。图片 `url` 是相对路径（如 `file/preview/moment/{uid}/xxx.jpg`），客户端拼上接口地址访问，服务端会 302 跳转到短期签名 URL。

## 数据结构

```jsonc
// Moment 动态
{
  "moment_no": "ef245cc8…",          // 动态编号
  "uid": "891d2d…", "name": "产品经理 Ada",
  "content": "今晚请大家喝奶茶",
  "privacy_type": 0,                 // 0 好友可见，1 仅自己可见
  "imgs": [{ "url": "file/preview/moment/…/a.jpg", "width": 1200, "height": 800 }],
  "likes": [{ "uid": "…", "name": "测试 Dora" }],
  "comments": [{
    "id": 12, "uid": "…", "name": "设计 Eve", "content": "我要三分糖",
    "reply_uid": "…", "reply_name": "产品经理 Ada",   // 回复某条评论时才有
    "created_at": 1791380000
  }],
  "liked": true,                     // 当前用户是否点过赞
  "created_at": 1791380000,
  "cursor": 1791380000123            // 翻页游标
}
```

列表接口统一返回 `{ "list": [...], "next_cursor": 123 }`。`next_cursor` 为 0 表示没有更多数据；下一页请求时传 `before=next_cursor`。

## 接口列表

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/moments` | 发布动态 |
| GET | `/moments?before=&limit=` | 好友时间线（含自己），`limit` 默认 20、最大 50 |
| GET | `/moments/user/{uid}?before=&limit=` | 某人的动态。非好友返回空列表 |
| GET | `/moments/{moment_no}` | 动态详情 |
| DELETE | `/moments/{moment_no}` | 删除自己的动态 |
| PUT | `/moments/{moment_no}/like` | 点赞 |
| DELETE | `/moments/{moment_no}/like` | 取消点赞 |
| POST | `/moments/{moment_no}/comments` | 评论或回复 |
| DELETE | `/moments/{moment_no}/comments/{comment_id}` | 删除评论（评论者本人或动态作者） |
| GET | `/moments/unread` | 好友新动态数：`{ "count": 3, "latest_uid": "…" }` |
| PUT | `/moments/read` | 标记时间线已读 |
| GET | `/moments/notices?before=&limit=` | 与我相关（赞、评论、回复） |
| GET | `/moments/notices/unread` | 与我相关的未读数：`{ "count": 2 }` |
| PUT | `/moments/notices/read` | 标记与我相关已读 |
| GET | `/moments/setting?uid=` | 朋友圈设置（封面）：`{ "uid": "…", "cover": "…" }` |
| PUT | `/moments/setting/cover` | 修改封面：`{ "cover": "file/preview/momentcover/…" }` |

### 发布

```http
POST /v1/moments
{ "content": "今晚请大家喝奶茶", "imgs": [{ "url": "file/preview/moment/…/a.jpg", "width": 1200, "height": 800 }], "privacy_type": 0 }
→ { "moment_no": "ef245cc8…" }
```

- 文字和图片至少要有一项；文字最多 2000 字，图片最多 9 张。
- 图片先上传：`GET /v1/file/upload?type=moment&path=/{自己的uid}/{随机名}.jpg` 获取上传地址，再以 multipart 方式上传（字段名 `file`），用返回的 `path` 作为 `url`。

### 评论

```http
POST /v1/moments/{moment_no}/comments
{ "content": "我要三分糖", "reply_comment_id": 0 }      // 回复某条评论时填它的 id
→ Comment 对象
```

评论最多 500 字。

## 可见性规则

| 场景 | 规则 |
|---|---|
| 时间线 | 只包含发布时是好友、且当前仍是好友的人的动态；被拉黑后不可见 |
| 仅自己可见 | 不扩散到任何人的时间线，只有作者能看到 |
| 点赞、评论 | 只显示**与当前用户也是好友**的人的点赞和评论（共同好友规则） |
| 删除好友 | 双方时间线里对方的动态会被清理 |

## 实时提醒（命令消息 `momentMsg`）

业务服务通过 IM 网关给相关用户下发命令消息 `cmd = "momentMsg"`，客户端收到后刷新红点和列表。

| `action` | 触发 | 接收方 | 参数 |
|---|---|---|---|
| `publish` | 好友发布了动态 | 作者的所有可见好友 | `uid`、`moment_no` |
| `like` | 有人点赞 | 动态作者 | `uid`、`name`、`moment_no`、`content`（动态摘要）、`action_at` |
| `comment` | 有人评论或回复 | 动态作者；被回复的人（如果和回复者是好友） | 同上，另有 `comment` |

## 数据表

| 表 | 说明 |
|---|---|
| `moment` | 动态主表 |
| `moment_media` | 动态图片 |
| `moment_feed` | 时间线（写扩散：每个可见好友一行） |
| `moment_like`、`moment_comment` | 点赞、评论 |
| `moment_notice` | 与我相关的提醒 |
| `moment_setting` | 封面等个人设置 |

迁移脚本：`modules/moment/sql/moment-202610061400-01.sql`。接口测试：`devenv/seed/test_moments.py`（44 项）。
