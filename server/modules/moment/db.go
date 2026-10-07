package moment

import (
	"github.com/TangSengDaoDao/TangSengDaoDaoServerLib/config"
	dba "github.com/TangSengDaoDao/TangSengDaoDaoServerLib/pkg/db"
	"github.com/TangSengDaoDao/TangSengDaoDaoServerLib/pkg/util"
	"github.com/gocraft/dbr/v2"
)

type db struct {
	session *dbr.Session
	ctx     *config.Context
}

func newDB(ctx *config.Context) *db {
	return &db{
		ctx:     ctx,
		session: ctx.DB(),
	}
}

// ---------- 动态 ----------

func (d *db) insertMomentTx(m *momentModel, tx *dbr.Tx) (int64, error) {
	result, err := tx.InsertInto("moment").Columns(util.AttrToUnderscore(m)...).Record(m).Exec()
	if err != nil {
		return 0, err
	}
	return result.LastInsertId()
}

func (d *db) insertMediaTx(m *mediaModel, tx *dbr.Tx) error {
	_, err := tx.InsertInto("moment_media").Columns(util.AttrToUnderscore(m)...).Record(m).Exec()
	return err
}

func (d *db) queryMoment(momentNo string) (*momentModel, error) {
	var m *momentModel
	_, err := d.session.Select("*, UNIX_TIMESTAMP(created_at) created_unix").From("moment").Where("moment_no=? and is_deleted=0", momentNo).Load(&m)
	return m, err
}

func (d *db) queryMomentsWithNos(momentNos []string) ([]*momentModel, error) {
	var list []*momentModel
	if len(momentNos) == 0 {
		return list, nil
	}
	_, err := d.session.Select("*, UNIX_TIMESTAMP(created_at) created_unix").From("moment").Where("moment_no in ? and is_deleted=0", momentNos).Load(&list)
	return list, err
}

// queryUserMoments 某人的动态，按发布先后倒序；beforeID>0 时取该 ID 之前的
func (d *db) queryUserMoments(uid string, includePrivate bool, beforeID int64, limit uint64) ([]*momentModel, error) {
	var list []*momentModel
	builder := d.session.Select("*, UNIX_TIMESTAMP(created_at) created_unix").From("moment").Where("uid=? and is_deleted=0", uid)
	if !includePrivate {
		builder = builder.Where("privacy_type=?", PrivacyFriends)
	}
	if beforeID > 0 {
		builder = builder.Where("id<?", beforeID)
	}
	_, err := builder.OrderDir("id", false).Limit(limit).Load(&list)
	return list, err
}

func (d *db) deleteMomentTx(momentNo string, tx *dbr.Tx) error {
	if _, err := tx.Update("moment").Set("is_deleted", 1).Set("updated_at", dbr.Now).Where("moment_no=?", momentNo).Exec(); err != nil {
		return err
	}
	if _, err := tx.DeleteFrom("moment_feed").Where("moment_no=?", momentNo).Exec(); err != nil {
		return err
	}
	_, err := tx.Update("moment_notice").Set("is_deleted", 1).Where("moment_no=?", momentNo).Exec()
	return err
}

func (d *db) queryMediasWithNos(momentNos []string) ([]*mediaModel, error) {
	var list []*mediaModel
	if len(momentNos) == 0 {
		return list, nil
	}
	_, err := d.session.Select("*").From("moment_media").Where("moment_no in ?", momentNos).OrderDir("sort", true).Load(&list)
	return list, err
}

// ---------- 时间线 ----------

func (d *db) insertFeedTx(m *feedModel, tx *dbr.Tx) error {
	_, err := tx.InsertInto("moment_feed").Columns(util.AttrToUnderscore(m)...).Record(m).Exec()
	return err
}

// insertFeeds 批量写入时间线，重复的忽略
func (d *db) insertFeeds(feeds []*feedModel) error {
	if len(feeds) == 0 {
		return nil
	}
	builder := d.session.InsertInto("moment_feed").Ignore().Columns("uid", "moment_id", "moment_no", "author_uid")
	for _, f := range feeds {
		builder = builder.Values(f.UID, f.MomentID, f.MomentNo, f.AuthorUID)
	}
	_, err := builder.Exec()
	return err
}

// queryFeeds 某人的时间线，beforeMomentID>0 时取该动态之前的
func (d *db) queryFeeds(uid string, beforeMomentID int64, limit uint64) ([]*feedModel, error) {
	var list []*feedModel
	builder := d.session.Select("*").From("moment_feed").Where("uid=?", uid)
	if beforeMomentID > 0 {
		builder = builder.Where("moment_id<?", beforeMomentID)
	}
	_, err := builder.OrderDir("moment_id", false).Limit(limit).Load(&list)
	return list, err
}

