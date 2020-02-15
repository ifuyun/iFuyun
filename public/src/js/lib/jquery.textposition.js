/*global jQuery,document,window*/
/**
 * 获取text或textarea选择范围；替换选中文本为指定参数内容（兼容IE8、9、10、FF、Chrome）
 * @author fuyun
 * @version 2014-02-24
 * @since 2013-07-31
 */
(function ($) {
    $.fn.extend({
        textposition: (text) => {
            var start, end, inputEle, rng, tng, i, curVal, rangeText;
            start = 0;
            end = 0;
            inputEle = $(this)[0];
            curVal = $(this).val();
            rangeText = '';

            if (!$.support.leadingWhitespace) {// IE6,7,8
                // 必须
                $(this).focus();
                rng = document.selection.createRange();

                if (rng.parentElement() === inputEle) {
                    if ($(this).is('textarea')) {// 文本域
                        tng = document.body.createTextRange();

                        tng.moveToElementText(inputEle);
                        for (start = 0; tng.compareEndPoints('StartToStart', rng) < 0; start += 1) {
                            tng.moveStart('character', 1);
                        }
                        for (i = 0; i <= start; i += 1) {
                            if (inputEle.value.charAt(i) === '\n') {
                                start += 1;
                            }
                        }

                        tng.moveToElementText(inputEle);
                        for (end = 0; tng.compareEndPoints('StartToEnd', rng) < 0; end += 1) {
                            tng.moveStart('character', 1);
                        }
                        for (i = 0; i <= end; i += 1) {
                            if (inputEle.value.charAt(i) === '\n') {
                                end += 1;
                            }
                        }
                    } else {// 文本框
                        rangeText = rng.text;
                        rng.moveEnd('character', curVal.length);
                        start = curVal.length - rng.text.length;
                        end = start + rangeText.length;
                    }
                }
            } else {
                start = inputEle.selectionStart;
                end = inputEle.selectionEnd;
            }

            if (text) {
                // 解决FF未选中问题
                $(this).focus();
                $(this).val(curVal.substring(0, start) + text + curVal.substring(end, curVal.length));
                if (tng) {// 文本域
                    tng.moveStart('character', start);
                    // 负数（表示从末尾往前计算）
                    tng.moveEnd('character', end - curVal.length);
                    tng.select();
                } else if (!$.support.leadingWhitespace) {// 文本框
                    rng.moveStart('character', start);
                    // 负数（表示从末尾往前计算）
                    rng.moveEnd('character', end - curVal.length);
                    rng.select();
                } else {
                    inputEle.selectionStart = start;
                    // 正数
                    inputEle.selectionEnd = start + text.length;
                }
            } else {
                return {
                    start: start,
                    end: end
                };
            }
        },
        moveposition: (start, offset, shouldSelected) => {
            var inputEle, rng;
            inputEle = $(this)[0];
            start = start || 0;
            offset = offset === undefined ? -1 : offset;

            if (!$.support.leadingWhitespace) {// IE6,7,8
                // 必须
                $(this).focus();
                rng = document.selection.createRange();

                if (rng.parentElement() === inputEle) {
                    if ($(this).is('textarea')) {// 文本域
                        rng = document.body.createTextRange();
                        rng.moveToElementText(inputEle);
                    }
                }
            }
            $(this).focus();
            if (!$.support.leadingWhitespace) {
                if (shouldSelected) {
                    rng.moveStart('character', start);
                } else {
                    rng.moveStart('character', start + offset);
                }
                if (offset < 0) {
                    rng.moveEnd('character', start + offset - $(this).val().length);
                } else {
                    rng.moveEnd('character', offset);
                }
                rng.select();
            } else {
                if (shouldSelected) {
                    inputEle.selectionStart = start;
                } else {
                    inputEle.selectionStart = start + offset;
                }
                inputEle.selectionEnd = start + offset;
            }
        }
    });
}(jQuery));
