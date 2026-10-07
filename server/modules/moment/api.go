package moment

import (
	"errors"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/TangSengDaoDao/TangSengDaoDaoServer/modules/base/event"
	"github.com/TangSengDaoDao/TangSengDaoDaoServer/modules/user"
	"github.com/TangSengDaoDao/TangSengDaoDaoServerLib/common"
	"github.com/TangSengDaoDao/TangSengDaoDaoServerLib/config"
	"github.com/TangSengDaoDao/TangSengDaoDaoServerLib/pkg/log"
	"github.com/TangSengDaoDao/TangSengDaoDaoServerLib/pkg/util"
	"github.com/TangSengDaoDao/TangSengDaoDaoServerLib/pkg/wkevent"
	"github.com/TangSengDaoDao/TangSengDaoDaoServerLib/pkg/wkhttp"
	"go.uber.org/zap"
)

// Moment 朋友圈
type Moment struct {
	ctx *config.Context
	log.Log
	db          *db
	userService user.IService
}

// New 创建朋友圈模块
func New(ctx *config.Context) *Moment {
	m := &Moment{
		ctx:         ctx,
		Log:         log.NewTLog("Moment"),
		db:          newDB(ctx),
		userService: user.NewService(ctx),
	}
	ctx.AddEventListener(event.FriendDelete, m.handleFriendDelete)
	return m
}

// Route 路由
func (m *Moment) Route(r *wkhttp.WKHttp) {
	auth := r.Group("/v1/moments", m.ctx.AuthMiddleware(r))
	{
		auth.POST("", m.publish)                                         // 发布动态
		auth.GET("", m.timeline)                                         // 好友时间线
		auth.GET("/unread", m.feedUnread)                                // 新动态红点
		auth.PUT("/read", m.feedRead)                                    // 标记时间线已读
		auth.GET("/user/:uid", m.userMoments)                            // 某人的动态
		auth.GET("/notices", m.notices)                                  // 与我相关
		auth.GET("/notices/unread", m.noticeUnread)                      // 与我相关未读数
		auth.PUT("/notices/read", m.noticeRead)                          // 标记与我相关已读
		auth.GET("/setting", m.getSetting)                               // 我的朋友圈设置（封面）
		auth.PUT("/setting/cover", m.updateCover)                        // 修改封面
		auth.GET("/:moment_no", m.detail)                                // 动态详情
		auth.DELETE("/:moment_no", m.delete)                             // 删除动态
		auth.PUT("/:moment_no/like", m.like)                             // 点赞
		auth.DELETE("/:moment_no/like", m.unlike)                        // 取消点赞
		auth.POST("/:moment_no/comments", m.comment)                     // 评论 / 回复
		auth.DELETE("/:moment_no/comments/:comment_id", m.deleteComment) // 删除评论
	}
}

// ---------- 发布与查询 ----------

type imageReq struct {
	URL    string `json:"url"`
	Width  int    `json:"width"`
	Height int    `json:"height"`
}

type publishReq struct {
	Content     string     `json:"content"`
	Imgs        []imageReq `json:"imgs"`
	PrivacyType int        `json:"privacy_type"`
}

func (req *publishReq) check() error {
	req.Content = strings.TrimSpace(req.Content)
	if req.Content == "" && len(req.Imgs) == 0 {
		return errors.New("说点什么或选几张图片吧")
	}
	if utf8.RuneCountInString(req.Content) > maxContentLength {
		return errors.New("文字太长了")
	}
	if len(req.Imgs) > maxImages {
		return errors.New("最多 9 张图片")
	}
	for _, img := range req.Imgs {
		if strings.TrimSpace(img.URL) == "" || len(img.URL) > 500 {
			return errors.New("图片地址无效")
		}
	}
	if req.PrivacyType != PrivacyFriends && req.PrivacyType != PrivacyPrivate {
		return errors.New("可见范围无效")
	}
	return nil
}

