/**
 * Gulp Config File
 * @author Fuyun
 */
const gulp = require('gulp');
const path = require('path');
const runSequence = require('run-sequence');
const clean = require('gulp-clean');
const gulpif = require('gulp-if');
const useref = require('gulp-useref');
const cleanCss = require('gulp-clean-css');
const imagemin = require('gulp-imagemin');
const pngquant = require('imagemin-pngquant');
const rev = require('gulp-rev');
const revReplace = require('gulp-rev-replace');
const argv = require('yargs').argv;
const config = require('./config-gulp.json');
const gutil = require('gulp-util');
const less = require('gulp-less');
const webpack = require('webpack');
const uglify = require('gulp-uglify');
const webpackConfig = require('./webpack.config');

gulp.task('clean', function () {
    return gulp.src([config.pathDist, config.pathTmp], {
        read: false
    }).pipe(clean());
});

gulp.task('less', function (cb) {
    return gulp.src(path.join(config.pathSrc, config.pathLess, '**/*.less'))
        .pipe(less())
        .pipe(gulp.dest(path.join(config.pathSrc, config.pathCss)));
});

const checkJsFile = function (file) {
    if (/[\-\.]min.js$/.test(file.path)) {
        return false;
    }
    if (/.js$/.test(file.path)) {
        return true;
    }
    return false;
};
/**
 * 针对较大的第三方库（>100KB），通过webpack打包性能较差；
 * 但gulp方式下，useref与webpack的结合不是很优雅（css、js的搜索源及路径问题）
 */
gulp.task('useref-html', function () {
    return gulp.src(path.join(config.pathViews, config.pathViewsSrc, '**/*.{html,htm,ejs}'))
        .pipe(useref({
            searchPath: config.pathSrc
        }))
        .pipe(gulpif(checkJsFile, uglify()))
        .pipe(gulpif('*.css', cleanCss()))
        .pipe(gulp.dest(config.pathTmp1));
});
gulp.task('useref', ['useref-html']);

gulp.task('imagemin', function () {
    if (argv.imgMin && argv.imgMin === 'on') {
        return gulp.src(path.join(config.pathSrc, '**/*.{jpg,jpeg,gif,png}'))
            .pipe(imagemin({
                // jpg
                progressive: true,
                // png
                use: [pngquant({
                    quality: 90
                })]
            }))
            .pipe(gulp.dest(config.pathTmp1));
    }
    return gulp.src(path.join(config.pathSrc, '**/*.{jpg,jpeg,gif,png}'))
        .pipe(gulp.dest(config.pathTmp1));
});

gulp.task('rev-image', function () {
    return gulp.src([path.join(config.pathTmp1, '**/*.{jpg,jpeg,gif,png}')])
        .pipe(rev())
        .pipe(gulp.dest(config.pathTmp2))
        .pipe(rev.manifest('rev-manifest-img.json'))
        .pipe(gulp.dest(config.pathTmp2));
});

gulp.task('revreplace-css', function () {
    const manifest = gulp.src([
        path.join(config.pathTmp2, 'rev-manifest-img.json')
    ]);

    return gulp.src(path.join(config.pathTmp1, '**/*.css'))
        .pipe(revReplace({
            manifest: manifest,
            replaceInExtensions: ['.css'],
            prefix: ''
        }))
        .pipe(gulp.dest(config.pathTmp1));
});

gulp.task('rev-css', function () {
    return gulp.src([path.join(config.pathTmp1, '**/*.css')])
        .pipe(rev())
        .pipe(gulp.dest(config.pathTmp2))
        .pipe(rev.manifest('rev-manifest-css.json'))
        .pipe(gulp.dest(config.pathTmp2));
});

gulp.task('rev-js', function () {
    return gulp.src([path.join(config.pathTmp1, '**/*.js')])
        .pipe(rev())
        .pipe(gulp.dest(config.pathTmp2))
        .pipe(rev.manifest('rev-manifest-js.json'))
        .pipe(gulp.dest(config.pathTmp2));
});

