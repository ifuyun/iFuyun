/**
 * 投票(Vote)模型
 * @module m_vote
 * @requires moment, util, async
 * @author Fuyun
 * @version 3.0.0
 * @since 1.0.0
 */
// const moment = require('moment');
const util = require('../helper/util');
const async = require('async');

/**
 * 投票(Vote)模型：封装投票操作
 * @class M_Vote
 * @constructor
 * @param {Object} pool 连接池对象
 * @return {void}
 * @author Fuyun
 * @version 1.0.0
 * @since 1.0.0
 */
let Vote = function Vote(pool) {
    /**
     * 连接池对象
     * @attribute pool
     * @writeOnce
     * @type {Object}
     */
    this.pool = pool;
};

Vote.prototype = {
    /**
     * 保存投票信息
     * @method saveVote
     * @param {Object} data 投票数据
     * @param {Function} callback 回调函数
     * @return {void}
     * @author Fuyun
     * @version 3.0.0
     * @since 1.0.0
     */
    saveVote: function (data, callback) {
        this.pool.getConnection(function (err, conn) {
            if (err) {
                return callback(err);
            }
            async.auto({
                vote: function (cb) {
                    let insertSql = '';
                    let paramArr = [];

                    insertSql = 'insert into votes(vote_id, object_id, vote_count, vote_created, user_id, user_ip, user_agent) ';
                    insertSql += 'values(?, ?, ?, ?, ?, ?, ?) ';
                    paramArr = [util.getUuid(), data.commentId, data.voteCount, new Date(), data.userId, data.userIp, data.userAgent];
                    conn.query(insertSql, paramArr, (err, result) => cb(err, result));
                }
            }, function (err, results) {
                conn.release();
                if (err) {
                    return callback(err);
                }

                callback(null, results);
            });
        });
    }
};

module.exports = Vote;