func (d *db) queryLatestFeedID(uid string) (int64, error) {
	var id int64
	_, err := d.session.Select("IFNULL(MAX(moment_id),0)").From("moment_feed").Where("uid=?", uid).Load(&id)
	return id, err
}

// queryUnreadFeeds 新动态红点：别人发布的、ID 大于已读位置的时间线条目
func (d *db) queryUnreadFeeds(uid string, readID int64, limit uint64) ([]*feedModel, error) {
	var list []*feedModel
	_, err := d.session.Select("*").From("moment_feed").Where("uid=? and author_uid<>? and moment_id>?", uid, uid, readID).
		OrderDir("moment_id", false).Limit(limit).Load(&list)
	return list, err
}

// deleteFeedsBetween 删好友后互相清理时间线
func (d *db) deleteFeedsBetween(uid, toUID string) error {
	_, err := d.session.DeleteFrom("moment_feed").
		Where("(uid=? and author_uid=?) or (uid=? and author_uid=?)", uid, toUID, toUID, uid).Exec()
	return err
}

// ---------- 点赞 ----------

func (d *db) insertLike(momentNo, uid string) (bool, error) {
	result, err := d.session.InsertInto("moment_like").Ignore().Columns("moment_no", "uid").Values(momentNo, uid).Exec()
	if err != nil {
		return false, err
	}
	n, err := result.RowsAffected()
	return n > 0, err
}

func (d *db) deleteLike(momentNo, uid string) (bool, error) {
	result, err := d.session.DeleteFrom("moment_like").Where("moment_no=? and uid=?", momentNo, uid).Exec()
	if err != nil {
		return false, err
	}
	n, err := result.RowsAffected()
	return n > 0, err
}

func (d *db) queryLikesWithNos(momentNos []string) ([]*likeModel, error) {
	var list []*likeModel
	if len(momentNos) == 0 {
		return list, nil
	}
	_, err := d.session.Select("*").From("moment_like").Where("moment_no in ?", momentNos).OrderDir("id", true).Load(&list)
	return list, err
}

// ---------- 评论 ----------

func (d *db) insertComment(m *commentModel) (int64, error) {
	result, err := d.session.InsertInto("moment_comment").Columns(util.AttrToUnderscore(m)...).Record(m).Exec()
	if err != nil {
		return 0, err
	}
	return result.LastInsertId()
}

func (d *db) queryComment(id int64) (*commentModel, error) {
	var m *commentModel
	_, err := d.session.Select("*, UNIX_TIMESTAMP(created_at) created_unix").From("moment_comment").Where("id=? and is_deleted=0", id).Load(&m)
	return m, err
}

func (d *db) deleteComment(id int64) error {
	_, err := d.session.Update("moment_comment").Set("is_deleted", 1).Set("updated_at", dbr.Now).Where("id=?", id).Exec()
	return err
}

func (d *db) queryCommentsWithNos(momentNos []string) ([]*commentModel, error) {
	var list []*commentModel
	if len(momentNos) == 0 {
		return list, nil
	}
	_, err := d.session.Select("*, UNIX_TIMESTAMP(created_at) created_unix").From("moment_comment").Where("moment_no in ? and is_deleted=0", momentNos).OrderDir("id", true).Load(&list)
	return list, err
}

// queryParticipants 参与过某条动态（点赞或评论）的用户
func (d *db) queryParticipants(momentNo string) ([]string, error) {
	var uids []string
	_, err := d.session.SelectBySql("select uid from moment_like where moment_no=? union select uid from moment_comment where moment_no=? and is_deleted=0", momentNo, momentNo).Load(&uids)
	return uids, err
}

// ---------- 与我相关 ----------

func (d *db) insertNotices(notices []*noticeModel) error {
	if len(notices) == 0 {
		return nil
	}
	builder := d.session.InsertInto("moment_notice").Columns("uid", "moment_no", "from_uid", "action", "comment_id", "content")
	for _, n := range notices {
		builder = builder.Values(n.UID, n.MomentNo, n.FromUID, n.Action, n.CommentID, n.Content)
	}
	_, err := builder.Exec()
	return err
}

// deleteLikeNotices 取消点赞时撤回点赞提醒
func (d *db) deleteLikeNotices(momentNo, fromUID string) error {
	_, err := d.session.Update("moment_notice").Set("is_deleted", 1).
		Where("moment_no=? and from_uid=? and action=?", momentNo, fromUID, ActionLike).Exec()
	return err
}

func (d *db) deleteCommentNotices(commentID int64) error {
	_, err := d.session.Update("moment_notice").Set("is_deleted", 1).Where("comment_id=? and action=?", commentID, ActionComment).Exec()
	return err
}

