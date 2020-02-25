/**
 * book services
 * @author fuyun
 * @since 2020-02-22
 * @version 3.1.0
 */
const async = require('async');
const util = require('../helper/util');
const models = require('../models/index');
const STATUS_CODES = require('./status-codes');
const {Book} = models;
const Op = models.Sequelize.Op;

module.exports = {
    saveBooks(param, successCb, errorCb) {
        models.sequelize.transaction((t) =>
            new Promise((resolve, reject) => {
                async.times(param.data.length, (i, nextFn) => {
                    const bookData = {
                        bookId: util.getUuid(),
                        bookName: param.data[i][1],
                        bookAuthor: param.data[i][2],
                        bookTranslator: param.data[i][3],
                        bookPress: param.data[i][4],
                        bookEdition: param.data[i][5],
                        bookIsbn: param.data[i][6],
                        bookPrice: param.data[i][7] || 0,
                        bookQuantity: param.data[i][8] || 1,
                        bookType: param.data[i][9] || 'book',
                        bookMediaType: param.data[i][10] || 'paper',
                        bookPurchaseChannel: param.data[i][12] || 'other',
                        bookStatus: param.data[i][13] || 'normal'
                    };
                    if (param.data[i][11]) {
                        bookData.bookPurchaseTime = new Date(param.data[i][11]);
                    }
                    Book.create(bookData, {
                        transaction: t
                    }).then((book) => nextFn(null, book));
                }, (err, result) => {
                    if (err) {
                        reject(util.catchError({
                            status: 500,
                            code: STATUS_CODES.BOOK_SAVE_ERROR,
                            message: 'Book Save Error.',
                            messageDetail: `${param.data.length} books save failed.`,
                            data: param.data
                        }));
                    } else {
                        resolve(result);
                    }
                });
            })
        ).then(successCb, errorCb);
    }
};
