-- phpMyAdmin SQL Dump
-- version 4.9.0.1
-- https://www.phpmyadmin.net/
--
-- 主机： localhost
-- 生成日期： 2019-07-16 02:52:23
-- 服务器版本： 8.0.14
-- PHP 版本： 7.1.23

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET AUTOCOMMIT = 0;
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- 数据库： `ifuyun`
--

-- --------------------------------------------------------

--
-- 表的结构 `access_logs`
--

CREATE TABLE `access_logs` (
  `log_id` char(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '' COMMENT 'id',
  `from_url` varchar(512) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '' COMMENT '来源url（即当前停留页面的url）',
  `request_url` varchar(512) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '' COMMENT '访问的url',
  `request_page` varchar(512) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '' COMMENT '请求的页面action路径',
  `access_time` datetime NOT NULL COMMENT '访问时间',
  `user_ip` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '' COMMENT '访客ip',
  `user_agent` varchar(512) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '' COMMENT '访客agent',
  `user_id` char(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '' COMMENT '用户id',
  `os` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '' COMMENT '操作系统类型',
  `os_version` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '' COMMENT '操作系统版本',
  `os_x64_flag` tinyint(1) UNSIGNED NOT NULL DEFAULT '0' COMMENT '系统类型（0-32位，1-64位）',
  `browser` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '' COMMENT '浏览器类型',
  `browser_version` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '' COMMENT '浏览器版本',
  `javascript_flag` tinyint(1) UNSIGNED NOT NULL DEFAULT '0' COMMENT '是否支持JavaScript（0-否，1-是）',
  `cookies_flag` tinyint(1) UNSIGNED NOT NULL DEFAULT '0' COMMENT '是否支持cookies（0-否，1-是）',
  `css_version` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '' COMMENT 'css版本',
  `mobile_flag` tinyint(1) UNSIGNED NOT NULL DEFAULT '0' COMMENT '是否手机终端（0-否，1-是）',
  `ajax_flag` tinyint(1) UNSIGNED NOT NULL DEFAULT '0' COMMENT 'ajax标志（0-否，1-是）',
  `javaapplets_flag` tinyint(1) UNSIGNED NOT NULL DEFAULT '0' COMMENT '是否支持Java Applets（0-否，1-是）',
  `activex_flag` tinyint(1) UNSIGNED NOT NULL DEFAULT '0' COMMENT '是否支持ActiveX Controls（0-否，1-是）',
  `crawler_flag` tinyint(1) UNSIGNED NOT NULL DEFAULT '0' COMMENT '是否机器人（0-否，1-是）',
  `vbscript_flag` tinyint(1) UNSIGNED NOT NULL DEFAULT '0' COMMENT '是否支持VBScript（0-否，1-是）'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- 表的结构 `commentmeta`
--

CREATE TABLE `commentmeta` (
  `meta_id` char(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'id',
  `comment_id` char(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '' COMMENT '评论id',
  `meta_key` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '键名',
  `meta_value` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT '键值'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- 表的结构 `comments`
--

CREATE TABLE `comments` (
  `comment_id` char(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'id',
  `post_id` char(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '' COMMENT '文章id',
  `comment_content` text CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL COMMENT '评论内容',
  `comment_status` enum('normal','pending','reject','spam','trash') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending' COMMENT '评论状态',
  `comment_author` tinytext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '评论者',
  `comment_author_email` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '' COMMENT '评论者邮箱',
  `comment_author_link` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '' COMMENT '评论者网址',
  `comment_ip` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '' COMMENT '评论者IP',
  `comment_created` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '评论时间',
  `comment_created_gmt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '评论时间（0时区GMT）',
  `comment_modified` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '修改时间',
  `comment_modified_gmt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '修改时间（0时区GMT）',
  `comment_vote` int(10) NOT NULL DEFAULT '0' COMMENT '赞数',
  `comment_agent` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '' COMMENT '评论者agent',
  `parent_id` char(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '' COMMENT '父评论id',
  `user_id` char(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '' COMMENT '评论用户id'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- 表的结构 `links`
--

CREATE TABLE `links` (
  `link_id` char(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'id',
  `link_url` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '' COMMENT '链接地址',
  `link_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '' COMMENT '链接名称',
  `link_image` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '' COMMENT '链接图片',
  `link_target` enum('_blank','_top','_self') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '_blank' COMMENT '链接打开方式',
  `link_description` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '' COMMENT '链接描述',
  `link_visible` enum('site','homepage','invisible') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'site' COMMENT '链接可见性',
  `link_owner` char(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '' COMMENT '链接所有者id',
  `link_rating` int(11) NOT NULL DEFAULT '0' COMMENT '链接评分等级',
  `link_created` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '添加时间',
  `link_modified` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '修改时间',
  `link_rss` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '' COMMENT '链接RSS地址'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- 转存表中的数据 `links`
--

INSERT INTO `links` (`link_id`, `link_url`, `link_name`, `link_image`, `link_target`, `link_description`, `link_visible`, `link_owner`, `link_rating`, `link_rss`) VALUES
('21683af7b26b1a3e', 'https://icamille.github.io', '爱前端的小西瓜', '', '_blank', 'camille\'s Blog', 'site', '5424e33fa3cd9585', 60, ''),
('21684c003da77f21', 'https://github.com/ifuyun', '抚云的GitHub', '', '_blank', '抚云的GitHub', 'site', '5424e33fa3cd9585', 92, ''),
('221a6e23ef7b4623', 'http://www.qingtin.com/', '倾听网络收音机', '', '_blank', '倾听网络收音机', 'site', '5424e33fa3cd9585', 70, ''),
('277503ce8413996b', 'http://weibo.com/cojue', '抚云的围脖', '', '_blank', '抚云的围脖', 'site', '5424e33fa3cd9585', 50, ''),
('d0a2690817ee02aa', '/rss', 'RSS', '', '_blank', 'RSS', 'invisible', '5424e33fa3cd9585', 100, ''),
('d40d7d8817ee02ab', '/feedback', '反馈', '', '_blank', '留下您的宝贵建议', 'invisible', '5424e33fa3cd9585', 90, '');

-- --------------------------------------------------------

--
-- 表的结构 `options`
--

CREATE TABLE `options` (
  `option_id` char(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'id',
  `blog_id` char(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '' COMMENT '博客id',
  `option_name` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '' COMMENT '配置名',
  `option_value` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '配置值',
  `autoload` tinyint(1) UNSIGNED NOT NULL DEFAULT '1' COMMENT '是否自动加载（0/1）'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- 转存表中的数据 `options`
--

INSERT INTO `options` (`option_id`, `blog_id`, `option_name`, `option_value`, `autoload`) VALUES
('1115044df380b9ca', '0', 'comments_per_page', '50', 1),
('12026d001520bf4a', '0', 'domain_name', 'ifuyun.com', 1),
('12393738c5bac91b', '0', 'site_slogan', '爱生活，爱抚云', 1),
('1965044df380b98f', '0', 'rss_use_excerpt', '0', 0),
('1cce2a9201adcaa8', '0', 'icp_num', '浙ICP备16004036号-1', 1),
('22906f1af1e8256e', '0', 'static_host', 'http://s.ifuyun.com', 1),
('2485044df380b9ae', '0', 'home', 'http://www.ifuyun.com/', 0),
('2675044df380b9be', '0', 'upload_path', '/upload', 1),
('2675044df380b9d0', '0', 'full_post', '0', 0),
('2855044df380b978', '0', 'default_friendlink_slug', 'friendlink', 0),
('3115044df380b976', '0', 'default_toollink_slug', 'toollink', 0),
('3275044df380b9bc', '0', 'uploads_use_yearmonth_folders', '1', 0),
('3425044df380b996', '0', 'mailserver_pass', '', 0),
('3435044df380b9ab', '0', 'blog_charset', 'UTF-8', 0),
('3775044df380b9c3', '0', 'default_link_category', '', 0),
('3935044df380b9ba', '0', 'default_role', 'subscriber', 0),
('3955044df380b994', '0', 'mailserver_login', '', 0),
('4425044df380b9b0', '0', 'comment_max_links', '2', 0),
('4505044df380b9ce', '0', 'enable_search', '0', 0),
('4805044df380b9cc', '0', 'copyright_notice', '&copy;&nbsp;抚云&nbsp;2014-2019', 1),
('5005044df380b99b', '0', 'default_category', '0000000000000000', 1),
('5065044df380b9b5', '0', 'rss_language', 'en', 0),
('5525044df380b9c1', '0', 'blog_public', '1', 1),
('6325044df380b989', '0', 'require_name_email', '1', 1),
('6345044df380b98b', '0', 'comments_notify', '1', 1),
('6635044df380b97b', '0', 'site_url', 'http://www.ifuyun.com', 1),
('7205044df380b9c5', '0', 'thread_comments', '1', 0),
('7225044df380b999', '0', 'mailserver_port', '110', 0),
('7295044df380b986', '0', 'admin_email', 'ifuyun@outlook.com', 1),
('7395044df380b9b7', '0', 'html_type', 'text/html', 1),
('7525044df380b99e', '0', 'default_comment_status', 'pending', 1),
('7805044df380b97d', '0', 'blog_name', '', 0),
('8165044df380b9a9', '0', 'links_updated_date_format', 'Y-m-d H:i:s', 0),
('8195044df380b9a2', '0', 'posts_per_page', '10', 1),
('8345044df380b9c7', '0', 'thread_comments_depth', '5', 0),
('8485044df380b992', '0', 'mailserver_url', '', 0),
('84ececef17fef96b', '0', 'site_name', '抚云生活', 1),
('84f0723a17fef96c', '0', 'site_description', '一篇随笔，记录生活的坎坷起伏；一段日记，诉说尘封的真情实感；一张照片，留下多彩的斑斓岁月；一曲音乐，洗尽尘世的喧闹繁华；一次微笑，褪去一生的酸甜苦辣……爱生活，爱抚云。', 1),
('85025d2617fef971', '0', 'site_charset', 'UTF-8', 1),
('8505e62217fef972', '0', 'site_keywords', '抚云,Fuyun,前端开发,web开发,技术博客,个人博客,微生活,微心理,随笔,自由摄影,生活日记,生活幽默,怀旧', 1),
('8509707f17fef973', '0', 'site_author', '抚云,Fuyun', 1),
('8545044df380b9a0', '0', 'default_post_edit_rows', '20', 1),
('8755044df380b9b2', '0', 'comment_registration', '0', 0),
('8835044df380b98d', '0', 'posts_per_rss', '10', 0),
('8905044df380b9a7', '0', 'time_format', 'H:i:s', 0),
('9095044df380b9a5', '0', 'date_format', 'Y-m-d', 0),
('9295044df380b982', '0', 'users_can_register', '0', 0),
('9345044df380b980', '0', 'blog_description', '', 0);

-- --------------------------------------------------------

--
-- 表的结构 `postmeta`
--

CREATE TABLE `postmeta` (
  `meta_id` char(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'id',
  `post_id` char(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '' COMMENT '文章id',
  `meta_key` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '键名',
  `meta_value` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT '键值'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- 表的结构 `posts`
--

CREATE TABLE `posts` (
  `post_id` char(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'id',
  `post_author` char(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '' COMMENT '作者',
  `post_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '发布时间',
  `post_date_gmt` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '发布时间（0时区GMT）',
  `post_content` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '正文',
  `post_title` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '标题',
  `post_excerpt` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '摘要',
  `post_status` enum('publish','private','pending','draft','auto-draft','inherit','trash') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'publish' COMMENT '文章状态',
  `comment_flag` enum('open','verify','closed') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'verify' COMMENT '评论状态',
  `post_original` tinyint(1) UNSIGNED NOT NULL DEFAULT '1' COMMENT '是否原创',
  `post_password` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '' COMMENT 'post查看密码',
  `post_name` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '' COMMENT '别名',
  `post_modified` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '修改时间',
  `post_modified_gmt` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '修改时间（0时区GMT）',
  `post_created` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `post_parent` char(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '' COMMENT '父文章id',
  `post_guid` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '' COMMENT '唯一访问地址URL',
  `post_type` enum('post','page','revision','attachment') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'post' COMMENT '文章类型',
  `post_mime_type` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '' COMMENT 'mime类型',
  `comment_count` bigint(20) NOT NULL DEFAULT '0' COMMENT '评论总数',
  `post_view_count` bigint(20) NOT NULL DEFAULT '0' COMMENT '访问计数'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- 转存表中的数据 `posts`
--

INSERT INTO `posts` (`post_id`, `post_author`, `post_content`, `post_title`, `post_excerpt`, `post_status`, `comment_flag`, `post_original`, `post_password`, `post_name`, `post_parent`, `post_guid`, `post_type`, `post_mime_type`, `comment_count`, `post_view_count`) VALUES
('37343f2c582cc2be', '5424e33fa3cd9585', '<p>Welcome to ifuyun.com! 😉😝</p>', 'Hello World!', '', 'publish', 'open', 1, '', '', '', '/post/37343f2c582cc2be', 'post', '', 0, 4);

-- --------------------------------------------------------

--
-- 表的结构 `sessions`
--

CREATE TABLE `sessions` (
  `session_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `session_data` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `session_expires` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- 表的结构 `term_relationships`
--

CREATE TABLE `term_relationships` (
  `object_id` char(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '文章、链接id',
  `term_taxonomy_id` char(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '' COMMENT '分类id',
  `term_order` int(11) NOT NULL DEFAULT '0' COMMENT '排序'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- 转存表中的数据 `term_relationships`
--

INSERT INTO `term_relationships` (`object_id`, `term_taxonomy_id`, `term_order`) VALUES
('21683af7b26b1a3e', '1e2c32849b6ac51b', 0),
('21684c003da77f21', '1e2c32849b6ac51b', 0),
('221a6e23ef7b4623', '1e2c32849b6ac51b', 0),
('277503ce8413996b', '1e2c32849b6ac51b', 0),
('37343f2c582cc2be', '1dfecec1c3d583fc', 0),
('d0a2690817ee02aa', '1e2c32849b6ac51b', 0),
('d40d7d8817ee02ab', '0000000000000001', 0);

-- --------------------------------------------------------

--
-- 表的结构 `term_taxonomy`
--

CREATE TABLE `term_taxonomy` (
  `taxonomy_id` char(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'id',
  `taxonomy` enum('post','link','tag') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'post' COMMENT '分类名',
  `name` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '' COMMENT '显示名',
  `slug` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '' COMMENT '别名（URL）',
  `description` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '分类描述',
  `parent` char(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '' COMMENT '父分类id',
  `term_order` int(11) UNSIGNED NOT NULL DEFAULT '0' COMMENT '排序',
  `visible` tinyint(1) UNSIGNED NOT NULL DEFAULT '1' COMMENT '是否可见（0-否，1-是）',
  `term_group` bigint(10) NOT NULL DEFAULT '0' COMMENT '分组',
  `count` bigint(20) NOT NULL DEFAULT '0' COMMENT '文章、链接、标签统计数',
  `created` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '添加时间',
  `modified` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '修改时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- 转存表中的数据 `term_taxonomy`
--

INSERT INTO `term_taxonomy` (`taxonomy_id`, `taxonomy`, `name`, `slug`, `description`, `parent`, `term_order`, `visible`, `term_group`, `count`) VALUES
('0000000000000000', 'post', '未分类', 'uncategoried', '未分类', '', 99, 0, 0, 0),
('0000000000000001', 'link', '未分类链接', 'nolink', '未分类链接', '', 0, 1, 0, 0),
('1dfec1830ab66c47', 'post', '随笔', 'essay', '随性生活', '', 21, 1, 0, 0),
('1dfec1dbcef57ced', 'post', '日记', 'diary', '生活点滴', '1dfec1830ab66c47', 2101, 1, 0, 0),
('1dfec21eceb3f1bb', 'post', '杂谈', 'thinking', '理性思维的碰撞', '1dfec1830ab66c47', 2111, 1, 0, 0),
('1dfec2b755b14657', 'post', '相册', 'album', '微生活', '', 41, 1, 0, 0),
('1dfec3672ee550ed', 'post', '开怀一笑', 'laugh', '幽生活一默', '', 61, 1, 0, 0),
('1dfec55aa7bcfd8f', 'post', '幽默', 'humor', '幽默', '1dfec3672ee550ed', 6101, 1, 0, 0),
('1dfecb3f65b179a7', 'post', '故事', 'story', '故事', '1dfec3672ee550ed', 6102, 1, 0, 0),
('1dfecd39a6402c24', 'post', '爱前端', 'frontend', '专注二十年', '', 11, 1, 0, 0),
('1dfecec1c3d583fc', 'post', 'JavaScript', 'javascript', 'JavaScript', '1dfecd39a6402c24', 1101, 1, 0, 0),
('1dfecf20a1fde6de', 'post', 'HTML', 'HTML', 'HTML', '1dfecd39a6402c24', 1121, 1, 0, 0),
('1dfecf80a94e384d', 'post', 'CSS', 'CSS', 'CSS', '1dfecd39a6402c24', 1131, 1, 0, 0),
('1dfecfda703ac00b', 'post', 'HTML5', 'HTML5', 'HTML5', '1dfecd39a6402c24', 1141, 1, 0, 0),
('1dfed19e775de1b4', 'post', 'Node.js', 'node.js', 'Node.js', '1dfecd39a6402c24', 1111, 1, 0, 0),
('1dfed2bbf267204e', 'post', '项目管理', 'pm', '项目管理', '1dfecd39a6402c24', 1171, 1, 0, 0),
('1e2c32849b6ac51b', 'link', '友情链接', 'friendlink', '友情链接', '', 0, 1, 0, 0),
('1e2c32ff11f3822b', 'link', '页面工具链接/快捷方式', 'quicklink', '页面工具链接/快捷方式', '', 0, 1, 0, 0),
('20e864124f489a90', 'post', '效率', 'efficiency', '效率和工具', '1dfecd39a6402c24', 1181, 1, 0, 0),
('20e866f349d65c6f', 'post', '架构', 'architecture', '架构和框架', '1dfecd39a6402c24', 1151, 1, 0, 0),
('20e86b3eaeeeade8', 'post', '心理', 'psychology', '认知、情绪和行为', '1dfec1830ab66c47', 2121, 1, 0, 0),
('2a96b371ecaffc28', 'post', '全栈', 'fullstack', '全栈开发', '1dfecd39a6402c24', 1161, 1, 0, 0),
('2ebc2ca8c9f2f6d5', 'post', '读书', 'note', '读书笔记', '', 31, 1, 0, 0);

-- --------------------------------------------------------

--
-- 表的结构 `usermeta`
--

CREATE TABLE `usermeta` (
  `meta_id` char(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'id',
  `user_id` char(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '' COMMENT '用户id',
  `meta_key` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '键名',
  `meta_value` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT '键值'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- 转存表中的数据 `usermeta`
--

INSERT INTO `usermeta` (`meta_id`, `user_id`, `meta_key`, `meta_value`) VALUES
('1a1c44693e3408b8', '5424e33fa3cd9585', 'role', 'admin');

-- --------------------------------------------------------

--
-- 表的结构 `users`
--

CREATE TABLE `users` (
  `user_id` char(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'id',
  `user_login` varchar(60) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '' COMMENT '登录名',
  `user_pass` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '' COMMENT '密码',
  `user_pass_salt` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '' COMMENT '密码盐值',
  `user_nicename` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `user_email` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '' COMMENT '邮箱',
  `user_link` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '' COMMENT '网址',
  `user_registered` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '注册时间',
  `user_activation_key` varchar(60) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '' COMMENT '激活码',
  `user_status` int(11) NOT NULL DEFAULT '0' COMMENT '用户状态',
  `user_display_name` varchar(250) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '' COMMENT '显示名'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- 转存表中的数据 `users`
--

INSERT INTO `users` (`user_id`, `user_login`, `user_pass`, `user_pass_salt`, `user_nicename`, `user_email`, `user_link`, `user_activation_key`, `user_status`, `user_display_name`) VALUES
('5424e33fa3cd9585', 'admin', '44910cbd15e15cf9758c79c4e4ef7a3f', 'love.520', 'fuyun', 'ifuyun@outlook.com', '', '', 0, '抚云');

-- --------------------------------------------------------

--
-- 表的结构 `votes`
--

CREATE TABLE `votes` (
  `vote_id` char(16) NOT NULL COMMENT 'ID',
  `object_id` char(16) NOT NULL COMMENT '投票评论、文章',
  `vote_count` tinyint(1) NOT NULL DEFAULT '0' COMMENT '支持数',
  `vote_created` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '投票时间',
  `user_id` char(16) NOT NULL COMMENT '登录用户ID',
  `user_ip` varchar(100) NOT NULL COMMENT '访客IP',
  `user_agent` varchar(255) NOT NULL COMMENT '访客agent'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='投票记录表';

-- --------------------------------------------------------

--
-- 替换视图以便查看 `v_post_date_archive`
-- （参见下面的实际视图）
--
CREATE TABLE `v_post_date_archive` (
`post_id` char(16)
,`post_date` datetime
,`post_status` enum('publish','private','pending','draft','auto-draft','inherit','trash')
,`post_type` enum('post','page','revision','attachment')
,`link_date` varchar(7)
,`display_date` varchar(12)
,`visible` tinyint(1) unsigned
);

-- --------------------------------------------------------

--
-- 替换视图以便查看 `v_tag_visible_taxonomy`
-- （参见下面的实际视图）
--
CREATE TABLE `v_tag_visible_taxonomy` (
`object_id` char(16)
,`taxonomy_id` char(16)
,`slug` varchar(200)
,`taxonomy` enum('post','link','tag')
,`term_order` int(11)
);

-- --------------------------------------------------------

--
-- 视图结构 `v_post_date_archive`
--
DROP TABLE IF EXISTS `v_post_date_archive`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_post_date_archive`  AS  select `posts`.`post_id` AS `post_id`,`posts`.`post_date` AS `post_date`,`posts`.`post_status` AS `post_status`,`posts`.`post_type` AS `post_type`,date_format(`posts`.`post_date`,'%Y/%m') AS `link_date`,date_format(`posts`.`post_date`,'%Y年%m月') AS `display_date`,`term_taxonomy`.`visible` AS `visible` from (`posts` left join (`term_relationships` join `term_taxonomy` on((`term_relationships`.`term_taxonomy_id` = `term_taxonomy`.`taxonomy_id`))) on((`posts`.`post_id` = `term_relationships`.`object_id`))) where (`posts`.`post_type` in ('post','attachment')) group by `posts`.`post_id`,`posts`.`post_type`,`term_taxonomy`.`visible` ;

-- --------------------------------------------------------

--
-- 视图结构 `v_tag_visible_taxonomy`
--
DROP TABLE IF EXISTS `v_tag_visible_taxonomy`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_tag_visible_taxonomy`  AS  select `tag`.`object_id` AS `object_id`,`tag`.`term_taxonomy_id` AS `taxonomy_id`,`tag`.`slug` AS `slug`,`tag`.`taxonomy` AS `taxonomy`,`tag`.`term_order` AS `term_order` from ((select `term_relationships`.`object_id` AS `object_id`,`term_relationships`.`term_taxonomy_id` AS `term_taxonomy_id`,`term_relationships`.`term_order` AS `term_order` from (`term_taxonomy` join `term_relationships`) where ((`term_taxonomy`.`taxonomy_id` = `term_relationships`.`term_taxonomy_id`) and (`term_taxonomy`.`taxonomy` = 'post') and (`term_taxonomy`.`visible` = 1))) `taxonomy` join (select `term_relationships`.`object_id` AS `object_id`,`term_relationships`.`term_taxonomy_id` AS `term_taxonomy_id`,`term_taxonomy`.`slug` AS `slug`,`term_taxonomy`.`taxonomy` AS `taxonomy`,`term_relationships`.`term_order` AS `term_order` from (`term_taxonomy` join `term_relationships`) where ((`term_taxonomy`.`taxonomy_id` = `term_relationships`.`term_taxonomy_id`) and (`term_taxonomy`.`taxonomy` = 'tag') and (`term_taxonomy`.`visible` = 1))) `tag`) where (`taxonomy`.`object_id` = `tag`.`object_id`) group by `tag`.`object_id`,`tag`.`term_taxonomy_id` ;

--
-- 转储表的索引
--

--
-- 表的索引 `access_logs`
--
ALTER TABLE `access_logs`
  ADD PRIMARY KEY (`log_id`);

--
-- 表的索引 `commentmeta`
--
ALTER TABLE `commentmeta`
  ADD PRIMARY KEY (`meta_id`),
  ADD KEY `comment_id` (`comment_id`),
  ADD KEY `meta_key` (`meta_key`(191));

--
-- 表的索引 `comments`
--
ALTER TABLE `comments`
  ADD PRIMARY KEY (`comment_id`),
  ADD KEY `post_id` (`post_id`),
  ADD KEY `comment_parent` (`parent_id`);

--
-- 表的索引 `links`
--
ALTER TABLE `links`
  ADD PRIMARY KEY (`link_id`),
  ADD KEY `link_visible` (`link_visible`);

--
-- 表的索引 `options`
--
ALTER TABLE `options`
  ADD PRIMARY KEY (`option_id`),
  ADD UNIQUE KEY `option_name` (`option_name`);

--
-- 表的索引 `postmeta`
--
ALTER TABLE `postmeta`
  ADD PRIMARY KEY (`meta_id`),
  ADD KEY `post_id` (`post_id`),
  ADD KEY `meta_key` (`meta_key`(191));

--
-- 表的索引 `posts`
--
ALTER TABLE `posts`
  ADD PRIMARY KEY (`post_id`),
  ADD KEY `post_name` (`post_name`(191)),
  ADD KEY `post_parent` (`post_parent`),
  ADD KEY `post_author` (`post_author`);

--
-- 表的索引 `sessions`
--
ALTER TABLE `sessions`
  ADD PRIMARY KEY (`session_id`(191));

--
-- 表的索引 `term_relationships`
--
ALTER TABLE `term_relationships`
  ADD PRIMARY KEY (`object_id`,`term_taxonomy_id`),
  ADD KEY `term_taxonomy_id` (`term_taxonomy_id`);

--
-- 表的索引 `term_taxonomy`
--
ALTER TABLE `term_taxonomy`
  ADD PRIMARY KEY (`taxonomy_id`),
  ADD UNIQUE KEY `term_id_taxonomy` (`taxonomy_id`,`taxonomy`),
  ADD UNIQUE KEY `slug` (`slug`(191)),
  ADD KEY `taxonomy` (`taxonomy`),
  ADD KEY `name` (`name`(191));

--
-- 表的索引 `usermeta`
--
ALTER TABLE `usermeta`
  ADD PRIMARY KEY (`meta_id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `meta_key` (`meta_key`(191));

--
-- 表的索引 `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`user_id`),
  ADD KEY `user_login_key` (`user_login`),
  ADD KEY `user_nicename` (`user_nicename`);

--
-- 表的索引 `votes`
--
ALTER TABLE `votes`
  ADD PRIMARY KEY (`vote_id`),
  ADD KEY `object_id` (`object_id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