func (d *db) queryNotices(uid string, beforeID int64, limit uint64) ([]*noticeModel, error) {
	var list []*noticeModel
	builder := d.session.Select("*, UNIX_TIMESTAMP(created_at) created_unix").From("moment_notice").Where("uid=? and is_deleted=0", uid)
	if beforeID > 0 {
		builder = builder.Where("id<?", beforeID)
	}
	_, err := builder.OrderDir("id", false).Limit(limit).Load(&list)
	return list, err
}

func (d *db) queryUnreadNoticeCount(uid string, readID int64) (int64, error) {
	var count int64
	_, err := d.session.Select("count(*)").From("moment_notice").Where("uid=? and is_deleted=0 and id>?", uid, readID).Load(&count)
	return count, err
}

func (d *db) queryLatestNoticeID(uid string) (int64, error) {
	var id int64
	_, err := d.session.Select("IFNULL(MAX(id),0)").From("moment_notice").Where("uid=?", uid).Load(&id)
	return id, err
}

// ---------- 设置与已读 ----------

func (d *db) querySetting(uid string) (*settingModel, error) {
	var m *settingModel
	_, err := d.session.Select("*").From("moment_setting").Where("uid=?", uid).Load(&m)
	return m, err
}

// upsertSettingField 更新某个设置字段，记录不存在时自动创建
func (d *db) upsertSettingField(uid string, column string, value interface{}) error {
	_, err := d.session.InsertBySql("insert into moment_setting(uid,"+column+") values(?,?) on duplicate key update "+column+"=values("+column+"),updated_at=now()", uid, value).Exec()
	return err
}

// markFeedRead / markNoticeRead 已读位置只前进不后退
func (d *db) markFeedRead(uid string, readID int64) error {
	_, err := d.session.InsertBySql("insert into moment_setting(uid,feed_read_id) values(?,?) on duplicate key update feed_read_id=GREATEST(feed_read_id,values(feed_read_id)),updated_at=now()", uid, readID).Exec()
	return err
}

func (d *db) markNoticeRead(uid string, readID int64) error {
	_, err := d.session.InsertBySql("insert into moment_setting(uid,notice_read_id) values(?,?) on duplicate key update notice_read_id=GREATEST(notice_read_id,values(notice_read_id)),updated_at=now()", uid, readID).Exec()
	return err
}

func (d *db) querySettingsWithUIDs(uids []string) ([]*settingModel, error) {
	var list []*settingModel
	if len(uids) == 0 {
		return list, nil
	}
	_, err := d.session.Select("*").From("moment_setting").Where("uid in ?", uids).Load(&list)
	return list, err
}

// ---------- 关系（直接读用户模块的表，避免逐个调用产生 N+1 查询） ----------

// queryMutualFriendUIDs 与 uid 互为好友的用户：双方记录均未删除，且对方没有把自己删成单向好友
func (d *db) queryMutualFriendUIDs(uid string) ([]string, error) {
	var uids []string
	_, err := d.session.Select("to_uid").From("friend").Where("uid=? and is_deleted=0 and is_alone=0", uid).Load(&uids)
	return uids, err
}

// queryBlacklistPeers 与 uid 存在拉黑关系的用户（任一方向）
func (d *db) queryBlacklistPeers(uid string) ([]string, error) {
	var uids []string
	_, err := d.session.SelectBySql("select to_uid from user_setting where uid=? and blacklist=1 union select uid from user_setting where to_uid=? and blacklist=1", uid, uid).Load(&uids)
	return uids, err
}

// ---------- 模型 ----------

// unixTime 由数据库换算的 Unix 时间戳。数据库时区与服务进程时区可能不同（如库为 Asia/Shanghai、进程为 UTC），
// 直接解析 timestamp 会偏移，故统一用 UNIX_TIMESTAMP(created_at) 取值。嵌入结构体不会参与 insert 列生成。
type unixTime struct {
	CreatedUnix int64
}

type momentModel struct {
	MomentNo    string
	UID         string
	Content     string
	PrivacyType int
	IsDeleted   int
	unixTime
	dba.BaseModel
}

type mediaModel struct {
	MomentNo string
	URL      string
	Width    int
	Height   int
	Sort     int
	dba.BaseModel
}

type feedModel struct {
	UID       string
	MomentID  int64
	MomentNo  string
	AuthorUID string
	dba.BaseModel
}

type likeModel struct {
	MomentNo string
	UID      string
	dba.BaseModel
}

type commentModel struct {
	MomentNo       string
	UID            string
	Content        string
	ReplyCommentID int64
	ReplyUID       string
	IsDeleted      int
	unixTime
	dba.BaseModel
}

type noticeModel struct {
	UID       string
	MomentNo  string
	FromUID   string
	Action    string
	CommentID int64
	Content   string
	IsDeleted int
	unixTime
	dba.BaseModel
}

type settingModel struct {
	UID          string
	Cover        string
	FeedReadID   int64
	NoticeReadID int64
	dba.BaseModel
}
