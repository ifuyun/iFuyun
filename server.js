/* jslint nomen:true es5:true */
/**
 * 非集群模式入口
 * @module server
 * @main server
 * @requires redis, core, routes, logger
 * @author Fuyun
 * @version 3.0.0
 * @since 2.0.0
 */
const express = require('express');
const cluster = require('cluster');
const app = express();
const path = require('path');
const favicon = require('serve-favicon');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const http = require('http');
const ejs = require('ejs');
const compress = require('compression');
const csrf = require('csurf');
const log4js = require('log4js');
const session = require('express-session');
const RedisStore = require('connect-redis')(session);
const redis = require('redis');
const redisCfg = require('./config/redis');
const redisClient = redis.createClient(redisCfg.port, redisCfg.host, {'auth_pass': redisCfg.passwd});
const config = require('./config/core');
const routes = require('./config/routes');
const {sysLog, threadLog, accessLog, formatOpLog, updateContext} = require('./helper/logger');

/**
 * worker服务，启动服务器
 * @return {void} null
 */
function startServer() {
    app.set('views', path.join(__dirname, 'views'));
    app.set('view engine', 'html');
    ejs.delimiter = '?';
    app.engine('.html', ejs.__express);
    app.use(log4js.connectLogger(accessLog, {
        level: log4js.levels.INFO,
        format: ':remote-addr - :method :status HTTP/:http-version :url - [:response-time ms/:content-length B] ":referrer" ":user-agent"'
    }));
    app.use(compress());
    app.use(favicon(path.join(__dirname, 'public', 'static', 'favicon.ico')));
    // 通过req.cookies调用cookie
    app.use(cookieParser(config.cookieSecret));
    app.use(session({
        name: 'jsid',
        store: new RedisStore({
            client: redisClient,
            ttl: 7 * 24 * 60 * 60
        }),
        secret: config.sessionSecret,
        resave: false,
        saveUninitialized: false,
        cookie: {
            // 默认domain：当前登录域www.ifuyun.com，设置后为.www.ifuyun.com或.ifuyun.com
            maxAge: config.cookieExpires // 默认7天
        }
    }));
    app.use(bodyParser.json({
        limit: '20mb'
    }));
    app.use(bodyParser.urlencoded({
        limit: '20mb',
        extended: true
    }));
    app.use(csrf());
    app.enable('trust proxy');
    // 设置全局响应头
    app.use((req, res, next) => {
        // config.name:响应头不支持中文
        res.setHeader('Server', config.author + '/' + config.version);
        res.setHeader('X-Powered-By', config.domain);
        next();
    });
    app.use((req, res, next) => {
        updateContext();
        threadLog.trace(formatOpLog({
            msg: `Request [${req.url}] is processed by ${cluster.isWorker ? 'Worker: ' + (cluster.worker && cluster.worker.id) : 'Master'}`
        }));
        next();
    });

    routes(app, express);

    http.Server(app).listen(config.port, config.host, () => sysLog.info(formatOpLog({
        msg: `Server listening on: ${config.host}:${config.port}`
    })));
}

if (require.main === module) {
    startServer();
} else {
    module.exports = startServer;
}
