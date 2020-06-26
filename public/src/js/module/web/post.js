/*global $,hljs,wx*/
/* jslint nomen:true */
import http from '../../lib/http';

require('../../vendor/jquery.poshytip.min');
require('../../vendor/jquery.qrcode.min');

let service;
const popup = require('../../lib/dialog');
const $qrcodeShare = $('#qrcodeShare');
const $qrcodeReward = $('#qrcodeReward');
const url = location.href.split('#')[0];

const showCaptcha = () => {
    http.ajax({
        url: '/captcha',
        cache: true,
        data: {
            r: Math.random()
        }
    }).then((imgData) => {
        $('#captcha').attr('src', imgData);
    });
};
const getWxSign = (cb) => {
    $.ajax({
        type: 'post',
        url: '/wechat/sign',
        data: {
            url
        },
        dataType: 'json',
        headers: {
            'x-csrf-token': $('.csrfToken').val()
        },
        success: function (d) {
            $('.csrfToken').val(d.token);
            if (d.code === 0) {
                service.signData = d.data;
                cb();
            }
        },
        error: function () {
            return false;
        }
    });
};

service = {
    wxApiFlag: {},
    signData: null,
    initEvent: function () {
        $('body').on('submit', '.j-form-comment', function () {
            const $that = $(this);
            $.ajax({
                type: 'post',
                url: $that.attr('action'),
                data: $that.serialize(),
                dataType: 'json',
                headers: {
                    'x-csrf-token': $('.csrfToken').val()
                },
                success: function (d) {
                    if (d.code === 0) {
                        if (d.data.commentFlag === 'verify') {
                            popup.alert({
                                content: '评论成功，请等待回复……',
                                callback: function () {
                                    location.href = d.data.url;
                                }
                            });
                        } else {
                            location.href = d.data.url;
                        }
                    } else {
                        $('.csrfToken').val(d.token);
                        const invalidCaptcha = 480;
                        if (d.code === invalidCaptcha) {
                            showCaptcha();
                        }
                        popup.alert(d.message);
                    }
                },
                error: function () {
                    return false;
                }
            });
            return false;
        }).on('click', '.j-vote-up', function () {
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
                success: function (d) {
                    $('.csrfToken').val(d.token);
                    if (d.code === 0) {
                        $(that).find('.j-vote-count').html(d.data.commentVote);
                    } else {
                        popup.alert(d.message);
                    }
                },
                error: function () {
                    return false;
                }
            });
            return false;
        }).on('mouseover', '#btnShare', function () {
            $qrcodeShare.show();
        }).on('mouseout', '#btnShare', function () {
            $qrcodeShare.hide();
        }).on('mouseover', '#btnReward', function () {
            $qrcodeReward.show();
        }).on('mouseout', '#btnReward', function () {
            $qrcodeReward.hide();
        }).on('click', '#postContent img', function () {
            const $that = $(this);
            const $cloneImg = $that.clone(false).removeAttr('width').removeAttr('height');
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
                onclose: function () {
                    $cloneImg.remove();
                }
            });
        }).on('click', '.j-nav-btn', function () {
            $('.j-nav-mask').toggleClass('f-d-none');
            $('.j-nav-list').toggleClass('f-d-none');
        }).on('click', '.j-nav-item', function () {
            const $link = $(this).children('a');
            const curIdx = $link.data('index');
            const $sublist = $('.j-nav-sublist[data-index="' + curIdx + '"]');
            $(this).addClass('active').siblings().removeClass('active');
            if ($sublist.length > 0) {
                if ($sublist.is(':visible')) {
                    if ($link.data('type') === 'text') {
                        return;
                    }
                    location.href = $link.data('url');
                } else {
                    $sublist.removeClass('f-d-none').siblings('.j-nav-sublist').addClass('f-d-none');
                }
            } else {
                location.href = $link.data('url');
            }
        }).on('click', '.j-nav-mask', function () {
            $(this).addClass('f-d-none');
            $('.j-nav-list').addClass('f-d-none');
        });
    },
    checkAds: function () {
        const $adsEle = $('.m-ads');
        const count = $adsEle.length;
        let counter = 0;
        let visibleCount = 0;
        const visibleFlag = [];
        const timer = setInterval(function () {
            counter += 1;
            $adsEle.each(function (i, ele) {
                const hasChildren = !!$(ele).children().length;
                if (!visibleFlag[i] && hasChildren) {
                    visibleFlag[i] = true;
                    visibleCount += 1;
                    $adsEle.removeClass('f-d-none');
                }
            });
            const retry = 20;
            if (count === visibleCount || counter >= retry) {
                clearInterval(timer);
            }
        }, 100);
    },
    initWxConfig: function () {
        wx.config({
            debug: true, // 开启调试模式,调用的所有api的返回值会在客户端alert出来，若要查看传入的参数，可以在pc端打开，参数信息会通过log打出，仅在pc端时才会打印。
            appId: service.signData.appId, // 必填，公众号的唯一标识
            timestamp: service.signData.timestamp, // 必填，生成签名的时间戳
            nonceStr: service.signData.nonceStr, // 必填，生成签名的随机串
            signature: service.signData.signature, // 必填，签名
            jsApiList: ['updateAppMessageShareData', 'updateTimelineShareData', 'onMenuShareAppMessage', 'onMenuShareTimeline'] // 必填，需要使用的JS接口列表
        });
    },
    initWxEvent: function () {
        wx.ready(function () {
            service.checkJsApi(() => {
                service.initWxShareEvent();
            });
        });
        wx.error(function (res) {
            alert(res.errMsg);
        });
    },
    checkJsApi: function (cb) {
        wx.checkJsApi({
            jsApiList: ['updateAppMessageShareData', 'updateTimelineShareData', 'onMenuShareAppMessage', 'onMenuShareTimeline'],
            success: function (res) {
                // 以键值对的形式返回，可用的api值true，不可用为false
                service.wxApiFlag = res.checkResult;
                cb();
            }
        });
    },
    initWxShareEvent: function () {
        const shareData = {
            title: document.title,
            desc: $('[name="description"]').attr('content'),
            link: url,
            imgUrl: 'http://www.ifuyun.com/logo.png',
            success: function () {
                alert('已分享');
            }
        };
        if (service.wxApiFlag.updateAppMessageShareData) {
            wx.updateAppMessageShareData(shareData);
        }
        if (service.wxApiFlag.updateTimelineShareData) {
            wx.updateTimelineShareData(shareData);
        }
    }
};

$(function () {
    service.initEvent();
    getWxSign(() => {
        if (service.signData) {
            service.initWxConfig();
            service.initWxEvent();
        }
    });
    if (window.hljs) {
        hljs.initHighlightingOnLoad();
    }

    $qrcodeShare.qrcode({
        width: 160,
        height: 160,
        foreground: '#5f5f5f',
        text: $qrcodeShare.attr('data-url')
    });

    showCaptcha();
    service.checkAds();
});

// eslint-disable-next-line no-empty-function
module.exports = () => {
};
