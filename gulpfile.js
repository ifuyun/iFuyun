/**
 * Gulp Config File
 * @author Fuyun
 */
const gulp = require('gulp');
const tinylr = require('tiny-lr');
const path = require('path');
const runSequence = require('run-sequence');
const clean = require('gulp-clean');
const gulpif = require('gulp-if');
const useref = require('gulp-useref');
const minifyCss = require('gulp-minify-css');
const imagemin = require('gulp-imagemin');
const pngquant = require('imagemin-pngquant');
const rev = require('gulp-rev');
const revReplace = require('gulp-rev-replace');
const argv = require('yargs').argv;
const config = require('./config-gulp.json');
const gutil = require('gulp-util');
const less = require('gulp-less');
const webpack = require('webpack');
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

gulp.task('useref-html', function () {
    return gulp.src(path.join(config.pathViews, config.pathViewsSrc, '**/*.{html,htm,ejs}'))
        .pipe(useref({
            searchPath: config.pathSrc
        }))
        .pipe(gulpif('*.css', minifyCss()))
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

gulp.task('revreplace-ejs', function () {
    const manifest = gulp.src([
        path.join(config.pathTmp2, 'rev-manifest-img.json'),
        path.join(config.pathTmp2, 'rev-manifest-css.json')
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

gulp.task('copy-build', ['copy-build-css', 'copy-build-image', 'copy-build-fonts', 'copy-build-views']);

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
    runSequence('clean', 'less', 'useref', 'imagemin', 'rev-image', 'revreplace-css', 'rev-css', 'revreplace-ejs', 'webpack', 'copy-build', cb);
});

gulp.task('dev', function (cb) {
    // runSequence('ejs-dev', 'less', 'copy-favicon-dev', 'start-server-dev');
    runSequence('less');

    compiler.watch({
        aggregateTimeout: 300
    }, function (err, stats) {
        if (err) {
            throw new gutil.PluginError('webpack: ', err);
        }
        gutil.log('Webpack Result: ', '\n' + stats.toString({
            colors: true
        }));
        tinylr.changed('xxx.js');
    });
    function watchFiles (ext) {
        gulp.watch(['./src/**/*.' + ext], function (event) {
            if (ext === 'less') {
                runSequence('less');
            }
            tinylr.changed(event.path);
        });
    }

    watchFiles('html');
    watchFiles('ejs');
    watchFiles('less');
});
gulp.task('default', ['dev']);
