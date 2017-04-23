/*jslint nomen:true*/
/**
 * WebPack config file
 */
var webpack = require('webpack');
var glob = require('glob');
var fs = require('fs');
var CopyWebpackPlugin = require('copy-webpack-plugin');

var getEntry = function () {
    'use strict';
    var entry = {};
    glob.sync('./public/src/js/module/**/*.js').forEach(function (name) {
        var n = name.slice(name.indexOf('module/') + 7, name.length - 3);
        entry[n] = name;
    });
    return entry;
};
var commonsPlugin = new webpack.optimize.CommonsChunkPlugin({
    name: 'common',
    filename: 'common_[hash:8].js',
    // chunks: []
    minChunks: 3//Infinity
});
var uglifyPlugin = new webpack.optimize.UglifyJsPlugin({
    // mangle: {
    //     except: ['$', 'exports', 'require']
    // },
    compress: {
        warnings: false
    }
});
var providePlugin = new webpack.ProvidePlugin({
    '$': 'jquery',
    'jQuery': 'jquery',
    'window.jQuery': 'jquery',
    'hljs': 'highlight'
});
/* tinymce会动态加载plugin和theme，其路径是相对js执行时的路径，且包含全局变量，
 * 因此需要独立出去，否则通过require方式会报错（插件路径问题或tinymce变量引用undefined问题）（jquery插件方式同样取不到tinymce变量）
 * 另外，通过providePlugin暴露出的tinymce对象和原全局tinymce对象并不是同一个，无法调用init方法。
 * 同时，为保持引用的一致性，将tinymce从src copy至dist，需要注意，copy是针对context的，否则将生成/public/.../tinymce子目录*/
var copyPlugin = new CopyWebpackPlugin([{
    context: './public/src/js/vendor/tinymce',
    from: '**/*',
    to: 'vendor/tinymce'
}, {
    context: './public/src/css',
    from: '**/*',
    to: '../css'
}, {
    context: './public/src/fonts',
    from: '**/*',
    to: '../fonts'
}, {
    context: './public/src/img',
    from: '**/*',
    to: '../img'
}], {
    // ignore: ['*.md'],
    copyUnmodified: true
});
/* 开启Hash后，需要将html文件中的引用同步更新
 * 只替换前后台的pages文件，无需替换elements等
 * 替换时，需要遍历所有可能的引用，因此需两层循环，且同时匹配xxx.js或xxx_[hash].js*/
var replaceHtml = function () {
    this.plugin('done', function (stats) {
        let hash = stats.hash;
        let chunks = stats.compilation.namedChunks;
        let pagePath = __dirname + '/views/v2/pages';
        let adminPagePath = __dirname + '/views/admin/pages';
        let pageFiles = fs.readdirSync(pagePath);
        let adminPageFiles = fs.readdirSync(adminPagePath);
        let htmlFiles = [];

        for (let htmlFile of pageFiles) {
            htmlFiles.push(pagePath + '/' + htmlFile);
        }
        for (let htmlFile of adminPageFiles) {
            htmlFiles.push(adminPagePath + '/' + htmlFile);
        }
        // console.log(stats);
        // console.log(chunks);
        for (let curFile of htmlFiles) {
            for (let chunkKey of Object.keys(chunks)) {
                let chunk = chunks[chunkKey];
                let curHtml = fs.readFileSync(curFile, 'utf8');
                let newHtml = curHtml.replace(new RegExp(chunk.name + '[_0-9a-zA-Z]*\.js', 'ig'), chunk.files[0]);
                // console.log(chunk.name, chunk.files, chunk.renderedHash);
                fs.writeFileSync(curFile, newHtml);
            }
        }
    });
};

module.exports = {
    //设置context时，需要同步修改entry的路径，因此此处不进行设置
    // context: __dirname + '/public/src',
    //插件项
    plugins: [commonsPlugin, uglifyPlugin, providePlugin, copyPlugin, replaceHtml],
    //入口文件配置
    entry: getEntry(),
    //输出文件配置
    output: {
        path: __dirname + '/public/dist/js',
        filename: '[name]_[hash:8].js'
    },
    externals: {},
    module: {
        //解析器
        rules: [
            {
                test: /\.css$/,
                loader: 'style!css'
            },
            {
                test: /\.js$/,
                loader: 'jsx?harmony'
            },
            {
                test: /\.scss$/,
                loader: 'style!css!sass?sourceMap'
            },
            {
                test: /\.(png|jpe?g|gif)$/,
                loader: 'url?limit=8192'
            // },
            // {
            //     test: /\.(jpe?g|png|gif|svg)$/i,
            //     loaders: [
            //         'image?{bypassOnDebug: true, progressive:true, optimizationLevel: 3, pngquant:{quality: "65-80"}}',
            //         'url?limit=8192&name=img/[hash:8].[name].[ext]'
            //     ]
            }
        ]
    },
    resolve: {
        root: __dirname + '/public/src',//查找module的根路径
        extensions: ['', '.js', '.json', '.scss', '.css'],//缺省的文件后缀
        alias: {//模块别名定义
            'jquery': __dirname + '/public/src/js/vendor/jquery-1.11.0.min.js',
            'highlight': __dirname + '/public/src/js/vendor/highlight.pack.js'
        }
    }
};