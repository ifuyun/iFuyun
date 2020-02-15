/*global $*/
'use strict';
/**
 * built-in Rules:
 *
 * required – Makes the element required.
 * remote – Requests a resource to check the element for validity.
 * minlength – Makes the element require a given minimum length.
 * maxlength – Makes the element require a given maxmimum length.
 * rangelength – Makes the element require a given value range.
 * min – Makes the element require a given minimum.
 * max – Makes the element require a given maximum.
 * range – Makes the element require a given value range.
 * email – Makes the element require a valid email
 * url – Makes the element require a valid url
 * date – Makes the element require a date.
 * dateISO – Makes the element require an ISO date.
 * number – Makes the element require a decimal number.
 * digits – Makes the element require digits only.
 * creditcard – Makes the element require a credit card number.
 * equalTo – Requires the element to be the same as another one
 */
$.validator.addMethod('datetime', function (v, e, p) {
    var reg;

    switch (p) {
        case 'Y-m-d':
            reg = /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12][0-9]|3[01])$/i;
            break;
        case 'Y-m-d H:i':
            reg = /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12][0-9]|3[01]) (?:[0-1][0-9]|2[0-3]):(?:[0-5][0-9])$/i;
            break;
        case 'Y-m-d H:i:s':
            reg = /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12][0-9]|3[01]) (?:[0-1][0-9]|2[0-3]):(?:[0-5][0-9]):(?:[0-5][0-9])$/i;
            break;
        case 'H:i':
            reg = /^(?:[0-1][0-9]|2[0-3]):(?:[0-5][0-9])$/i;
            break;
        default:
            reg = /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12][0-9]|3[01])$/i;
    }

    return this.optional(e) || reg.test(v);
}, $.validator.format('Please enter a value with a valid date/time type.'));

$.validator.addMethod('username', function (v, e, p) {
    return this.optional(e) || /^[0-9a-zA-Z\u4E00-\uFA29_\-]*$/.test(v);
}, $.validator.format('名称仅包含汉字、数字、字母、下划线、减号'));

$.validator.addMethod('mobile', function (v, e, p) {
    return this.optional(e) || /^1[3578]\d{9}$/i.test(v);
}, $.validator.format('手机号码为11位数字'));
