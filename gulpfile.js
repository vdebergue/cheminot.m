var gulp = require('gulp'),
    ts = require('gulp-tsc'),
    stylus = require('gulp-stylus'),
    preprocess = require('gulp-preprocess'),
    argv = require('yargs').argv,
    gutil = require('gulp-util'),
    nib = require('nib'),
    sourcemaps = require('gulp-sourcemaps'),
    header = require('gulp-header'),
    clean = require('gulp-rimraf'),
    rjs = require('sre-gulp-rjs'),
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
        .pipe(sourcemaps.init({ loadMaps: true }))
        .pipe(stylus({
            use: nib(),
            compress: true,
            sourcemap: {
                inline: true,
                basePath: Assets.styl.dest.dir
            }
        }))
        .pipe(sourcemaps.write('.'))
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
                'Immutable': '../vendors/Immutable',
                'mithril': '../vendors/mithril'
            },
            optimize: 'none'
        }));
});

gulp.task('watch', function() {
    gulp.watch(Assets.styl, ['styl']);
    gulp.watch(Assets.ts.src, ['ts']);
});

gulp.task('default', ['styl', 'ts', 'watch']);

gulp.task('compile', ['ts', 'styl']);

gulp.task('build', ['styl', 'requirejs']);

module.exports = gulp;
