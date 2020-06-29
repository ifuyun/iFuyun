/**
 * wechat services
 * @author fuyun
 * @version 3.3.5
 * @since 3.3.5
 */
const JsSHA = require('jssha');
const fetch = require('node-fetch');
const credentials = require('../config/credentials');
const {sysLog: logger, formatOpLog} = require('../helper/logger');
const constants = require('./constants');
const optionService = require('./option');
const STATUS_CODES = require('./status-codes');

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
     * @returns {Object} 签名结果
     */
    sign(ticket, url) {
        const argsObj = {
            'jsapi_ticket': ticket,
            nonceStr: createNonceStr(),
            timestamp: createTimestamp(),
            url
        };
        const argsStr = transformArgs(argsObj);
        const shaObj = new JsSHA('SHA-1', 'TEXT');
        shaObj.update(argsStr);
        argsObj.signature = shaObj.getHash('HEX');

        logger.info(formatOpLog({
            fn: 'sign',
            msg: 'Sign success.',
            data: argsObj
        }));

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
    async saveTokenAndTicket(data) {
        await optionService.saveOptions({
            settings: [{
                name: constants.KEY_WX_MP_ACCESS_TOKEN,
                value: data.token
            }, {
                name: constants.KEY_WX_MP_ACCESS_TOKEN_TIME,
                value: data.fetchTime
            }, {
                name: constants.KEY_WX_MP_JSAPI_TICKET,
                value: data.ticket
            }, {
                name: constants.KEY_WX_MP_JSAPI_TICKET_TIME,
                value: data.fetchTime
            }]
        });
    },
    async getTokenAndTicket() {
        try {
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
            let refresh = false;
            if (tokenStart + constants.WX_MP_ACCESS_TOKEN_EXPIRES <= nowTime) {
                refresh = true;
                token = await actions.fetchAccessToken();
            }
            if (ticketStart + constants.WX_MP_ACCESS_TOKEN_EXPIRES <= nowTime) {
                ticket = await actions.fetchJsApiTicket({
                    token
                });
            }
            if (refresh) {
                await actions.saveTokenAndTicket({
                    token,
                    ticket,
                    fetchTime: nowTime
                });
            }
            return {
                token,
                ticket,
                fetchTime: nowTime
            };
        } catch (e) {
            logger.error(formatOpLog({
                fn: 'saveOptions',
                msg: e.message
            }));
        }
    },
    async getSignature(reqUrl) {
        const data = await actions.getTokenAndTicket();
        const signData = actions.sign(data.ticket, reqUrl);
        return {
            appId: credentials.wxMpAppID,
            timestamp: signData.timestamp,
            nonceStr: signData.nonceStr,
            signature: signData.signature
        };
    }
};
module.exports = actions;