func (m *Moment) publish(c *wkhttp.Context) {
	loginUID := c.GetLoginUID()
	var req publishReq
	if err := c.BindJSON(&req); err != nil {
		c.ResponseError(errors.New("请求数据格式有误！"))
		return
	}
	if err := req.check(); err != nil {
		c.ResponseError(err)
		return
	}
	momentNo := util.GenerUUID()
	tx, err := m.ctx.DB().Begin()
	if err != nil {
		c.ResponseError(errors.New("开启事务失败"))
		return
	}
	defer tx.RollbackUnlessCommitted()
	momentID, err := m.db.insertMomentTx(&momentModel{MomentNo: momentNo, UID: loginUID, Content: req.Content, PrivacyType: req.PrivacyType}, tx)
	if err != nil {
		m.Error("保存动态失败", zap.Error(err))
		c.ResponseError(errors.New("发布失败"))
		return
	}
	for i, img := range req.Imgs {
		if err = m.db.insertMediaTx(&mediaModel{MomentNo: momentNo, URL: img.URL, Width: img.Width, Height: img.Height, Sort: i}, tx); err != nil {
			m.Error("保存图片失败", zap.Error(err))
			c.ResponseError(errors.New("发布失败"))
			return
		}
	}
	// 自己的时间线同步写入，保证发布后立即可见
	if err = m.db.insertFeedTx(&feedModel{UID: loginUID, MomentID: momentID, MomentNo: momentNo, AuthorUID: loginUID}, tx); err != nil {
		m.Error("写入时间线失败", zap.Error(err))
		c.ResponseError(errors.New("发布失败"))
		return
	}
	// 发布事件（预留给内容审核、搜索等）与动态在同一事务中提交
	eventID, err := m.ctx.EventBegin(&wkevent.Data{
		Event: event.EventUserPublishMoment,
		Type:  wkevent.None,
		Data:  map[string]interface{}{"uid": loginUID, "moment_no": momentNo},
	}, tx)
	if err != nil {
		m.Error("开启发布事件失败", zap.Error(err))
		c.ResponseError(errors.New("发布失败"))
		return
	}
	if err = tx.Commit(); err != nil {
		c.ResponseError(errors.New("发布失败"))
		return
	}
	m.ctx.EventCommit(eventID)

	if req.PrivacyType == PrivacyFriends {
		go m.fanout(loginUID, momentID, momentNo)
	}
	c.Response(map[string]interface{}{"moment_no": momentNo})
}

// fanout 写扩散：把动态写进所有好友的时间线，并推送新动态提醒
func (m *Moment) fanout(authorUID string, momentID int64, momentNo string) {
	defer func() {
		if e := recover(); e != nil {
			m.Error("朋友圈写扩散异常", zap.Any("err", e))
		}
	}()
	friendUIDs, err := m.db.queryMutualFriendUIDs(authorUID)
	if err != nil {
		m.Error("查询好友失败", zap.Error(err))
		return
	}
	skip := systemUIDs(m.ctx.GetConfig())
	feeds := make([]*feedModel, 0, len(friendUIDs))
	receivers := make([]string, 0, len(friendUIDs))
	for _, uid := range friendUIDs {
		if skip[uid] {
			continue
		}
		feeds = append(feeds, &feedModel{UID: uid, MomentID: momentID, MomentNo: momentNo, AuthorUID: authorUID})
		receivers = append(receivers, uid)
	}
	const batch = 500
	for i := 0; i < len(feeds); i += batch {
		end := i + batch
		if end > len(feeds) {
			end = len(feeds)
		}
		if err := m.db.insertFeeds(feeds[i:end]); err != nil {
			m.Error("写入好友时间线失败", zap.Error(err))
			return
		}
	}
	for _, uid := range receivers {
		m.sendCMD(uid, map[string]interface{}{"action": ActionPublish, "uid": authorUID, "moment_no": momentNo})
	}
}

