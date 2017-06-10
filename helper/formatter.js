/**
 * 数据转换函数库
 * @author fuyun
 * @since 2017/06/05
 */
module.exports = {
    commentStatus: function (status) {
        const statusMap = {
            normal: '获准',
            pending: '待审',
            reject: '驳回',
            spam: '垃圾评论',
            trash: '删除'
        }
        return statusMap[status];
    },
    postStatus: function (status) {
        const statusMap = {
            publish: '公开',
            private: '私密',
            pending: '待审',
            draft: '草稿',
            'auto-draft': '草稿',
            trash: '删除'
        }
        return statusMap[status];
    },
    linkVisible: function (visible) {
        const visibleMap = {
            site: '全站',
            homepage: '首页',
            invisible: '不可见'
        };
        return visibleMap[visible];
    },
    linkTarget: function (visible) {
        const visibleMap = {
            _blank: '新页面',
            _top: '父页面',
            _self: '当前页'
        };
        return visibleMap[visible];
    }
};
