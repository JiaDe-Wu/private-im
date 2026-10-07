package moment

import (
	"github.com/TangSengDaoDao/TangSengDaoDaoServerLib/config"
)

// relation 某个用户视角下的关系快照，一次请求内复用，避免逐条查库
type relation struct {
	uid     string
	friends map[string]bool // 互为好友
	blocked map[string]bool // 任一方向拉黑
}

func (m *Moment) loadRelation(uid string) (*relation, error) {
	friendUIDs, err := m.db.queryMutualFriendUIDs(uid)
	if err != nil {
		return nil, err
	}
	blockUIDs, err := m.db.queryBlacklistPeers(uid)
	if err != nil {
		return nil, err
	}
	r := &relation{uid: uid, friends: make(map[string]bool, len(friendUIDs)), blocked: make(map[string]bool, len(blockUIDs))}
	for _, u := range friendUIDs {
		r.friends[u] = true
	}
	for _, u := range blockUIDs {
		r.blocked[u] = true
	}
	return r, nil
}

// isFriend 互为好友且没有拉黑
func (r *relation) isFriend(uid string) bool {
	return r.friends[uid] && !r.blocked[uid]
}

// canSeeMoment 动态对当前用户是否可见：自己的都可见；别人的须互为好友且非仅自己可见
func (r *relation) canSeeMoment(mm *momentModel) bool {
	if mm.UID == r.uid {
		return true
	}
	return mm.PrivacyType == PrivacyFriends && r.isFriend(mm.UID)
}

// canSeeUser 互动（点赞/评论）对当前用户是否可见：只看得到自己、作者和自己好友的互动（共同好友规则）
func (r *relation) canSeeUser(uid string, author string) bool {
	return uid == r.uid || uid == author || r.isFriend(uid)
}

// systemUIDs 不参与朋友圈的系统账号
func systemUIDs(cfg *config.Config) map[string]bool {
	return map[string]bool{
		cfg.Account.SystemUID:     true,
		cfg.Account.FileHelperUID: true,
		cfg.Account.AdminUID:      true,
	}
}

// ---------- 响应 ----------

type imageResp struct {
	URL    string `json:"url"`
	Width  int    `json:"width"`
	Height int    `json:"height"`
}

type userBrief struct {
	UID  string `json:"uid"`
	Name string `json:"name"`
}

type commentResp struct {
	ID        int64  `json:"id"`
	UID       string `json:"uid"`
	Name      string `json:"name"`
	Content   string `json:"content"`
	ReplyUID  string `json:"reply_uid,omitempty"`
	ReplyName string `json:"reply_name,omitempty"`
	CreatedAt int64  `json:"created_at"`
}

type momentResp struct {
	MomentNo    string         `json:"moment_no"`
	UID         string         `json:"uid"`
	Name        string         `json:"name"`
	Content     string         `json:"content"`
	PrivacyType int            `json:"privacy_type"`
	Imgs        []imageResp    `json:"imgs"`
	Likes       []userBrief    `json:"likes"`
	Comments    []*commentResp `json:"comments"`
	Liked       bool           `json:"liked"`
	CreatedAt   int64          `json:"created_at"`
	Cursor      int64          `json:"cursor"` // 翻页游标：下一页传 before=最后一条的 cursor
}

type listResp struct {
	List       []*momentResp `json:"list"`
	NextCursor int64         `json:"next_cursor"` // 0 表示没有更多
}

// assemble 组装动态列表：附带图片、点赞与评论，并按当前用户的关系过滤互动
func (m *Moment) assemble(r *relation, moments []*momentModel) ([]*momentResp, error) {
	result := make([]*momentResp, 0, len(moments))
	if len(moments) == 0 {
		return result, nil
	}
	nos := make([]string, 0, len(moments))
	for _, mm := range moments {
		nos = append(nos, mm.MomentNo)
	}
	medias, err := m.db.queryMediasWithNos(nos)
	if err != nil {
		return nil, err
	}
	likes, err := m.db.queryLikesWithNos(nos)
	if err != nil {
		return nil, err
	}
	comments, err := m.db.queryCommentsWithNos(nos)
	if err != nil {
		return nil, err
	}

	mediaMap := map[string][]imageResp{}
	for _, md := range medias {
		mediaMap[md.MomentNo] = append(mediaMap[md.MomentNo], imageResp{URL: md.URL, Width: md.Width, Height: md.Height})
	}

	authorOf := map[string]string{}
	uidSet := map[string]bool{}
	for _, mm := range moments {
		authorOf[mm.MomentNo] = mm.UID
		uidSet[mm.UID] = true
	}
	likeMap := map[string][]*likeModel{}
	for _, lk := range likes {
		if r.canSeeUser(lk.UID, authorOf[lk.MomentNo]) {
			likeMap[lk.MomentNo] = append(likeMap[lk.MomentNo], lk)
			uidSet[lk.UID] = true
		}
	}
	commentMap := map[string][]*commentModel{}
	for _, cm := range comments {
		author := authorOf[cm.MomentNo]
		// 评论者与被回复者都须对当前用户可见，否则整条隐藏
		if !r.canSeeUser(cm.UID, author) || (cm.ReplyUID != "" && !r.canSeeUser(cm.ReplyUID, author)) {
			continue
		}
		commentMap[cm.MomentNo] = append(commentMap[cm.MomentNo], cm)
		uidSet[cm.UID] = true
		if cm.ReplyUID != "" {
			uidSet[cm.ReplyUID] = true
		}
	}

	names, err := m.userNames(uidSet)
	if err != nil {
		return nil, err
	}

	for _, mm := range moments {
		resp := &momentResp{
			MomentNo:    mm.MomentNo,
			UID:         mm.UID,
			Name:        names[mm.UID],
			Content:     mm.Content,
			PrivacyType: mm.PrivacyType,
			Imgs:        mediaMap[mm.MomentNo],
			Likes:       make([]userBrief, 0),
			Comments:    make([]*commentResp, 0),
			CreatedAt:   mm.CreatedUnix,
			Cursor:      mm.Id,
		}
		if resp.Imgs == nil {
			resp.Imgs = make([]imageResp, 0)
		}
		for _, lk := range likeMap[mm.MomentNo] {
			resp.Likes = append(resp.Likes, userBrief{UID: lk.UID, Name: names[lk.UID]})
			if lk.UID == r.uid {
				resp.Liked = true
			}
		}
		for _, cm := range commentMap[mm.MomentNo] {
			resp.Comments = append(resp.Comments, &commentResp{
				ID:        cm.Id,
				UID:       cm.UID,
				Name:      names[cm.UID],
				Content:   cm.Content,
				ReplyUID:  cm.ReplyUID,
				ReplyName: names[cm.ReplyUID],
				CreatedAt: cm.CreatedUnix,
			})
		}
		result = append(result, resp)
	}
	return result, nil
}

func (m *Moment) userNames(uidSet map[string]bool) (map[string]string, error) {
	names := map[string]string{}
	if len(uidSet) == 0 {
		return names, nil
	}
	uids := make([]string, 0, len(uidSet))
	for u := range uidSet {
		uids = append(uids, u)
	}
	users, err := m.userService.GetUsers(uids)
	if err != nil {
		return nil, err
	}
	for _, u := range users {
		names[u.UID] = u.Name
	}
	return names, nil
}