func (m *Moment) sendCMD(toUID string, param map[string]interface{}) {
	err := m.ctx.SendCMD(config.MsgCMDReq{
		CMD:         CMDMomentMsg,
		ChannelID:   toUID,
		ChannelType: common.ChannelTypePerson.Uint8(),
		Param:       param,
	})
	if err != nil {
		m.Warn("发送朋友圈提醒失败", zap.String("to", toUID), zap.Error(err))
	}
}

func pageParams(c *wkhttp.Context) (before int64, limit uint64) {
	before, _ = strconv.ParseInt(c.Query("before"), 10, 64)
	l, _ := strconv.ParseUint(c.Query("limit"), 10, 64)
	if l == 0 {
		l = defaultPageSize
	}
	if l > maxPageSize {
		l = maxPageSize
	}
	return before, l
}

func (m *Moment) timeline(c *wkhttp.Context) {
	loginUID := c.GetLoginUID()
	before, limit := pageParams(c)
	r, err := m.loadRelation(loginUID)
	if err != nil {
		m.Error("加载关系失败", zap.Error(err))
		c.ResponseError(errors.New("加载失败"))
		return
	}
	// 读时校验会过滤掉一部分，最多多取几轮凑满一页
	visible := make([]*momentModel, 0, limit)
	cursor := before
	exhausted := false
	for round := 0; round < 3 && uint64(len(visible)) < limit && !exhausted; round++ {
		feeds, err := m.db.queryFeeds(loginUID, cursor, limit)
		if err != nil {
			m.Error("查询时间线失败", zap.Error(err))
			c.ResponseError(errors.New("加载失败"))
			return
		}
		if uint64(len(feeds)) < limit {
			exhausted = true
		}
		if len(feeds) == 0 {
			break
		}
		cursor = feeds[len(feeds)-1].MomentID
		nos := make([]string, 0, len(feeds))
		for _, f := range feeds {
			nos = append(nos, f.MomentNo)
		}
		moments, err := m.db.queryMomentsWithNos(nos)
		if err != nil {
			c.ResponseError(errors.New("加载失败"))
			return
		}
		byNo := make(map[string]*momentModel, len(moments))
		for _, mm := range moments {
			byNo[mm.MomentNo] = mm
		}
		for _, f := range feeds { // 保持时间线顺序
			if mm := byNo[f.MomentNo]; mm != nil && r.canSeeMoment(mm) && uint64(len(visible)) < limit {
				visible = append(visible, mm)
			}
		}
	}
	m.respondList(c, r, visible, limit, exhausted)
}

func (m *Moment) respondList(c *wkhttp.Context, r *relation, moments []*momentModel, limit uint64, exhausted bool) {
	list, err := m.assemble(r, moments)
	if err != nil {
		m.Error("组装动态失败", zap.Error(err))
		c.ResponseError(errors.New("加载失败"))
		return
	}
	var next int64
	if !exhausted && len(list) > 0 && uint64(len(list)) >= limit {
		next = list[len(list)-1].Cursor
	}
	c.Response(listResp{List: list, NextCursor: next})
}

func (m *Moment) userMoments(c *wkhttp.Context) {
	loginUID := c.GetLoginUID()
	uid := c.Param("uid")
	before, limit := pageParams(c)
	r, err := m.loadRelation(loginUID)
	if err != nil {
		c.ResponseError(errors.New("加载失败"))
		return
	}
	if uid != loginUID && !r.isFriend(uid) {
		c.Response(listResp{List: make([]*momentResp, 0)}) // 非好友看不到任何动态
		return
	}
	moments, err := m.db.queryUserMoments(uid, uid == loginUID, before, limit)
	if err != nil {
		m.Error("查询个人动态失败", zap.Error(err))
		c.ResponseError(errors.New("加载失败"))
		return
	}
	m.respondList(c, r, moments, limit, uint64(len(moments)) < limit)
}

