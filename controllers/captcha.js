/**
 * 验证码
 * @author fuyun
 * @since 2017/11/16
 */
const gm = require('gm').subClass({imageMagick: true});
const util = require('../helper/util');

module.exports = {
    create(req, res, next) {
        const maxFontSize = 22;
        const maxLineY = 28;
        const maxMarginLeft = 15;
        const minWaveLength = 36;

        const imgHeight = 32;
        const imgWidth = 80;
        const fontSizeRange = [16, maxFontSize];
        const blankHeightRange = [16, 24];
        const blankHeight = Math.round(Math.random() * (blankHeightRange[1] - blankHeightRange[0]) * 10) / 10 + blankHeightRange[0];
        const lineYRange = [2, maxLineY];
        const marginLeftRange = [0, maxMarginLeft];
        const waveAmplitude = (imgHeight - blankHeight) / 2;
        const waveLengthRange = [minWaveLength, 60];
        const captchaText = util.getRandomText();
        const textGravity = ['West', 'East'];
        let gmImg = gm(imgWidth, blankHeight, '#ddd');

        gmImg.background('#ddd')
            .fill('#000')
            .fontSize(Math.round(Math.random() * (fontSizeRange[1] - fontSizeRange[0]) * 10) / 10 + fontSizeRange[0])
            .gravity('Center')
            // .implode('0.1')
            .drawText(Math.round(Math.random() * (marginLeftRange[1] - marginLeftRange[0]) * 10) / 10 + marginLeftRange[0], 0, captchaText, textGravity[Math.round(Math.random())])
            .wave(waveAmplitude, Math.round(Math.random() * (waveLengthRange[1] - waveLengthRange[0]) * 10) / 10 + waveLengthRange[0])
            .drawLine(0, Math.random() * (lineYRange[1] - lineYRange[0]) + lineYRange[0], imgWidth, Math.random() * (lineYRange[1] - lineYRange[0]) + lineYRange[0])
            .drawLine(0, Math.random() * (lineYRange[1] - lineYRange[0]) + lineYRange[0], imgWidth, Math.random() * (lineYRange[1] - lineYRange[0]) + lineYRange[0])
            .drawLine(0, Math.random() * (lineYRange[1] - lineYRange[0]) + lineYRange[0], imgWidth, Math.random() * (lineYRange[1] - lineYRange[0]) + lineYRange[0])
            .toBuffer('.png', (err, buffers) => {
                if (err) {
                    err.code = 500;
                    return next(err);
                }
                req.session.captcha = captchaText;
                res.send('data:image/png;base64,' + buffers.toString('base64'));
            });
    }
};
