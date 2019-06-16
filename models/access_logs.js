module.exports = function (sequelize, DataTypes) {
    return sequelize.define('accessLogs', {
        logId: {
            type: DataTypes.CHAR(16),
            allowNull: false,
            defaultValue: '',
            primaryKey: true,
            field: 'log_id'
        },
        fromUrl: {
            type: DataTypes.STRING(512),
            allowNull: false,
            defaultValue: '',
            field: 'from_url'
        },
        requestUrl: {
            type: DataTypes.STRING(512),
            allowNull: false,
            defaultValue: '',
            field: 'request_url'
        },
        requestPage: {
            type: DataTypes.STRING(512),
            allowNull: false,
            defaultValue: '',
            field: 'request_page'
        },
        accessTime: {
            type: DataTypes.DATE,
            allowNull: false,
            field: 'access_time'
        },
        userIp: {
            type: DataTypes.STRING(32),
            allowNull: false,
            defaultValue: '',
            field: 'user_ip'
        },
        userAgent: {
            type: DataTypes.STRING(512),
            allowNull: false,
            defaultValue: '',
            field: 'user_agent'
        },
        userId: {
            type: DataTypes.CHAR(16),
            allowNull: false,
            defaultValue: '',
            field: 'user_id'
        },
        os: {
            type: DataTypes.STRING(64),
            allowNull: false,
            defaultValue: '',
            field: 'os'
        },
        osVersion: {
            type: DataTypes.STRING(32),
            allowNull: false,
            defaultValue: '',
            field: 'os_version'
        },
        osX64Flag: {
            type: DataTypes.INTEGER(1).UNSIGNED,
            allowNull: false,
            defaultValue: '0',
            field: 'os_x64_flag'
        },
        browser: {
            type: DataTypes.STRING(64),
            allowNull: false,
            defaultValue: '',
            field: 'browser'
        },
        browserVersion: {
            type: DataTypes.STRING(32),
            allowNull: false,
            defaultValue: '',
            field: 'browser_version'
        },
        javascriptFlag: {
            type: DataTypes.INTEGER(1).UNSIGNED,
            allowNull: false,
            defaultValue: '0',
            field: 'javascript_flag'
        },
        cookiesFlag: {
            type: DataTypes.INTEGER(1).UNSIGNED,
            allowNull: false,
            defaultValue: '0',
            field: 'cookies_flag'
        },
        cssVersion: {
            type: DataTypes.STRING(16),
            allowNull: false,
            defaultValue: '',
            field: 'css_version'
        },
        mobileFlag: {
            type: DataTypes.INTEGER(1).UNSIGNED,
            allowNull: false,
            defaultValue: '0',
            field: 'mobile_flag'
        },
        ajaxFlag: {
            type: DataTypes.INTEGER(1).UNSIGNED,
            allowNull: false,
            defaultValue: '0',
            field: 'ajax_flag'
        },
        javaappletsFlag: {
            type: DataTypes.INTEGER(1).UNSIGNED,
            allowNull: false,
            defaultValue: '0',
            field: 'javaapplets_flag'
        },
        activexFlag: {
            type: DataTypes.INTEGER(1).UNSIGNED,
            allowNull: false,
            defaultValue: '0',
            field: 'activex_flag'
        },
        crawlerFlag: {
            type: DataTypes.INTEGER(1).UNSIGNED,
            allowNull: false,
            defaultValue: '0',
            field: 'crawler_flag'
        },
        vbscriptFlag: {
            type: DataTypes.INTEGER(1).UNSIGNED,
            allowNull: false,
            defaultValue: '0',
            field: 'vbscript_flag'
        }
    }, {
        tableName: 'access_logs',
        createdAt: 'access_time',
        updatedAt: false,
        deletedAt: false
    });
};
