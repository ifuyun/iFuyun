/**
 * 实验工具路由
 * @module cfg_routes_tool
 * @param {Object} app Server对象
 * @param {Object} router 路由对象
 * @return {Object} router 路由对象
 * @author Fuyun
 * @version 3.4.0
 * @since 3.4.0
 */
const poem = require('../controllers/future/poem');

module.exports = (app, router) => {
    // router.use(admin.checkAuth);
    router.get('/poem/list', poem.list);
    router.get('/poem/game', poem.game);

    return router;
};
