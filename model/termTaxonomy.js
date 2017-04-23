/**
 * 分类(TermTaxonomy)模型
 * @module m_term_taxonomy
 * @requires async, util
 * @author Fuyun
 * @version 3.0.0
 * @since 1.0.0
 */
const async = require('async');
const util = require('../helper/util');

/**
 * 分类(TermTaxonomy)模型：封装分类目录查询操作
 * @class M_TermTaxonomy
 * @constructor
 * @param {Object} pool 连接池对象
 * @return {void}
 * @author Fuyun
 * @version 1.0.0
 * @since 1.0.0
 */
var TermTaxonomy = function TermTaxonomy(pool) {
    /**
     * 连接池对象
     * @attribute pool
     * @writeOnce
     * @type {Object}
     */
    this.pool = pool;
    /**
     * 单页显示数量
     * @attribute pageLimit
     * @type {Number}
     * @default 10
     */
    this.pageLimit = 10;
};

/**
 * 递归生成目录树
 * @method createCategoryTree
 * @static
 * @param {Array} categoryData 目录数据数组
 * @return {Object} 目录树层次数据对象(嵌套)
 * @author Fuyun
 * @version 1.0.0
 * @since 1.0.0
 */
function createCategoryTree(categoryData) {
    var catTree = {},
        treeNodes = [];

    function iterateCategory(treeData, parentId, parentNode, level) {
        var arrIdx = 0,
            curNode;

        for (arrIdx = 0; arrIdx < treeData.length; arrIdx += 1) {
            curNode = treeData[arrIdx];
            if (util.inArray(curNode.taxonomy_id, treeNodes) < 0) {
                if (curNode.parent === parentId) {
                    parentNode[curNode.taxonomy_id] = {
                        name: curNode.name,
                        description: curNode.description,
                        slug: curNode.slug,
                        count: curNode.count,
                        taxonomyId: curNode.taxonomy_id,
                        parentId: curNode.parent,
                        level: level,
                        children: {}
                    };
                    treeNodes.push(curNode.taxonomy_id);
                    iterateCategory(treeData, curNode.taxonomy_id, parentNode[curNode.taxonomy_id].children, level + 1);
                }
            }
        }
    }

    iterateCategory(categoryData, '', catTree, 1);
    return catTree;
}

/**
 * 遍历目录树，返回结构化HTML
 * @method iterateCategoryTree
 * @static
 * @param {Object} inTree 目录树层次数据对象
 * @param {Array} outTree 结构化HTML数组
 * @param {Number} level 层级，在ul中定义，而非li(已有level定义)，故需要此参数
 * @return {Array} 结构化HTML数组
 * @author Fuyun
 * @version 1.0.0
 * @since 1.0.0
 */
function iterateCategoryTree(inTree, outTree, level) {
    var nodeIdx,
        curNode;
    outTree.push('<li>');
    outTree.push('<ul' + (level > 1 ? ' class="subList"' : '') + '>');
    for (nodeIdx in inTree) {
        if (inTree.hasOwnProperty(nodeIdx)) {
            curNode = inTree[nodeIdx];
            if (util.isEmptyObject(curNode.children)) {//叶子
                outTree.push('<li><a href="/category/' + (curNode.slug || curNode.name) + '" title="' + curNode.description + '">' + curNode.name + '</a></li>');
            } else {
                outTree.push('<li><a href="/category/' + (curNode.slug || curNode.name) + '" title="' + curNode.description + '">' + curNode.name + '</a></li>');
                iterateCategoryTree(curNode.children, outTree, level + 1);
            }
        }
    }
    outTree.push('</ul>');
    outTree.push('</li>');
    return outTree;
}

/**
 * 前序遍历目录树，返回目录数组
 * @method iterateCategoryArray
 * @static
 * @param {Object} inTree 目录树层次数据对象
 * @param {Array} outArr 目录数组
 * @param {Number} level 层级，在ul中定义，而非li(已有level定义)，故需要此参数
 * @return {Array} 结构化HTML数组
 * @author Fuyun
 * @version 1.0.0
 * @since 1.0.0
 */
function iterateCategoryArray(inTree, outArr, level) {
    var nodeIdx,
        curNode;
    for (nodeIdx in inTree) {
        if (inTree.hasOwnProperty(nodeIdx)) {
            curNode = inTree[nodeIdx];
            outArr.push({
                level: level,
                name: curNode.name,
                slug: curNode.slug,
                taxonomyId: curNode.taxonomyId
            });
            if (!util.isEmptyObject(curNode.children)) {//非叶子
                iterateCategoryArray(curNode.children, outArr, level + 1);
            }
        }
    }
    return outArr;
}

