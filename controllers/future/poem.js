/**
 *
 * @author fuyun
 * @version 3.4.0
 * @since 3.4.0
 */
const fs = require('fs');
const path = require('path');
const appConfig = require('../../config/core');
const {sysLog: logger, formatOpLog} = require('../../helper/logger');
module.exports = {
    list(req, res, next) {
        fs.readFile(path.join(__dirname, 'poems.txt'), 'utf8', (err, data) => {
            if (err) {
                logger.error(formatOpLog({
                    fn: 'poem/list',
                    msg: err,
                    req
                }));
                return next(err);
            }
            const poemArr = data.split('\n');
            const poemData = [];
            poemArr.forEach((poem) => {
                poemData.push(poem.split('\t'));
            });
            res.render(`${appConfig.pathViews}/future/poemList`, {poemData});
        });
    },
    game(req, res, next) {
        fs.readFile(path.join(__dirname, 'poems.txt'), 'utf8', (err, data) => {
            if (err) {
                logger.error(formatOpLog({
                    fn: 'poem/game',
                    msg: err,
                    req
                }));
                return next(err);
            }
            const poemArr = data.split('\n');
            const poemData = [];
            poemArr.forEach((poem) => {
                poemData.push(poem.split('\t'));
            });
            const poemCount = poemArr.length;
            const poemIdx = Math.floor(Math.random() * poemCount);
            res.render(`${appConfig.pathViews}/future/poemGame`, {
                poemData: poemData[poemIdx],
                poemIndex: poemIdx + 1,
                poemCount
            });
        });
    }
};
