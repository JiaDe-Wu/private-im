package moment

// 可见范围
const (
	PrivacyFriends = 0 // 好友可见
	PrivacyPrivate = 1 // 仅自己可见
)

// 互动类型（与 iOS 客户端 momentMsg 约定一致）
const (
	ActionPublish = "publish"
	ActionLike    = "like"
	ActionComment = "comment"
)

// CMDMomentMsg 朋友圈命令消息，官方客户端已约定该名称
const CMDMomentMsg = "momentMsg"

const (
	maxContentLength = 2000 // 动态文字上限（字符）
	maxCommentLength = 500  // 评论文字上限（字符）
	maxImages        = 9
	defaultPageSize  = 20
	maxPageSize      = 50
	unreadPreviewMax = 99 // 新动态红点最多统计的条数
)
