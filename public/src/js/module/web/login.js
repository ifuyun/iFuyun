/* jslint nomen:true */
/*global $*/
require('../../vendor/jquery.cookie.min');
require('../../vendor/jquery.poshytip.min');
require('../../vendor/validate/jquery.validate.min');
require('../../vendor/json2');

const util = require('../../lib/util');
const md5 = require('../../vendor/md5.min');
let service;
const $userLogin = $('#userLogin');
const $userPass = $('#userPass');

service = {
    shake: function ($target, offset, interval, callback) {
        $target.css({
            'margin-left': offset.shift() + 'px'
        });
        if (offset.length > 0) {
            setTimeout(function () {
                service.shake($target, offset, interval, callback);
            }, interval);
        } else {
            callback();
        }
    },
    doShake: function ($input, msg, offset) {
        service.shake($('.g-view-login'), offset, 10, function () {
            $('.g-view-login').css({
                'margin-left': '0px'
            });
            util.showTip($input, msg);
            $input.focus();
        });

        return false;
    },
    doLogin: function () {
        const userLogin = $userLogin.val();
        const userPass = $userPass.val();
        const margin = 15;
        const marginTwice = 30;
        let offset = [margin, marginTwice, margin, 0, -margin, -marginTwice, -margin, 0];
        offset = offset.concat(offset.concat(offset));

        if (!userLogin) {
            return service.doShake($userLogin, '请输入用户名', offset);
        }
        if (!userPass) {
            return service.doShake($userPass, '请输入密码', offset);
        }

        $.ajax({
            url: '/user/login',
            cache: false,
            data: {
                username: userLogin,
                password: md5(userPass),
                rememberMe: $('#rememberMe').val(),
                '_csrf': $('#csrfToken').val()
            },
            type: 'post',
            dataType: 'json',
            success: function (d) {
                if (d.code !== 0) {
                    if (d.token) {
                        $('#csrfToken').val(d.token);
                    }
                    service.doShake($userPass, d.message, offset);
                } else {
                    // location.assign
                    location.replace(d.data.url);
                }
            },
            error: function (xhr) {
                let d;
                try {
                    d = JSON.parse(xhr.responseText);
                } catch (e) {
                    d = {
                        'status': 500,
                        'code': 1,
                        'message': '登录失败，请重新登录'
                    };
                }
                if (d.token) {
                    $('#csrfToken').val(d.token);
                }
                service.doShake($userPass, d.message || '登录失败，请重新登录', offset);
            }
        });

        return false;
    },
    initEvent: function () {
        $('.m-form-login .u-input-login').focus(function () {
            $(this).addClass('focus');
        }).blur(function () {
            $(this).removeClass('focus');
        }).change(function () {
            if ($(this).val()) {
                $(this).poshytip('disable');
            } else {
                $(this).poshytip('enable');
            }
        });
        if ($userLogin.val()) {
            $userPass.focus();
        } else {
            $userLogin.focus();
        }
        $('.m-form-login').on('submit', service.doLogin);
    }
};

$(function () {
    service.initEvent();

    $userLogin.val($.cookie('username'));
    if ($.cookie('rememberMe') === '1') {
        $('#rememberMe').attr({
            'checked': 'checked'
        });
    }
});

module.exports = () => {
};