TermTaxonomy.prototype = {
    /**
     * 根据分类ID查询分类名
     * @method getTermByTaxonomyId
     * @param {String} taxonomyId 分类ID
     * @param {Function} callback 回调函数
     * @return {void}
     * @author Fuyun
     * @version 1.0.0
     * @since 1.0.0
     */
    getTermByTaxonomyId: function (taxonomyId, callback) {
        this.pool.getConnection(function (err, conn) {
            if (err) {
                return callback(err);
            }
            var termSql = {
                sql: 'select * from term_taxonomy where taxonomy_id = ?',
                nestTables: false
            };
            conn.query(termSql, [taxonomyId], function (err, terms) {
                conn.release();
                if (err) {
                    return callback(err);
                }
                // var taxonomy = {
                // taxonomy_id: terms[0].taxonomy_id,
                // taxonomy: terms[0].taxonomy,
                // description: terms[0].description,
                // parent: terms[0].parent,
                // count: terms[0].count,
                // name: terms[0].name,
                // slug: terms[0].slug
                // };
                callback(null, terms[0]);
            });
        });
    },
    /**
     * 查询目录(包含子目录)
     * @method getCategoryDom
     * @param {Function} callback 回调函数，参数：目录树HTML
     * @return {void}
     * @author Fuyun
     * @version 1.0.0
     * @since 1.0.0
     */
    getCategoryDom: function (callback) {
        this.pool.getConnection(function (err, conn) {
            if (err) {
                return callback(err);
            }
            var termSql = {
                sql: 'select * from term_taxonomy where taxonomy = ? order by term_order asc', // and parent <> ?
                nestTables: false
            };
            conn.query(termSql, ['post'], function (err, result) {
                var outTree = [];
                conn.release();
                if (result.length > 0) {
                    iterateCategoryTree(createCategoryTree(result), outTree, 1);
                    callback(err, outTree.slice(1, -1).join(''));
                } else {
                    callback('分类不存在');
                }
            });
        });
    },
    /**
     * 查询目录(包含子目录)，返回目录数据数组（根据嵌套顺序，即：前序遍历）
     * @method getCategories
     * @param {Function} callback 回调函数，参数：目录数组
     * @return {void}
     * @author Fuyun
     * @version 1.0.0
     * @since 1.0.0
     */
    getCategoryArray: function (type, callback) {
        this.pool.getConnection(function (err, conn) {
            if (err) {
                return callback(err);
            }
            var termSql = {
                sql: 'select * from term_taxonomy where taxonomy = ? order by term_order asc', // and parent <> ?
                nestTables: false
            };
            conn.query(termSql, [type], function (err, result) {
                var outArr = [];
                conn.release();
                if (result.length > 0) {
                    iterateCategoryArray(createCategoryTree(result), outArr, 1);
                    callback(err, outArr);
                } else {
                    callback('分类不存在');
                }
            });
        });
    },
    /**
     * 查询目录(包含子目录)
     * @method getCategoryTree
     * @param {Function} callback 回调函数，参数：目录树Object
     * @return {void}
     * @author Fuyun
     * @version 2.0.0
     * @since 2.0.0
     */
    getCategoryTree: function (callback) {
        this.pool.getConnection(function (err, conn) {
            if (err) {
                return callback(err);
            }
            var termSql = {
                sql: 'select * from term_taxonomy where taxonomy = ? order by term_order asc', // and parent <> ?
                nestTables: false
            };
            conn.query(termSql, ['post'], function (err, result) {
                conn.release();
                if (result.length > 0) {
                    callback(err, createCategoryTree(result));
                } else {
                    callback('分类不存在');
                }
            });
        });
    },
    /**
     * 查询主导航
     * @method getMainNavs
     * @param {Function} callback 回调函数
     * @return {void}
     * @author Fuyun
     * @version 1.0.0
     * @since 1.0.0
     */
    getMainNavs: function (callback) {
        this.pool.getConnection(function (err, conn) {
            if (err) {
                return callback(err);
            }
            var termSql = {
                sql: 'select * from term_taxonomy where taxonomy = ? and parent = ? order by term_order asc',
                nestTables: false
            };
            conn.query(termSql, ['post', ''], function (err, result) {
                conn.release();
                callback(err, result);
            });
        });
    },
    /**
     * 递归查询父目录
     * @method getParentCategories
     * @param {String} catId ID
     * @param {Function} callback 回调函数
     * @return {void}
     * @author Fuyun
     * @version 1.0.0
     * @since 1.0.0
     */
    getParentCategories: function (catId, callback) {
        var parentCats = [],
            that = this,
            recursive = function (curCatId) {
                that.getTermByTaxonomyId(curCatId, function (err, data) {
                    if (err) {
                        return callback(err, data);
                    }
                    parentCats.unshift(data);
                    if (data.parent) {
                        recursive(data.parent);
                    } else {
                        callback(null, parentCats);
                    }
                });
            };
        recursive(catId);
    },
    /**
     * 查询子目录
     * @method getChildCategories
     * @param {String} parent 父ID
     * @param {Function} callback 回调函数
     * @return {void}
     * @author Fuyun
     * @version 1.0.0
     * @since 1.0.0
     */
    getChildCategories: function (parent, callback) {//getTaxonomyByParent
        this.pool.getConnection(function (err, conn) {
            if (err) {
                return callback(err);
            }
            var termSql = {
                sql: 'select taxonomy_id from term_taxonomy where parent = ?',
                nestTables: false
            };
            conn.query(termSql, [parent], function (err, data) {
                var dataIdx,
                    idsArr = [];

                conn.release();

                for (dataIdx = 0; dataIdx < data.length; dataIdx += 1) {
                    idsArr.push(data[dataIdx].taxonomy_id);
                }
                callback(err, idsArr.concat(parent));
            });
        });
    },
    /**
     * 查询指定类型的分类
     * @method getCategories
     * @param {Object} param 查询参数
     * @param {Function} callback 回调函数
     * @return {void}
     * @author Fuyun
     * @version 1.0.0
     * @since 1.0.0
     */
    getCategories: function (param, callback) {
        var that = this;

        this.pool.getConnection(function (err, conn) {
            if (err) {
                return callback(err);
            }
            var sqlParam = [param.type],
                sqlWhere = 'where taxonomy = ? ';

            async.auto({
                count: function (cb) {
                    conn.query('select count(1) total from term_taxonomy ' + sqlWhere, sqlParam, function (err, result) {
                        if (err) {
                            return cb(err);
                        }
                        var data = {};
                        data.total = result[0].total;
                        data.pages = Math.ceil(data.total / that.pageLimit);
                        cb(null, data);
                    });
                },
                //@formatter:off
                category: ['count',
                    function (cb, results) {
                        var catSql = {
                            sql: 'select * from term_taxonomy ' + sqlWhere + 'order by term_order asc limit ? offset ?',
                            nestTables: false
                        }, catQuery, page;
    
                        page = param.page > results.count.pages ? results.count.pages : param.page;
                        page = page || 1;
                        catQuery = conn.query(catSql, sqlParam.concat(that.pageLimit, that.pageLimit * (page - 1)), function (err, cats) {
                            cb(err, cats);
                        });
                    }]
                //@formatter:on
            }, function (err, results) {
                conn.release();
                if (err) {
                    return callback(err);
                }
                var catData = {
                    categories: results.category,
                    total: results.count.total,
                    pages: results.count.pages,
                    pageLimit: that.pageLimit
                };

                callback(null, catData);
            });
        });
    },
    /**
     * 保存分类
     * @method saveCategory
     * @param {Object} data 分类数据
     * @param {Function} callback 回调函数
     * @return {void}
     * @author Fuyun
     * @version 1.0.0
     * @since 1.0.0
     */
    saveCategory: function (data, callback) {
        this.pool.getConnection(function (err, conn) {
            if (err) {
                return callback(err);
            }
            conn.beginTransaction(function (errTs) {
                if (errTs) {
                    return callback(errTs);
                }
                var taxonomyId = util.getUuid(),
                    nowTime = new Date();
                async.auto({
                    checkExist: function (cb) {
                        var sql = '',
                            paramArr = [];

                        sql = 'select count(1) num from term_taxonomy where slug = ? and taxonomy_id <> ?';
                        paramArr = [data.catSlug, data.catTaxonomyId];

                        conn.query(sql, paramArr, function (err, result) {
                            cb(err, result[0]);
                        });
                    },
                    taxonomy: ['checkExist',
                        function (cb, results) {
                            if (results.checkExist.num > 0) {
                                return cb('slug: ' + data.catSlug + ' is exist.');
                            }
                            var insertSql = '',
                                paramArr = [];

                            insertSql = 'insert into term_taxonomy(taxonomy_id, taxonomy, name, slug, description, parent, term_order, term_group, created) ';
                            insertSql += 'values(?, ?, ?, ?, ?, ?, ?, ?, ?)';
                            paramArr = [taxonomyId, data.type, data.catName, data.catSlug, data.catDescription, data.catParent, data.catOrder, 0, nowTime];

                            if (data.catTaxonomyId) {
                                insertSql = 'update term_taxonomy set name = ?, slug = ?, description = ?, parent = ?, term_order = ?, modified = ? ';
                                insertSql += 'where taxonomy_id = ?';
                                paramArr = [data.catName, data.catSlug, data.catDescription, data.catParent, data.catOrder, nowTime, data.catTaxonomyId];
                            }
                            conn.query(insertSql, paramArr, function (errT, result) {
                                cb(errT, result);
                            });
                        }]

                }, function (err, results) {
                    if (err) {
                        return conn.rollback(function () {//回滚
                            return callback(err);
                        });
                    }
                    conn.commit(function (errC) {//提交
                        if (errC) {
                            return conn.rollback(function () {//回滚
                                return callback(errC);
                            });
                        }
                        callback(null, results);
                    });
                });
            });
        });
    },
    /**
     * 删除分类
     * @method removeCategory
     * @param {Object} data 分类数据
     * @param {Function} callback 回调函数
     * @return {void}
     * @author Fuyun
     * @version 1.0.0
     * @since 1.0.0
     */
    removeCategory: function (data, callback) {
        this.pool.getConnection(function (err, conn) {
            if (err) {
                return callback(err);
            }
            conn.beginTransaction(function (errTs) {
                if (errTs) {
                    return callback(errTs);
                }
                var taxonomyId = data.taxonomyId;
                async.auto({
                    taxonomy: function (cb) {
                        var deleteSql = '',
                            paramArr = [];

                        deleteSql = 'delete from term_taxonomy where taxonomy_id = ?';
                        paramArr = [taxonomyId];

                        conn.query(deleteSql, paramArr, function (errT, result) {
                            cb(errT, result);
                        });
                    },
                    post: function (cb) {
                        var updateSql = '',
                            paramArr = [];

                        if (data.type === 'post') {//post转到未分类
                            //TODO:需要把子类的parent设为空
                            updateSql = 'update term_relationships set term_taxonomy_id = ? where term_taxonomy_id = ?';
                            paramArr = ['0000000000000000', taxonomyId];
                        } else if (data.type === 'link') {//link转到未分类
                            //TODO:需要把子类的parent设为空
                            updateSql = 'update term_relationships set term_taxonomy_id = ? where term_taxonomy_id = ?';
                            paramArr = ['0000000000000001', taxonomyId];
                        } else {//删除post标签
                            updateSql = 'delete from term_relationships where term_taxonomy_id = ?';
                            paramArr = [taxonomyId];
                        }

                        conn.query(updateSql, paramArr, function (errP, result) {
                            cb(errP, result);
                        });
                    }
                }, function (err, results) {
                    if (err) {
                        return conn.rollback(function () {//回滚
                            return callback(err);
                        });
                    }
                    conn.commit(function (errC) {//提交
                        if (errC) {
                            return conn.rollback(function () {//回滚
                                return callback(errC);
                            });
                        }
                        callback(null, results);
                    });
                });
            });
        });
    },
    /**
     * 根据别名查询分类名
     * @method getTermBySlug
     * @param {String} slug 别名
     * @param {Function} callback 回调函数
     * @return {void}
     * @author Fuyun
     * @version 1.0.0
     * @since 1.0.0
     */
    getTaxonomyBySlug: function (slug, type, callback) {
        this.pool.getConnection(function (err, conn) {
            if (err) {
                return callback(err);
            }
            var sql = {
                sql: 'select * from term_taxonomy where slug = ? and taxonomy = ?',
                nestTables: false
            };
            conn.query(sql, [slug, type], function (err, result) {
                conn.release();
                callback(err, result[0]);
            });
        });
    }
};

module.exports = TermTaxonomy;
