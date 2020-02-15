/*global $*/
let http = {
    ajax(config) {
        let defer = $.Deferred();

        config = $.extend(true, {
            type: 'get',
            cache: false,
            contentType: 'application/json'
        }, config);
        // 默认timeout超时时间10分钟
        if (!config.timeout) {
            config.timeout = 10 * 60 * 1000;
        }
        $.ajax(config).done(function () {
            defer.resolve(...arguments);
        }).fail(function () {
            defer.reject(...arguments);
        });
        return defer.promise();
    },
    get(url, data) {
        let defer = $.Deferred();

        $.get(url, data).done(function () {
            defer.resolve(...arguments);
        }).fail(function () {
            defer.reject(...arguments);
        });
        return defer.promise();
    },
    post(config) {
        let defer = $.Deferred();

        config.data = JSON.stringify(config.data || {});
        config = $.extend(true, {
            type: 'post',
            cache: false,
            contentType: 'application/json'
        }, config);
        $.ajax(config).done(function () {
            defer.resolve(...arguments);
        }).fail(function () {
            defer.reject(...arguments);
        });
        return defer.promise();
    },
    postEncoded(url, data) {
        let defer = $.Deferred();

        $.ajax({
            type: 'post',
            url: url,
            contentType: 'application/x-www-form-urlencoded',
            transformRequest: function (params) {
                // let str = [];
                // let p;
                // for (p in obj) {// 可以直接调$.param
                //     str.push(encodeURIComponent(p) + '=' + encodeURIComponent(obj[p]));
                // }
                // return str.join('&');
                return $.param(params);
            },
            data: data
        }).done(function () {
            defer.resolve(...arguments);
        }).fail(function () {
            defer.reject(...arguments);
        });
        return defer.promise();
    }
};

export default http;
