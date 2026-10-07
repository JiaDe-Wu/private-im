-- +migrate Up

-- ########## 朋友圈动态 ##########
create table IF NOT EXISTS `moment`
(
    id           bigint       PRIMARY KEY AUTO_INCREMENT,
    moment_no    VARCHAR(40)  not null DEFAULT '' comment '动态编号',
    uid          VARCHAR(40)  not null DEFAULT '' comment '发布者',
    content      TEXT         comment '文字内容',
    privacy_type smallint     not null DEFAULT 0 comment '可见范围 0.好友可见 1.仅自己可见',
    is_deleted   smallint     not null DEFAULT 0 comment '是否已删除',
    created_at   timeStamp    not null DEFAULT CURRENT_TIMESTAMP,
    updated_at   timeStamp    not null DEFAULT CURRENT_TIMESTAMP
) CHARACTER SET utf8mb4;
CREATE UNIQUE INDEX moment_no_udx on `moment` (moment_no);
CREATE INDEX moment_uid_idx on `moment` (uid, id);

-- ########## 动态图片 ##########
create table IF NOT EXISTS `moment_media`
(
    id         bigint       PRIMARY KEY AUTO_INCREMENT,
    moment_no  VARCHAR(40)  not null DEFAULT '' comment '动态编号',
    url        VARCHAR(500) not null DEFAULT '' comment '图片地址',
    width      integer      not null DEFAULT 0 comment '宽（像素）',
    height     integer      not null DEFAULT 0 comment '高（像素）',
    sort       smallint     not null DEFAULT 0 comment '顺序',
    created_at timeStamp    not null DEFAULT CURRENT_TIMESTAMP
) CHARACTER SET utf8mb4;
CREATE INDEX moment_media_no_idx on `moment_media` (moment_no);

-- ########## 点赞 ##########
create table IF NOT EXISTS `moment_like`
(
    id         bigint      PRIMARY KEY AUTO_INCREMENT,
    moment_no  VARCHAR(40) not null DEFAULT '' comment '动态编号',
    uid        VARCHAR(40) not null DEFAULT '' comment '点赞者',
    created_at timeStamp   not null DEFAULT CURRENT_TIMESTAMP
) CHARACTER SET utf8mb4;
CREATE UNIQUE INDEX moment_like_udx on `moment_like` (moment_no, uid);

-- ########## 评论 ##########
create table IF NOT EXISTS `moment_comment`
(
    id               bigint        PRIMARY KEY AUTO_INCREMENT,
    moment_no        VARCHAR(40)   not null DEFAULT '' comment '动态编号',
    uid              VARCHAR(40)   not null DEFAULT '' comment '评论者',
    content          VARCHAR(1000) not null DEFAULT '' comment '评论内容',
    reply_comment_id bigint        not null DEFAULT 0 comment '回复的评论ID，0 表示直接评论动态',
    reply_uid        VARCHAR(40)   not null DEFAULT '' comment '被回复者',
    is_deleted       smallint      not null DEFAULT 0 comment '是否已删除',
    created_at       timeStamp     not null DEFAULT CURRENT_TIMESTAMP,
    updated_at       timeStamp     not null DEFAULT CURRENT_TIMESTAMP
) CHARACTER SET utf8mb4;
CREATE INDEX moment_comment_no_idx on `moment_comment` (moment_no, id);

-- ########## 时间线（写扩散收件箱） ##########
create table IF NOT EXISTS `moment_feed`
(
    id         bigint      PRIMARY KEY AUTO_INCREMENT,
    uid        VARCHAR(40) not null DEFAULT '' comment '时间线所属用户',
    moment_id  bigint      not null DEFAULT 0 comment '动态自增ID，用于按发布先后排序与游标分页',
    moment_no  VARCHAR(40) not null DEFAULT '' comment '动态编号',
    author_uid VARCHAR(40) not null DEFAULT '' comment '动态发布者',
    created_at timeStamp   not null DEFAULT CURRENT_TIMESTAMP
) CHARACTER SET utf8mb4;
CREATE UNIQUE INDEX moment_feed_udx on `moment_feed` (uid, moment_id);
CREATE INDEX moment_feed_author_idx on `moment_feed` (uid, author_uid);
CREATE INDEX moment_feed_no_idx on `moment_feed` (moment_no);

-- ########## 与我相关（点赞/评论提醒） ##########
create table IF NOT EXISTS `moment_notice`
(
    id             bigint        PRIMARY KEY AUTO_INCREMENT,
    uid            VARCHAR(40)   not null DEFAULT '' comment '接收者',
    moment_no      VARCHAR(40)   not null DEFAULT '' comment '动态编号',
    from_uid       VARCHAR(40)   not null DEFAULT '' comment '触发者',
    action         VARCHAR(20)   not null DEFAULT '' comment 'like 或 comment',
    comment_id     bigint        not null DEFAULT 0 comment '评论ID（action=comment 时）',
    content        VARCHAR(1000) not null DEFAULT '' comment '评论内容快照',
    is_deleted     smallint      not null DEFAULT 0 comment '取消点赞/删除评论后置为 1',
    created_at     timeStamp     not null DEFAULT CURRENT_TIMESTAMP
) CHARACTER SET utf8mb4;
CREATE INDEX moment_notice_uid_idx on `moment_notice` (uid, id);
CREATE INDEX moment_notice_src_idx on `moment_notice` (moment_no, from_uid, action);

-- ########## 用户朋友圈设置与已读状态 ##########
create table IF NOT EXISTS `moment_setting`
(
    id             bigint       PRIMARY KEY AUTO_INCREMENT,
    uid            VARCHAR(40)  not null DEFAULT '' comment '用户',
    cover          VARCHAR(500) not null DEFAULT '' comment '朋友圈封面',
    feed_read_id   bigint       not null DEFAULT 0 comment '时间线已读到的 moment_id（新动态红点）',
    notice_read_id bigint       not null DEFAULT 0 comment '与我相关已读到的 notice id',
    created_at     timeStamp    not null DEFAULT CURRENT_TIMESTAMP,
    updated_at     timeStamp    not null DEFAULT CURRENT_TIMESTAMP
) CHARACTER SET utf8mb4;
CREATE UNIQUE INDEX moment_setting_uid_udx on `moment_setting` (uid);