// visibleMoment 取动态并校验当前用户可见，不可见时统一提示不存在，避免泄露
func (m *Moment) visibleMoment(c *wkhttp.Context) (*momentModel, *relation, bool) {
	mm, err := m.db.queryMoment(c.Param("moment_no"))
	if err != nil {
		c.ResponseError(errors.New("查询动态失败"))
		return nil, nil, false
	}
	r, err := m.loadRelation(c.GetLoginUID())
	if err != nil {
		c.ResponseError(errors.New("加载失败"))
		return nil, nil, false
	}
	if mm == nil || !r.canSeeMoment(mm) {
		c.ResponseError(errors.New("动态不存在或已删除"))
		return nil, nil, false
	}
	return mm, r, true
}

func (m *Moment) detail(c *wkhttp.Context) {
	mm, r, ok := m.visibleMoment(c)
	if !ok {
		return
	}
	list, err := m.assemble(r, []*momentModel{mm})
	if err != nil {
		c.ResponseError(errors.New("加载失败"))
		return
	}
	c.Response(list[0])
}

func (m *Moment) delete(c *wkhttp.Context) {
	loginUID := c.GetLoginUID()
	mm, err := m.db.queryMoment(c.Param("moment_no"))
	if err != nil {
		c.ResponseError(errors.New("查询动态失败"))
		return
	}
	if mm == nil {
		c.ResponseOK()
		return
	}
	if mm.UID != loginUID {
		c.ResponseError(errors.New("只能删除自己的动态"))
		return
	}
	tx, err := m.ctx.DB().Begin()
	if err != nil {
		c.ResponseError(errors.New("开启事务失败"))
		return
	}
	defer tx.RollbackUnlessCommitted()
	if err = m.db.deleteMomentTx(mm.MomentNo, tx); err != nil {
		m.Error("删除动态失败", zap.Error(err))
		c.ResponseError(errors.New("删除失败"))
		return
	}
	eventID, err := m.ctx.EventBegin(&wkevent.Data{
		Event: event.EventUserDeleteMoment,
		Type:  wkevent.None,
		Data:  map[string]interface{}{"uid": loginUID, "moment_no": mm.MomentNo},
	}, tx)
	if err != nil {
		c.ResponseError(errors.New("删除失败"))
		return
	}
	if err = tx.Commit(); err != nil {
		c.ResponseError(errors.New("删除失败"))
		return
	}
	m.ctx.EventCommit(eventID)
	c.ResponseOK()
}

// ---------- 点赞与评论 ----------

func (m *Moment) like(c *wkhttp.Context) {
	mm, _, ok := m.visibleMoment(c)
	if !ok {
		return
	}
	loginUID := c.GetLoginUID()
	added, err := m.db.insertLike(mm.MomentNo, loginUID)
	if err != nil {
		m.Error("点赞失败", zap.Error(err))
		c.ResponseError(errors.New("点赞失败"))
		return
	}
	if added {
		m.notifyInteraction(mm, loginUID, c.GetLoginName(), ActionLike, 0, "", "")
	}
	c.ResponseOK()
}

func (m *Moment) unlike(c *wkhttp.Context) {
	momentNo := c.Param("moment_no")
	loginUID := c.GetLoginUID()
	removed, err := m.db.deleteLike(momentNo, loginUID)
	if err != nil {
		c.ResponseError(errors.New("取消点赞失败"))
		return
	}
	if removed {
		if err = m.db.deleteLikeNotices(momentNo, loginUID); err != nil {
			m.Warn("撤回点赞提醒失败", zap.Error(err))
		}
	}
	c.ResponseOK()
}

type commentReq struct {
	Content        string `json:"content"`
	ReplyCommentID int64  `json:"reply_comment_id"`
}

