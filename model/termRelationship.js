/**
 * 分类关系(TermRelationship)模型
 * @module m_term_relationship
 * @author Fuyun
 * @version 1.0.0(2014-06-01)
 * @since 1.0.0(2014-03-08)
 */
/**
 * 分类关系(TermRelationship)模型：封装分类关系查询操作
 * @class M_TermRelationship
 * @constructor
 * @param {Object} pool 连接池对象
 * @return {void}
 * @author Fuyun
 * @version 1.0.0(2014-03-15)
 * @since 1.0.0(2014-03-08)
 */
var TermRelationship = function TermRelationship(pool) {
    'use strict';
    /**
     * 连接池对象
     * @attribute pool
     * @writeOnce
     * @type {Object}
     */
    this.pool = pool;
};

TermRelationship.prototype = {
    /**
     * 根据对象ID查询所属分类
     * @method getTermRelsByObjId
     * @param {String} objectId 对象ID(文章、链接、标签/目录的ID)
     * @param {Function} callback 回调函数
     * @return {void}
     * @author Fuyun
     * @version 1.0.0(2014-06-01)
     * @since 1.0.0(2014-03-08)
     */
    getTermRelsByObjId: function (objectId, callback) {
        'use strict';
        this.pool.getConnection(function (err, conn) {
            if (err) {
                return callback(err);
            }
            conn.query('select * from term_relationships where object_id = ?', [objectId], function (err, termRels) {
                conn.release();
                callback(err, termRels);
            });
        });
    }
};

module.exports = TermRelationship;
