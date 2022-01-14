/* jslint nomen:true es5:true */
/**
 * 网站总入口（默认）
 * @module index
 * @main index
 * @requires redis, core, routes
 * @author Fuyun
 * @version 3.5.0
 * @since 1.0.0
 */
const express = require('express');
const cluster = require('cluster');
const app = express();
const numCPUs = require('os').cpus().length;
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
// const routesBase = require('./config/routes-base');
const {sysLog, threadLog, accessLog, formatOpLog, updateContext} = require('./helper/logger');

if (cluster.isMaster) {
    const workerSize = Math.max(numCPUs, 2);
    for (let cpuIdx = 0; cpuIdx < workerSize; cpuIdx += 1) {
        cluster.fork();
    }

    cluster.on('exit', (worker, code, signal) => {
        threadLog.warn(formatOpLog({
            msg: `Worker ${worker.process.pid} exit.`,
            data: {
                code,
                signal
            }
        }));
        process.nextTick(() => {
            threadLog.info(formatOpLog({
                msg: 'New process is forking...'
            }));
            cluster.fork();
        });
    });
} else {// cluster.isWorker
    let server = http.Server();
    app.set('views', path.join(__dirname, 'views'));
    app.set('view engine', 'html');
    ejs.delimiter = '?';
    app.engine('.html', ejs.__express);
    // app.use(routesBase.globalError(server));
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
            msg: `Request [${req.url}] is processed by Worker: ${cluster.worker.id}`
        }));
        next();
    });

    routes(app, express);

    server.on('request', app);
    server.listen(config.port, config.host, () => sysLog.info(formatOpLog({
        msg: `Server listening on: ${config.host}:${config.port}`
    })));
}
