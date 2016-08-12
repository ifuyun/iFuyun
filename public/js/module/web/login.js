/*jslint nomen:true*/
/*global $*/
define(function (require, exports, module) {
    'use strict';
    var util = require('../../lib/util'), md5 = require('../../vendor/md5'), service;

    require('../../vendor/jquery.cookie.min');
    require('../../vendor/jquery.poshytip.min');
    require('../../vendor/json2');

    service = {
        // poshytip: function ($input, msg) {
            // $input.poshytip('disable');
            // $input.poshytip('destroy');
            // $input.poshytip({
                // content: msg,
                // className: 'poshytip',
                // showOn: 'focus',
                // alignTo: 'target',
                // alignX: 'right',
                // alignY: 'center',
                // offsetX: 10,
                // offsetY: 0,
                // showTimeout: 10
            // });
        // },
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
            var offset = [15, 30, 15, 0, -15, -30, -15, 0];
            offset = offset.concat(offset.concat(offset));

            if (!$('#userLogin').val()) {
                return service.doShake($('#userLogin'), '请输入用户名', offset);
            }
            if (!$('#userPass').val()) {
                return service.doShake($('#userPass'), '请输入密码', offset);
            }

            $.ajax({
                url: '/user/login',
                cache: false,
                // data: $('.m-form-login').serialize(),
                data: {
                    username: $('#userLogin').val(),
                    password: md5($('#userPass').val()),
                    rememberMe: $('#rememberMe').val(),
                    _csrf: $('#csrfToken').val()
                },
                type: 'post',
                dataType: 'json',
                success: function (d, s, xhr) {
                    if (d.code !== 0) {
                        service.doShake($('#userPass'), d.message, offset);
                    } else {
                        location.replace(d.data.url);
                        //assign
                    }
                },
                error: function (xhr, s, err) {
                    var d;
                    try {
                        d = JSON.parse(xhr.responseText);
                    } catch (e) {
                        d = {
                            'status': 500,
                            'code': 1,
                            'message': '登录失败，请重新登录'
                        };
                    }
                    service.doShake($('#userPass'), d.message || '登录失败，请重新登录', offset);
                }
            });

            return false;
        },
        initEvent: function () {
            $('.m-form-login .u-input-login').focus(function (e) {
                $(this).addClass('focus');
            }).blur(function (e) {
                $(this).removeClass('focus');
            }).change(function (e) {
                if ($(this).val()) {
                    $(this).poshytip('disable');
                } else {
                    $(this).poshytip('enable');
                }
            });
            if ($('#userLogin').val()) {
                $('#userPass').focus();
            } else {
                $('#userLogin').focus();
            }
            $('.m-form-login').on('submit', service.doLogin);
        }
    };

    $(function () {
        service.initEvent();

        $('#userLogin').val($.cookie('username'));
        if ($.cookie('rememberMe') === '1') {
            $('#rememberMe').attr({
                'checked': 'checked'
            });
        }
    });
});
