/*jslint nomen:true es5:true*/
/*global console, process*/
/*global __dirname*/
/**
 * 网站总入口
 * @module index
 * @main index
 * @requires redis, core, routes
 * @author Fuyun
 * @version 2.0.0(2015-05-27)
 * @since 1.0.0(2014-05-16)
 */
//@formatter:off
var express = require('express'),
    path = require('path'),
    favicon = require('serve-favicon'),
    // logger = require('morgan'),
    cookieParser = require('cookie-parser'),
    bodyParser = require('body-parser'),
    http = require('http'),
    ejs = require('ejs'),
    compress = require('compression'),
    debug = require('debug'),
    // socketio = require('socket.io'),
    cluster = require('cluster'),
    csrf = require('csurf'),
    log4js = require('log4js'),

    session = require('express-session'),
    RedisStore = require('connect-redis')(session),
    redis = require('redis'),
    redisCfg = require('./config/redis'),
    redisClient = redis.createClient(redisCfg.port, redisCfg.host, { auth_pass: redisCfg.passwd }),

    config = require('./config/core'),
    routes = require('./config/routes'),

    Logger = require('./helper/logger'),

    app = express(),
    server,
    // router = express.Router(),
    io,
    numCPUs = require('os').cpus().length,
    cpuIdx;
//@formatter:on

if (cluster.isMaster) {
    for ( cpuIdx = 0; cpuIdx < numCPUs; cpuIdx += 1) {
        cluster.fork();
    }

    cluster.on('exit', function(worker, code, signal) {
        'use strict';
        console.log('worker ' + worker.process.pid + ' exit');
        process.nextTick(function() {
            cluster.fork();
        });
    });
} else {
    app.set('views', path.join(__dirname, 'views'));
    app.set('view engine', 'html');
    // app.set('view options', {
    // layout: false
    // });
    // ejs.open = '{{';
    // ejs.close = '}}';
    ejs.delimiter = '?';
    app.engine('.html', ejs.__express);
    app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
    //在console中输出访问日志
    // app.use(logger(':date - :remote-addr - :method :status :url - :response-time ms'));
    app.use(log4js.connectLogger(Logger.accessLog, {
        level: log4js.levels.INFO,
        format: ':remote-addr - :method :status HTTP/:http-version :url - [:response-time ms/:content-length B] ":referrer" ":user-agent"'
    }));
    app.use(compress());
    //通过req.cookies调用cookie
    app.use(cookieParser(config.authCookieName));
    app.use(session({
        name: 'jsid',
        store: new RedisStore({
            client: redisClient,
            ttl: 7 * 24 * 60 * 60//prefix:default:sess:
        }),
        secret: config.sessionSecret,
        resave: false,
        saveUninitialized: false
        // expires: new Date(Date.now() + config.cookieExpires),
        // maxAge: config.cookieExpires
    }));
    // app.use(bodyParser());
    app.use(bodyParser.json({
        limit: '20mb'
    }));
    app.use(bodyParser.urlencoded({
        limit: '20mb',
        extended: true
    }));
    app.use(csrf());
    // app.use(express.methodOverride());
    //设置全局响应头
    app.use(function(req, res, next) {
        'use strict';
        //config.name:响应头不支持中文
        res.setHeader('Server', config.author + '/' + config.version);
        //v0.12.0不支持设置为undefined
        res.setHeader('X-Powered-By', config.domain);
        next();
    });

    //先静态文件，后路由(虽增加IO操作，但避免session丢失问题)
    // app.use(base.init);
    routes(app, express);
    // app.use('/admin', admin);
    //
    // //静态文件路径，须在响应头设置之后，否则仍将为默认值
    // app.use(express['static'](path.join(__dirname, 'public')));
    //
    // app.use(base.final);
    // app.use(base.error);

    server = http.createServer(app);
    // io = socketio.listen(server);
    // require('./controllers/socket').initSocket(io);

    server.listen(config.port, config.host, function() {
        'use strict';
        console.log('Server listening on: ' + config.host + ', port ' + config.port);
    });
}

module.exports = app;
