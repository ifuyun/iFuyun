/*global $*/
define(function(require, exports, module) {
    'use strict';
    require('../vendor/dialog-plus');

    module.exports = {
        alert: function(data) {
            window.dialog({
                fixed: false,
                cssUri: '',
                title: data.title || '提示',
                content: typeof data === 'string' ? data : (data.content || ''),
                width: data.width || 360,
                showHeader: true,
                showFooter: true,
                showIcon: false,
                ok: true,
                okValue: '确定',
                onclose: data.callback || function() {}
            }).showModal();
        },
        confirm: function(data) {
            var defaults = {
                fixed: false,
                cssUri: '',
                title: '提示',
                content: '',
                width: 360,
                showHeader: true,
                showFooter: true,
                showIcon: false,
                ok: function() {},
                okValue: '确定',
                cancel: function() {},
                cancelValue: '取消'
            };
            window.dialog($.extend(true, {}, defaults, data)).showModal();
        },
        custom: function(data) {
            var defaults = {
                fixed: false,
                cssUri: '',
                title: '提示',
                content: '',
                width: 360,
                showHeader: true,
                showIcon: false,
                onshow: function() {},
                ok: function() {},
                okValue: '确定',
                cancel: function() {},
                cancelValue: '取消',
                onclose: function() {}
            };
            window.dialog($.extend(true, {}, defaults, data)).showModal();
        }
    };
});
