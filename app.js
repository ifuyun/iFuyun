/* jslint nomen:true es5:true */
/**
 * 集群模式入口
 * @module app
 * @main app
 * @requires logger, server
 * @author Fuyun
 * @version 3.0.0
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
    server();
}
