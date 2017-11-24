/* jslint nomen:true es5:true */
/* global console,process,__dirname */
/**
 * 集群模式入口
 * @module app
 * @main app
 * @requires logger, server
 * @author Fuyun
 * @version 2.0.0
 * @since 2.0.0
 */
const cluster = require('cluster');
const numCPUs = require('os').cpus().length;
const {threadLog, formatOpLog} = require('./helper/logger');
const server = require('./server');

if (cluster.isMaster) {
    for (let cpuIdx = 0; cpuIdx < numCPUs; cpuIdx += 1) {
        cluster.fork();
    }

    cluster.on('exit', function (worker, code, signal) {
        threadLog.warn(formatOpLog({
            msg: `Worker ${worker.process.pid} exit.`,
            data: {
                code,
                signal
            }
        }));
        process.nextTick(function () {
            threadLog.info(formatOpLog({
                msg: 'New process is forking...'
            }));
            cluster.fork();
        });
    });
} else {// cluster.isWorker
    server();
}
