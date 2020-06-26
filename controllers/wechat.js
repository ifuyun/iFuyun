/**
 *
 * @author fuyun
 * @version 3.3.5
 * @since 2020-06-26
 */
const STATUS_CODES = require('../services/status-codes');
const wxService = require('../services/wechat');

module.exports = {
    getSignature(req, res) {
        const url = req.body.url;
        res.type('application/json');
        if (!url) {
            res.send({
                code: STATUS_CODES.BAD_REQUEST,
                message: 'URL can not be null.'
            });
            return;
        }
        wxService.getSignature(url).then((data) => {
            res.send({
                code: STATUS_CODES.SUCCESS,
                message: null,
                token: req.csrfToken(),
                data
            });
        }).catch((err) => {
            res.send({
                code: STATUS_CODES.SERVER_ERROR,
                message: err.message,
                token: req.csrfToken()
            });
        });
    }
};
