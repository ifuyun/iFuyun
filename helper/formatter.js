/**
 * 数据转换函数库
 * @author fuyun
 * @version 3.3.7
 * @since 1.1.0(2017/06/05)
 */
module.exports = {
    commentStatus(status) {
        const statusMap = {
            normal: '获准',
            pending: '待审',
            reject: '驳回',
            spam: '垃圾评论',
            trash: '删除'
        };
        return statusMap[status];
    },
    postStatus(status) {
        const statusMap = {
            publish: '公开',
            private: '私密',
            pending: '待审',
            draft: '草稿',
            'auto-draft': '草稿',
            trash: '删除'
        };
        return statusMap[status];
    },
    taxonomyStatus(status) {
        const statusMap = ['不公开', '公开', '删除'];
        return statusMap[status];
    },
    linkVisible(visible) {
        const visibleMap = {
            site: '全站',
            homepage: '首页',
            invisible: '不可见'
        };
        return visibleMap[visible];
    },
    linkTarget(visible) {
        const visibleMap = {
            _blank: '新页面',
            _top: '父页面',
            _self: '当前页'
        };
        return visibleMap[visible];
    },
    copyrightType(type) {
        const defaultType = '1';
        if (typeof type !== 'number' && typeof type !== 'string') {
            type = defaultType;
        }
        type = type.toString();
        if (!['0', '1', '2'].includes(type)) {
            type = defaultType;
        }
        const copyrightMap = {
            '0': '禁止转载',
            '1': '禁止无授权转载',
            '2': 'CC-BY-NC-ND'
        };
        return copyrightMap[type];
    }
};