gulp.task('revreplace-ejs', function () {
    const manifest = gulp.src([
        path.join(config.pathTmp2, 'rev-manifest-img.json'),
        path.join(config.pathTmp2, 'rev-manifest-css.json'),
        path.join(config.pathTmp2, 'rev-manifest-js.json')
    ]);

    return gulp.src(path.join(config.pathTmp1, '**/*.html'))
        .pipe(revReplace({
            manifest: manifest,
            replaceInExtensions: ['.html'],
            prefix: ''
        }))
        .pipe(gulp.dest(path.join(config.pathTmp2, config.pathViews)));
});

gulp.task('copy-build-css', function () {
    return gulp.src(path.join(config.pathTmp2, config.pathCss, '**'))
        .pipe(gulp.dest(path.join(config.pathDist, config.pathCss)));
});

gulp.task('copy-build-js', function () {
    return gulp.src(path.join(config.pathTmp2, config.pathJs, '**'))
        .pipe(gulp.dest(path.join(config.pathDist, config.pathJs)));
});

gulp.task('copy-build-image', function () {
    return gulp.src(path.join(config.pathTmp2, config.pathImg, '**'))
        .pipe(gulp.dest(path.join(config.pathDist, config.pathImg)));
});

gulp.task('copy-build-fonts', function () {
    return gulp.src(path.join(config.pathSrc, config.pathFonts, '**'))
        .pipe(gulp.dest(path.join(config.pathDist, config.pathFonts)));
});

gulp.task('copy-build-views', function () {
    return gulp.src(path.join(config.pathTmp2, config.pathViews, '**'))
        .pipe(gulp.dest(path.join(config.pathViews, config.pathViewsDist)));
});

gulp.task('copy-js-plugin', function () {
    return gulp.src(path.join(config.pathSrc, config.pathJsPluginSrc, '**'))
        .pipe(gulp.dest(path.join(config.pathDist, config.pathJsPluginDist)));
});

gulp.task('copy-build', ['copy-build-css', 'copy-build-js', 'copy-build-image', 'copy-build-fonts', 'copy-js-plugin', 'copy-build-views']);

const compiler = webpack(webpackConfig);
gulp.task('webpack', function (cb) {
    compiler.run(function (err, stats) {
        if (err) {
            throw new gutil.PluginError('webpack: ', err);
        }
        gutil.log('Webpack Result: ', '\n' + stats.toString({
            colors: true
        }));
        cb();
    });
});

gulp.task('build', (cb) => {
    runSequence('clean', 'less', 'useref', 'imagemin', 'rev-image', 'revreplace-css', 'rev-css', 'rev-js', 'revreplace-ejs', 'webpack', 'copy-build', cb);
});

gulp.task('clean-dev', function () {
    return gulp.src([config.pathDev, config.pathTmp], {
        read: false
    }).pipe(clean());
});

gulp.task('copy-dev-style', function () {
    return gulp.src(path.join(config.pathSrc, config.pathStyle, '**'))
        .pipe(gulp.dest(path.join(config.pathDev, config.pathStyle)));
});

gulp.task('copy-dev-js-plugin', function () {
    return gulp.src(path.join(config.pathSrc, config.pathJsPluginSrc, '**'))
        .pipe(gulp.dest(path.join(config.pathDev, config.pathJsPluginDist)));
});

gulp.task('copy-dev-js-admin', function () {
    return gulp.src(path.join(config.pathSrc, config.pathJsDevAdmin, '**'))
        .pipe(gulp.dest(path.join(config.pathDev, config.pathJsDevAdmin)));
});

gulp.task('develop', (cb) => {
    runSequence('clean-dev', 'less', 'copy-dev-style', 'webpack', 'copy-dev-js-plugin', 'copy-dev-js-admin', cb);
});

gulp.task('dev', function () {
    runSequence('clean-dev', 'less', 'copy-dev-style', 'copy-dev-js-plugin', 'copy-dev-js-admin');

    compiler.watch({
        aggregateTimeout: 300
    }, function (err, stats) {
        if (err) {
            throw new gutil.PluginError('webpack: ', err);
        }
        gutil.log('Webpack Result: ', '\n' + stats.toString({
            colors: true
        }));
    });
    gulp.watch(['./public/src/js/plugins/**', './public/src/js/admin'], function (event) {
        runSequence('copy-dev-js-plugin', 'copy-dev-js-admin');
    });
    gulp.watch(['./public/src/**/*.less', '!./public/src/js/plugin/**'], function (event) {
        runSequence('less', 'copy-dev-style');
    });
});
gulp.task('default', ['dev']);
