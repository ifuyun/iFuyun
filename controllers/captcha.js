/**
 * 验证码
 * @author fuyun
 * @version 3.5.1
 * @since 2.0.0(2017/11/16)
 */
const svgCaptcha = require('svg-captcha');

module.exports = {
    create(req, res) {
        const captcha = svgCaptcha.create({
            size: 4,
            fontSize: 36,
            width: 80,
            height: 32,
            background: '#ddd'
        });
        req.session.captcha = captcha.text;
        res.type('image/svg+xml');
        res.send(captcha.data);
    }
};
