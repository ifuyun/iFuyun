/*global $*/
'use strict';
require('../vendor/jquery.poshytip.min');
require('./validate/customRules');

module.exports = {
    initValidate: function () {
        const that = this;

        $.validator.setDefaults({
            errorPlacement: function ($label, $inputEle) {
                $inputEle.poshytip('disable');
                $inputEle.poshytip('destroy');
                if (!$label.is(':empty')) {
                    // $inputEle.closest('.form-group').addClass('has-error');
                    // $inputEle.poshytip({
                    // className: 'poshytip',
                    // showOn: 'focus',
                    // alignTo: 'target',
                    // alignX: 'inner-left',
                    // alignY: 'top',
                    // offsetX: 0,
                    // offsetY: 5,
                    // showTimeout: 10,
                    // content: $label.html()
                    // });
                    that.showTip($inputEle, $label.html());
                } else {
                    // $inputEle.closest('.form-group').removeClass('has-error');
                    $inputEle.poshytip('disable');
                    $inputEle.poshytip('destroy');
                }
            },
            success: function ($label, inputEle) {
                // $(inputEle).poshytip('disable').poshytip('destroy');
            }
        });
        // IE浏览器中下拉框的冒泡提示会导致无法选择选项，改进为点击时提示
        $('body').on('click', 'select.error', function () {
            $(this).poshytip('show');
        });
    },
    hideTip: function ($input) {
        $input.poshytip('disable').poshytip('destroy');
    },
    showTip: function ($input, msg) {
        this.hideTip($input);
        $input.poshytip({
            content: msg,
            className: 'poshytip',
            showOn: 'focus',
            alignTo: 'target',
            alignX: 'right',
            alignY: 'center',
            offsetX: 10,
            offsetY: 0,
            showTimeout: 10
        });
    },
    /**
     * 监听指定元素只允许其输入数字和部分控制字符，即屏蔽除数字、.(110,190)、Tab(9)、Delete(46)和退格键(8)和左右箭头外的所有输入
     * @param {Object} cfgObj 配置对象，包括：待监听元素选择符、是否小数、是否负数
     * @return {*} none
     */
    filterNonNumInput: function (cfgObj) {
        cfgObj = $.extend({
            srcEleStr: '',
            isFraction: false,
            isNegative: false,
            allowPlus: false
        }, cfgObj);

        $('body').on('keydown', cfgObj.srcEleStr, function (e) {
            const curKey = e.which;
            // Enter; <--,Tab,Delete; <-,->; Home,End
            const ctrlKeys = [13, 8, 9, 46, 37, 39, 36, 35];

            if (!e.shiftKey && ((curKey > 95 && curKey < 106) || (curKey > 47 && curKey < 58))) {// 0-9
                return true;
            }
            if (ctrlKeys.includes(curKey)) {
                return true;
            }
            if (cfgObj.isFraction && (curKey === 110 || curKey === 190)) {// .
                return true;
            }
            if (cfgObj.isNegative && (curKey === 109 || (curKey === 173 && !e.shiftKey))) {// -
                return true;
            }
            if (cfgObj.allowPlus && (curKey === 107 || (curKey === 61 && e.shiftKey))) {// +
                return true;
            }
            e.preventDefault();
        });
    }
};
