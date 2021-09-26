/**
 * 图书
 * @author fuyun
 * @version 3.1.0
 * @since 3.1.0(2020-02-22)
 */
const Excel = require('exceljs');
const config = require('../config/credentials');
const {sysLog: logger, formatOpLog} = require('../helper/logger');
const bookService = require('../services/book');
const STATUS_CODES = require('../services/status-codes');

module.exports = {
    importBooks(req, res, next) {
        const workbook = new Excel.Workbook();
        const filePath = config.book.excelPath;
        workbook.xlsx.readFile(filePath).then(() => {
            const worksheet = workbook.getWorksheet(1);
            let booksData = [];
            worksheet.eachRow((row, rowIdx) => {
                let rowData = [];
                row.eachCell((cell, cellIdx) => {
                    rowData[cellIdx - 1] = cell.value;
                });
                booksData[rowIdx - 1] = rowData;
            });
            const booksCount = booksData.length - 1;
            if (booksCount >= 0) {
                const colLength = booksData[0].length;
                for (let i = 1; i < booksData.length; i += 1) {
                    const curColLength = booksData[i].length;
                    for (let j = curColLength; j < colLength; j += 1) {
                        booksData[i].push('');
                    }
                    for (let j = 0; j < curColLength; j += 1) {
                        booksData[i][j] = booksData[i][j] || '';
                    }
                }
            }
            bookService.saveBooks({
                data: booksData.slice(1)
            }, () => {
                logger.info(formatOpLog({
                    fn: 'importBooks',
                    msg: `${booksCount} books is imported.`,
                    req
                }));

                res.type('application/json');
                res.send({
                    status: 200,
                    code: STATUS_CODES.SUCCESS,
                    message: null,
                    data: {
                        count: booksCount
                    }
                });
            }, (err) => {
                logger.error(formatOpLog({
                    fn: 'importBooks',
                    msg: err.messageDetail || err.message,
                    data: err.data,
                    req
                }));
                next({
                    status: 200,
                    code: STATUS_CODES.SERVER_ERROR,
                    message: err.message
                });
            });
        }, (err) => {
            next(err);
        }).catch((err) => {
            next(err);
        });
    }
};