func (m *Moment) comment(c *wkhttp.Context) {
	var req commentReq
	if err := c.BindJSON(&req); err != nil {
		c.ResponseError(errors.New("请求数据格式有误！"))
		return
	}
	req.Content = strings.TrimSpace(req.Content)
	if req.Content == "" {
		c.ResponseError(errors.New("评论内容不能为空"))
		return
	}
	if utf8.RuneCountInString(req.Content) > maxCommentLength {
		c.ResponseError(errors.New("评论太长了"))
		return
	}
	mm, r, ok := m.visibleMoment(c)
	if !ok {
		return
	}
	loginUID := c.GetLoginUID()
	replyUID := ""
	if req.ReplyCommentID > 0 {
		target, err := m.db.queryComment(req.ReplyCommentID)
		if err != nil {
			c.ResponseError(errors.New("查询评论失败"))
			return
		}
		// 只能回复自己看得到的评论
		if target == nil || target.MomentNo != mm.MomentNo || !r.canSeeUser(target.UID, mm.UID) {
			c.ResponseError(errors.New("评论不存在或已删除"))
			return
		}
		if target.UID != loginUID {
			replyUID = target.UID
		}
	}
	commentID, err := m.db.insertComment(&commentModel{
		MomentNo: mm.MomentNo, UID: loginUID, Content: req.Content,
		ReplyCommentID: req.ReplyCommentID, ReplyUID: replyUID,
	})
	if err != nil {
		m.Error("保存评论失败", zap.Error(err))
		c.ResponseError(errors.New("评论失败"))
		return
	}
	loginName := c.GetLoginName()
	m.notifyInteraction(mm, loginUID, loginName, ActionComment, commentID, req.Content, replyUID)

	names, _ := m.userNames(map[string]bool{loginUID: true, replyUID: replyUID != ""})
	c.Response(&commentResp{
		ID: commentID, UID: loginUID, Name: names[loginUID], Content: req.Content,
		ReplyUID: replyUID, ReplyName: names[replyUID], CreatedAt: time.Now().Unix(),
	})
}

func (m *Moment) deleteComment(c *wkhttp.Context) {
	loginUID := c.GetLoginUID()
	commentID, _ := strconv.ParseInt(c.Param("comment_id"), 10, 64)
	cm, err := m.db.queryComment(commentID)
	if err != nil {
		c.ResponseError(errors.New("查询评论失败"))
		return
	}
	if cm == nil || cm.MomentNo != c.Param("moment_no") {
		c.ResponseOK()
		return
	}
	// 评论者本人或动态作者可以删除
	if cm.UID != loginUID {
		mm, err := m.db.queryMoment(cm.MomentNo)
		if err != nil || mm == nil || mm.UID != loginUID {
			c.ResponseError(errors.New("无权删除该评论"))
			return
		}
	}
	if err = m.db.deleteComment(commentID); err != nil {
		c.ResponseError(errors.New("删除失败"))
		return
	}
	if err = m.db.deleteCommentNotices(commentID); err != nil {
		m.Warn("撤回评论提醒失败", zap.Error(err))
	}
	c.ResponseOK()
}

