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
            files: ['src/ts/**/*.ts'],
            main: ['src/ts/main.ts'],
            dir: 'src/ts/'
        },
        dest: {
            files : ['project/www/js/**/*.js', '!project/www/js/vendors/**/*.js'],
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
    },
    vendors: {
        src: {
            requirejs: 'project/node_modules/requirejs/require.js',
            q: 'project/node_modules/q/q.js',
            mithril: 'project/node_modules/mithril/mithril.js',
            zanimo: 'project/node_modules/zanimo/src/Zanimo.js',
            iscroll: 'project/node_modules/iscroll/build/iscroll-probe.js',
            moment: 'project/node_modules/moment/moment.js'
        },
        dest: 'project/www/js/vendors/'
    }
};

gulp.task('vendors', function() {
    function browserifyVendor(path, name) {
        return gulp.src(path)
            .pipe(browserify({ "standalone": name }))
            .pipe(gulp.dest(Assets.vendors.dest));
    }

    gulp.src(Assets.vendors.src.requirejs).pipe(gulp.dest(Assets.vendors.dest));
    browserifyVendor(Assets.vendors.src.q, 'q');
    browserifyVendor(Assets.vendors.src.mithril, 'mithril');
    browserifyVendor(Assets.vendors.src.iscroll, 'IScroll');
    browserifyVendor(Assets.vendors.src.zanimo, 'Zanimo');
    browserifyVendor(Assets.vendors.src.moment, 'moment');
});

gulp.task('clean-js', function() {
    return gulp.src(Assets.ts.dest.files)
        .pipe(clean());
});

gulp.task('ts', ['clean-js'], function() {
    return gulp.src(Assets.ts.src.main)
        .pipe(ts({
            module: 'amd',
            noImplicitAny: true,
            safe: true
        }))
        .pipe(gulp.dest(Assets.ts.dest.dir));
});

gulp.task('clean-css', function() {
    return gulp.src(Assets.styl.dest.dir)
        .pipe(clean());
});

gulp.task('styl', ['clean-css'], function() {
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
                'mithril': 'vendors/mithril',
                'q': 'vendors/q',
                'Zanimo': 'vendors/Zanimo',
                'IScroll': 'vendors/iscroll-probe',
                'moment': 'vendors/moment'
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

gulp.task('compile', ['ts', 'styl']);

gulp.task('compile-prod', ['requirejs', 'styl']);

gulp.task('build', function() {
    return gulp.src('.')
        .pipe(exec('tarifa build web', {
            pipeStdout: true
        }));
});

gulp.task('build-prod', function() {
    return gulp.src('.')
        .pipe(exec('tarifa build web prod', {
            pipeStdout: true
        }));
});

module.exports = gulp;
