/* jslint nomen:true es5:true */
/* global console, process */
/* global __dirname */
/**
 * 网站总入口
 * @module index
 * @main index
 * @requires redis, core, routes
 * @author Fuyun
 * @version 3.0.0
 * @since 1.0.0
 */
const express = require('express');
const cluster = require('cluster');
const app = express();
const numCPUs = require('os').cpus().length;
const Logger = require('./helper/logger');
const logger = Logger.sysLog;

const path = require('path');
const favicon = require('serve-favicon');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const http = require('http');
const ejs = require('ejs');
const compress = require('compression');
// const debug = require('debug');
const csrf = require('csurf');
const log4js = require('log4js');
const session = require('express-session');
const RedisStore = require('connect-redis')(session);
const redis = require('redis');
const redisCfg = require('./config/redis');
const redisClient = redis.createClient(redisCfg.port, redisCfg.host, {auth_pass: redisCfg.passwd});
const config = require('./config/core');
const routes = require('./config/routes');

if (cluster.isMaster) {
    for (let cpuIdx = 0; cpuIdx < numCPUs; cpuIdx += 1) {
        cluster.fork();
    }

    cluster.on('exit', function (worker, code, signal) {
        logger.warn('Worker ' + worker.process.pid + ' exit');
        process.nextTick(function () {
            logger.info('New process is forking...');
            cluster.fork();
        });
    });
} else {
    app.set('views', path.join(__dirname, 'views'));
    app.set('view engine', 'html');
    ejs.delimiter = '?';
    app.engine('.html', ejs.__express);
    app.use(log4js.connectLogger(Logger.accessLog, {
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
        saveUninitialized: false
        // expires: new Date(Date.now() + config.cookieExpires),
        // maxAge: config.cookieExpires
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
    app.use(function (req, res, next) {
        // config.name:响应头不支持中文
        res.setHeader('Server', config.author + '/' + config.version);
        res.setHeader('X-Powered-By', config.domain);
        next();
    });
    app.use(function (req, res, next) {
        logger.trace('Request [%s] is processed by %s: %d', req.url, cluster.isWorker ? 'Worker' : 'Master', cluster.worker.id);
        next();
    });

    routes(app, express);

    if (require.main === module) {
        http.createServer(app).listen(config.port, config.host, () => logger.log('Server listening on: ' + config.host + ', port ' + config.port));
    }
}

if (require.main !== module) {// cluster.isWorker
    module.exports = app;
}