// notifyInteraction 点赞/评论提醒：作者、被回复者，以及参与过这条动态的人；
// 接收者必须能看到这次互动（是作者本人，或与互动者互为好友），与微信规则一致
func (m *Moment) notifyInteraction(mm *momentModel, actorUID, actorName, action string, commentID int64, content, replyUID string) {
	actorRel, err := m.loadRelation(actorUID)
	if err != nil {
		m.Error("加载关系失败", zap.Error(err))
		return
	}
	authorRel, err := m.loadRelation(mm.UID)
	if err != nil {
		m.Error("加载关系失败", zap.Error(err))
		return
	}
	// 回复时接收者还须看得到被回复者，否则会通过提醒泄露对方的评论
	var replyRel *relation
	if replyUID != "" {
		if replyRel, err = m.loadRelation(replyUID); err != nil {
			m.Error("加载关系失败", zap.Error(err))
			return
		}
	}
	participants, err := m.db.queryParticipants(mm.MomentNo)
	if err != nil {
		m.Error("查询参与者失败", zap.Error(err))
		return
	}
	candidates := append([]string{mm.UID, replyUID}, participants...)
	seen := map[string]bool{}
	notices := make([]*noticeModel, 0)
	receivers := make([]string, 0)
	for _, uid := range candidates {
		if uid == "" || uid == actorUID || seen[uid] {
			continue
		}
		seen[uid] = true
		canSeeMoment := uid == mm.UID || authorRel.isFriend(uid)
		canSeeActor := uid == mm.UID || actorRel.isFriend(uid)
		canSeeReply := replyRel == nil || uid == replyUID || uid == mm.UID || replyRel.isFriend(uid)
		if !canSeeMoment || !canSeeActor || !canSeeReply {
			continue
		}
		notices = append(notices, &noticeModel{UID: uid, MomentNo: mm.MomentNo, FromUID: actorUID, Action: action, CommentID: commentID, Content: content})
		receivers = append(receivers, uid)
	}
	if err = m.db.insertNotices(notices); err != nil {
		m.Error("保存提醒失败", zap.Error(err))
		return
	}
	snippet := []rune(mm.Content)
	if len(snippet) > 50 {
		snippet = snippet[:50]
	}
	for _, uid := range receivers {
		m.sendCMD(uid, map[string]interface{}{
			"action":    action,
			"action_at": time.Now().Unix(),
			"uid":       actorUID,
			"name":      actorName,
			"moment_no": mm.MomentNo,
			"content":   string(snippet),
			"comment":   content,
		})
	}
}

// ---------- 红点、与我相关、设置 ----------

func (m *Moment) feedUnread(c *wkhttp.Context) {
	loginUID := c.GetLoginUID()
	setting, err := m.db.querySetting(loginUID)
	if err != nil {
		c.ResponseError(errors.New("查询失败"))
		return
	}
	var readID int64
	if setting != nil {
		readID = setting.FeedReadID
	}
	feeds, err := m.db.queryUnreadFeeds(loginUID, readID, unreadPreviewMax)
	if err != nil {
		c.ResponseError(errors.New("查询失败"))
		return
	}
	r, err := m.loadRelation(loginUID)
	if err != nil {
		c.ResponseError(errors.New("查询失败"))
		return
	}
	count := 0
	var latestUID string
	for _, f := range feeds {
		if r.isFriend(f.AuthorUID) {
			if latestUID == "" {
				latestUID = f.AuthorUID // 红点上展示最新发布者头像
			}
			count++
		}
	}
	c.Response(map[string]interface{}{"count": count, "latest_uid": latestUID})
}

func (m *Moment) feedRead(c *wkhttp.Context) {
	loginUID := c.GetLoginUID()
	latest, err := m.db.queryLatestFeedID(loginUID)
	if err == nil {
		err = m.db.markFeedRead(loginUID, latest)
	}
	if err != nil {
		c.ResponseError(errors.New("操作失败"))
		return
	}
	c.ResponseOK()
}

type noticeResp struct {
	ID        int64       `json:"id"`
	MomentNo  string      `json:"moment_no"`
	UID       string      `json:"uid"`
	Name      string      `json:"name"`
	Action    string      `json:"action"`
	Comment   string      `json:"comment"`
	Moment    *noticeMeta `json:"moment"`
	CreatedAt int64       `json:"created_at"`
}

// noticeMeta 提醒里展示的动态缩略信息；动态已删除时为 null
type noticeMeta struct {
	Content string `json:"content"`
	Img     string `json:"img"`
}

