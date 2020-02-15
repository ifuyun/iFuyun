/*global $, require, window*/
'use strict';
require('../vendor/dialog-plus');

module.exports = {
    alert: (data) => {
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
            onclose: data.callback || (() => {
            })
        }).showModal();
    },
    confirm: (data) => {
        var defaults = {
            fixed: false,
            cssUri: '',
            title: '提示',
            content: '',
            width: 360,
            showHeader: true,
            showFooter: true,
            showIcon: false,
            ok: () => {
            },
            okValue: '确定',
            cancel: () => {
            },
            cancelValue: '取消'
        };
        window.dialog($.extend(true, {}, defaults, data)).showModal();
    },
    custom: (data) => {
        var defaults = {
            fixed: false,
            cssUri: '',
            title: '提示',
            content: '',
            width: 360,
            showHeader: true,
            showIcon: false,
            onshow: () => {
            },
            ok: () => {
            },
            okValue: '确定',
            cancel: () => {
            },
            cancelValue: '取消',
            onclose: () => {
            }
        };
        window.dialog($.extend(true, {}, defaults, data)).showModal();
    }
};
