var gulp = require('gulp'),
    ts = require('gulp-tsc'),
    stylus = require('gulp-stylus'),
    preprocess = require('gulp-preprocess'),
    argv = require('yargs').argv,
    gutil = require('gulp-util'),
    nib = require('nib'),
    sourcemaps = require('gulp-sourcemaps'),
    clean = require('gulp-rimraf'),
    exec = require('gulp-exec'),
    rjs = require('sre-gulp-rjs'),
    watch = require('gulp-watch'),
    plumber = require('gulp-plumber'),
    browserify = require('gulp-browserify'),
    fs = require('fs');

var Assets = {
    ts: {
        src: {
            files: ['src/ts/**/*.ts', '!src/ts/dts/**'],
            dir: 'src/ts/'
        },
        dest: {
            files : ['project/www/js/**/*.js'],
            dir: 'project/www/js/'
        }
    },
    styl: {
        src: {
            files: ['src/styl/**/*.styl'],
            dir: 'src/styl/'
        },
        dest: {
            files: ['project/www/css/**/*.css'],
            dir: 'project/www/css/'
        }
    }
};

gulp.task('zanimo', function() {
    return gulp.src("project/bower_components/zanimo/src/Zanimo.js")
        .pipe(browserify({ "standalone": "Zanimo" }))
        .pipe(gulp.dest('project/bower_components/zanimo/amd'));
});

gulp.task('clean-ts', function() {
    return gulp.src(Assets.ts.dest.dir)
        .pipe(clean());
});

gulp.task('ts', ['clean-ts'], function() {
    return gulp.src(Assets.ts.src.files)
        .pipe(ts({
            module: 'amd',
            noImplicitAny: true,
            safe: true,
            out: 'main.js'
        }))
        .pipe(gulp.dest(Assets.ts.dest.dir));
});

gulp.task('clean-stylus', function() {
    return gulp.src(Assets.styl.dest.dir)
        .pipe(clean());
});

gulp.task('styl', ['clean-stylus'], function() {
    return gulp.src(Assets.styl.src.files)
        .pipe(stylus({
            use: nib(),
            compress: true
        }))
        .pipe(gulp.dest(Assets.styl.dest.dir));
});

gulp.task('requirejs', ['ts'], function() {
    return gulp.src(Assets.ts.dest.files)
        .pipe(gulp.dest(Assets.ts.dest.dir))
        .pipe(rjs({
            baseUrl: Assets.ts.dest.dir,
            out: Assets.ts.dest.dir + 'main.js',
            name: 'main',
            paths: {
                'mithril': '../vendors/mithril',
                'q': '../vendors/q',
                'Zanimo': '../vendors/Zanimo',
                'IScroll': '../vendors/iscroll-probe',
                'moment': '../vendors/moment'
            },
            wrapShim: true,
            shim: {
                "IScroll": {
                    "exports": "IScroll"
                },
                "moment": {
                    "exports": "moment"
                }
            },
            optimize: 'none'
        }));
});

gulp.task('watch', ['compile'], function() {
    var assets = Assets.ts.src.files.concat(Assets.styl.src.files);
    gulp.src(assets)
        .pipe(watch(assets))
        .pipe(plumber())
        .pipe(exec('tarifa build web', {
            pipeStdout: true
        }))
        .pipe(exec.reporter({
            err: true,
            stderr: true,
            stdout: true
        }));
});

gulp.task('default', ['watch']);

gulp.task('compile', ['requirejs', 'styl']);

gulp.task('build', function() {
    return gulp.src('.')
        .pipe(exec('tarifa build web', {
            pipeStdout: true
        }))
        .pipe(exec.reporter({
            err: true,
            stderr: true,
            stdout: true
        }));
});

module.exports = gulp;