func (m *Moment) notices(c *wkhttp.Context) {
	loginUID := c.GetLoginUID()
	before, limit := pageParams(c)
	list, err := m.db.queryNotices(loginUID, before, limit)
	if err != nil {
		c.ResponseError(errors.New("查询失败"))
		return
	}
	uidSet := map[string]bool{}
	noSet := map[string]bool{}
	for _, n := range list {
		uidSet[n.FromUID] = true
		noSet[n.MomentNo] = true
	}
	names, err := m.userNames(uidSet)
	if err != nil {
		c.ResponseError(errors.New("查询失败"))
		return
	}
	nos := make([]string, 0, len(noSet))
	for no := range noSet {
		nos = append(nos, no)
	}
	moments, _ := m.db.queryMomentsWithNos(nos)
	medias, _ := m.db.queryMediasWithNos(nos)
	metas := map[string]*noticeMeta{}
	for _, mm := range moments {
		metas[mm.MomentNo] = &noticeMeta{Content: mm.Content}
	}
	for _, md := range medias {
		if meta := metas[md.MomentNo]; meta != nil && meta.Img == "" {
			meta.Img = md.URL
		}
	}
	resps := make([]*noticeResp, 0, len(list))
	for _, n := range list {
		resps = append(resps, &noticeResp{
			ID: n.Id, MomentNo: n.MomentNo, UID: n.FromUID, Name: names[n.FromUID],
			Action: n.Action, Comment: n.Content, Moment: metas[n.MomentNo], CreatedAt: n.CreatedUnix,
		})
	}
	var next int64
	if uint64(len(list)) >= limit {
		next = list[len(list)-1].Id
	}
	c.Response(map[string]interface{}{"list": resps, "next_cursor": next})
}

func (m *Moment) noticeUnread(c *wkhttp.Context) {
	loginUID := c.GetLoginUID()
	setting, err := m.db.querySetting(loginUID)
	if err != nil {
		c.ResponseError(errors.New("查询失败"))
		return
	}
	var readID int64
	if setting != nil {
		readID = setting.NoticeReadID
	}
	count, err := m.db.queryUnreadNoticeCount(loginUID, readID)
	if err != nil {
		c.ResponseError(errors.New("查询失败"))
		return
	}
	c.Response(map[string]interface{}{"count": count})
}

func (m *Moment) noticeRead(c *wkhttp.Context) {
	loginUID := c.GetLoginUID()
	latest, err := m.db.queryLatestNoticeID(loginUID)
	if err == nil {
		err = m.db.markNoticeRead(loginUID, latest)
	}
	if err != nil {
		c.ResponseError(errors.New("操作失败"))
		return
	}
	c.ResponseOK()
}

func (m *Moment) getSetting(c *wkhttp.Context) {
	uid := c.Query("uid")
	if uid == "" {
		uid = c.GetLoginUID()
	}
	setting, err := m.db.querySetting(uid)
	if err != nil {
		c.ResponseError(errors.New("查询失败"))
		return
	}
	cover := ""
	if setting != nil {
		cover = setting.Cover
	}
	c.Response(map[string]interface{}{"uid": uid, "cover": cover})
}

func (m *Moment) updateCover(c *wkhttp.Context) {
	var req struct {
		Cover string `json:"cover"`
	}
	if err := c.BindJSON(&req); err != nil || len(req.Cover) > 500 {
		c.ResponseError(errors.New("请求数据格式有误！"))
		return
	}
	if err := m.db.upsertSettingField(c.GetLoginUID(), "cover", strings.TrimSpace(req.Cover)); err != nil {
		c.ResponseError(errors.New("保存失败"))
		return
	}
	c.ResponseOK()
}

// ---------- 事件 ----------

// handleFriendDelete 删除好友后清理双方时间线中对方的动态（读时校验已保证不可见，这里只是回收数据）
func (m *Moment) handleFriendDelete(data []byte, commit config.EventCommit) {
	var req struct {
		UID   string `json:"uid"`
		ToUID string `json:"to_uid"`
	}
	if err := util.ReadJsonByByte(data, &req); err != nil {
		m.Error("解析删除好友事件失败", zap.Error(err))
		commit(nil)
		return
	}
	if err := m.db.deleteFeedsBetween(req.UID, req.ToUID); err != nil {
		m.Warn("清理朋友圈时间线失败", zap.Error(err))
	}
	commit(nil) // 清理失败不重试，避免重复触发其他模块的监听
}
