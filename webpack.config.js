/*jslint nomen:true*/
/**
 * WebPack config file
 * @author Fuyun
 */
const webpack = require('webpack');
const md5Hash = require('webpack-md5-hash');
const md5HashPlugin = new md5Hash();
const path = require('path');
const glob = require('glob');
const fs = require('fs');
const argv = require('yargs').argv;
const isDev = argv.env === 'development' ? true : false;

const getEntry = function () {
    let entry = {};
    glob.sync('./public/src/js/module/**/*.js').forEach(function (name) {
        var n = name.slice(name.indexOf('module/') + 7, name.length - 3);
        entry[n] = name;
    });
    // console.log(entry);
    return entry;
};
const replaceHash = function () {
    this.plugin('done', function (stats) {
        if (!isDev) {
            const chunks = stats.compilation.namedChunks;
            const htmlFiles = glob.sync('./.tmp/step2/views/**/*.html');
            for (const curFile of htmlFiles) {
                for (const chunkKey of Object.keys(chunks)) {
                    const chunk = chunks[chunkKey];
                    const curHtml = fs.readFileSync(curFile, 'utf8');
                    const newHtml = curHtml.replace(new RegExp(chunk.name + '[\-_0-9a-zA-Z]*\.js', 'ig'), chunk.files[0]);
                    fs.writeFileSync(curFile, newHtml);
                }
            }
        }
    });
};
const commonsPlugin = new webpack.optimize.CommonsChunkPlugin({
    name: 'common',
    filename: isDev ? 'common.js' : 'common-[chunkhash:8].js',
    minChunks: 3
});
const uglifyPlugin = new webpack.optimize.UglifyJsPlugin({
    compress: {
        warnings: false
    }
});
const providePlugin = new webpack.ProvidePlugin({
    '$': 'jquery',
    'jQuery': 'jquery'
});
module.exports = {
    entry: getEntry(),
    output: {
        path: path.resolve(__dirname, 'public', isDev ? 'dev/js' : 'dist/js'),
        publicPath: './js/',
        filename: isDev ? '[name].js' : '[name]-[chunkhash:8].js'
    },
    plugins: [commonsPlugin, uglifyPlugin, providePlugin, md5HashPlugin, replaceHash],
    module: {
        rules: [
            {
                test: /\.(js|jsx)$/,
                use: 'babel-loader'
            }
        ]
    },
    resolve: {
        extensions: ['.js'],
        alias: {}
    }
};
