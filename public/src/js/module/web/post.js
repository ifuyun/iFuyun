/*global $,hljs*/
/* jslint nomen:true */
import http from '../../lib/http';

require('../../vendor/jquery.poshytip.min');
require('../../vendor/jquery.qrcode.min');

let service;
const popup = require('../../lib/dialog');
const $qrcodeShare = $('#qrcodeShare');
const $qrcodeReward = $('#qrcodeReward');

function showCaptcha() {
    http.ajax({
        url: '/captcha',
        cache: true,
        data: {
            r: Math.random()
        }
    }).then((imgData) => {
        $('#captcha').attr('src', imgData);
    });
}

service = {
    initEvent: () => {
        $('body').on('submit', '.j-form-comment', () => {
            const $that = $(this);
            $.ajax({
                type: 'post',
                url: $that.attr('action'),
                data: $that.serialize(),
                dataType: 'json',
                success: (d) => {
                    if (d.code === 0) {
                        if (d.data.commentFlag === 'verify') {
                            popup.alert({
                                content: '评论成功，请等待回复……',
                                callback: () => {
                                    location.href = d.data.url;
                                }
                            });
                        } else {
                            location.href = d.data.url;
                        }
                    } else {
                        $('.csrfToken').val(d.token);
                        if (d.code === 480) {
                            showCaptcha();
                        }
                        popup.alert(d.message);
                    }
                },
                error: () => {
                    return false;
                }
            });
            return false;
        }).on('click', '.j-vote-up', () => {
            const that = this;
            $.ajax({
                type: 'post',
                url: '/post/comment/vote',
                data: {
                    commentId: $(this).attr('data-comment'),
                    type: 'up',
                    _csrf: $('.csrfToken').val()
                },
                dataType: 'json',
                success: (d) => {
                    $('.csrfToken').val(d.token);
                    if (d.code === 0) {
                        $(that).find('.j-vote-count').html(d.data.commentVote);
                    } else {
                        popup.alert(d.message);
                    }
                },
                error: () => {
                    return false;
                }
            });
            return false;
        }).on('mouseover', '#btnShare', () => {
            $qrcodeShare.show();
        }).on('mouseout', '#btnShare', () => {
            $qrcodeShare.hide();
        }).on('mouseover', '#btnReward', () => {
            $qrcodeReward.show();
        }).on('mouseout', '#btnReward', () => {
            $qrcodeReward.hide();
        }).on('click', '#postContent img', () => {
            const $that = $(this);
            const $cloneImg = $that.clone(false);
            popup.custom({
                title: ' ',
                content: $cloneImg,
                width: '100%',
                showHeader: true,
                showFooter: false,
                quickClose: false,
                beforeRemove: false,
                ok: false,
                cancel: true,
                cancelValue: '关闭',
                onclose: () => {
                    $cloneImg.remove();
                }
            });
        });
    }
};

$(() => {
    service.initEvent();
    hljs.initHighlightingOnLoad();

    $qrcodeShare.qrcode({
        width: 150,
        height: 150,
        foreground: '#5f5f5f',
        text: $qrcodeShare.attr('data-url')
    });
    $qrcodeReward.qrcode({
        width: 150,
        height: 150,
        foreground: '#5f5f5f',
        text: 'https://wx.tenpay.com/f2f?t=AQAAAHJba4G%2FaqEgOMVB%2FbNG3ac%3D'
    });

    showCaptcha();
});

module.exports = () => {
};
