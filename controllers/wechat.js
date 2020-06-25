/**
 *
 * @author fuyun
 * @version 3.3.5
 * @since 2020-06-25
 */
const JsSHA = require('jssha');
const fetch = require('node-fetch');
const credentials = require('../config/credentials');
const {sysLog: logger, formatOpLog} = require('../helper/logger');
const constants = require('../services/constants');
const optionService = require('../services/option');
const STATUS_CODES = require('../services/status-codes');

const createNonceStr = () => {
    const alphaDigitCount = 36;
    const strLength = 15;
    return Math.random().toString(alphaDigitCount).substr(2, strLength);
};

const createTimestamp = () => Math.ceil(Date.now() / 1000) + '';

const transformArgs = (args) => {
    let keys = Object.keys(args);
    keys = keys.sort();
    let argsArr = [];
    keys.forEach((key) => {
        argsArr.push(key.toLowerCase() + '=' + args[key]);
    });

    return argsArr.join('&');
};

const actions = {
    /**
     * 签名算法
     * @param {String} ticket 用于签名的 jsapi_ticket
     * @param {String} url 用于签名的 url
     * @returns {{jsapi_ticket: *, nonceStr: string, url: *, timestamp: string}} 签名结果
     */
    sign(ticket, url) {
        var argsObj = {
            'jsapi_ticket': ticket,
            nonceStr: createNonceStr(),
            timestamp: createTimestamp(),
            url
        };
        var argsStr = transformArgs(argsObj);
        const shaObj = new JsSHA(argsStr, 'TEXT');
        argsObj.signature = shaObj.getHash('SHA-1', 'HEX');

        return argsObj;
    },
    async fetchAccessToken() {
        const url = 'https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential';
        const data = await fetch(`${url}&appid=${credentials.wxMpAppID}&secret=${credentials.wxMpAppSecret}`)
            .then((res) => res.json());

        if (data.access_token) {
            return data.access_token;
        }
        logger.error(formatOpLog({
            fn: 'fetchAccessToken',
            msg: data.errmsg || 'Fetch access_token fail.',
            data: {
                code: data.errcode || STATUS_CODES.UNKNOWN_ERROR
            }
        }));
        throw new Error('Fetch access_token fail.');
    },
    async fetchJsApiTicket(param) {
        const url = 'https://api.weixin.qq.com/cgi-bin/ticket/getticket?type=jsapi';
        const data = await fetch(`${url}&access_token=${param.token}`)
            .then((res) => res.json());

        if (data.ticket) {
            return data.ticket;
        }
        logger.error(formatOpLog({
            fn: 'fetchJsApiTicket',
            msg: data.errmsg || 'Fetch jsapi_ticket fail.',
            data: {
                code: data.errcode || STATUS_CODES.UNKNOWN_ERROR
            }
        }));
        throw new Error('Fetch jsapi_ticket fail.');
    },
    async getTokenAndTicket() {
        const data = await optionService.getOptionsByKeys({
            optionKeys: [
                constants.KEY_WX_MP_ACCESS_TOKEN,
                constants.KEY_WX_MP_ACCESS_TOKEN_TIME,
                constants.KEY_WX_MP_JSAPI_TICKET,
                constants.KEY_WX_MP_JSAPI_TICKET_TIME
            ]
        });
        let token = data[constants.KEY_WX_MP_ACCESS_TOKEN].optionValue;
        let tokenStart = +data[constants.KEY_WX_MP_ACCESS_TOKEN_TIME].optionValue || 0;
        let ticket = data[constants.KEY_WX_MP_JSAPI_TICKET].optionValue;
        let ticketStart = +data[constants.KEY_WX_MP_JSAPI_TICKET_TIME].optionValue || 0;

        const nowTime = Math.ceil(Date.now() / 1000);
        if (tokenStart + constants.WX_MP_ACCESS_TOKEN_EXPIRES <= nowTime) {
            token = await actions.fetchAccessToken();
        }
        if (ticketStart + constants.WX_MP_ACCESS_TOKEN_EXPIRES <= nowTime) {
            ticket = await actions.fetchJsApiTicket({
                token
            });
        }
        return {
            token,
            ticket
        };
    }
};
module.exports = actions;
