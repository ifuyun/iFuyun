/*global $,hljs*/
/*jslint nomen:true*/
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
    initEvent: function () {
        $('body').on('submit', '.j-form-comment', function () {
            const $that = $(this);
            $.ajax({
                type: 'post',
                url: $that.attr('action'),
                data: $that.serialize(),
                dataType: 'json',
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
                        if (d.code === 480) {
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
            const $sublist =  $('.j-nav-sublist[data-index="' + curIdx + '"]');
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
        const $adsEle = $('.m-ads-widget');
        let counter = 0;
        const timer = setInterval(function () {
            const hasChildren = !!$adsEle.children().length;
            counter += 1;
            if (hasChildren) {
                $adsEle.show();
            }
            if (hasChildren || counter >= 20) {
                clearInterval(timer);
            }
        }, 100);
    }
};

$(function () {
    service.initEvent();
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

module.exports = () => {
};
