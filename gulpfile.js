var gulp = require('gulp'),
    ts = require('gulp-tsc'),
    stylus = require('gulp-stylus'),
    preprocess = require('gulp-preprocess'),
    argv = require('yargs').argv,
    gutil = require('gulp-util'),
    nib = require('nib'),
    sourcemaps = require('gulp-sourcemaps'),
    react = require('gulp-react-ts'),
    header = require('gulp-header'),
    clean = require('gulp-clean'),
    fs = require('fs');

var Assets = {
    ts: {
        src: ['src/ts/**/*.ts', '!src/ts/dts/**', '!src/ts/transpiled/**'],
        transpiled: ['src/ts/transpiled/**/*.ts']
    },
    styl: ['src/styl/**/*.styl']
};

gulp.task('clean-stylus', function() {
    return gulp.src('project/www/css')
        .pipe(clean());
});

gulp.task('clean-jsx', function() {
    return gulp.src('src/ts/transpiled')
        .pipe(clean());
});

gulp.task('clean-ts', function() {
    return gulp.src('project/www/js')
        .pipe(clean());
});

gulp.task('jsx', ['clean-jsx'], function() {
    var references = fs.readFileSync('src/ts/dts/references', 'utf8');
    return gulp.src(Assets.ts.src)
        .pipe(react())
        .pipe(header(references))
        .pipe(gulp.dest('src/ts/transpiled'));
});

gulp.task('ts', ['jsx', 'clean-ts'], function() {
    return gulp.src(Assets.ts.transpiled)
        .pipe(ts({
            module: 'amd',
            noImplicitAny: true,
            sourcemap: true,
            safe: true,
            out: 'main.js',
            sourceRoot: '../../../src/ts/transpiled'
        }))
        .pipe(gulp.dest('project/www/js'));
});

gulp.task('styl', ['clean-stylus'], function() {
    return gulp.src(Assets.styl)
        .pipe(stylus({
            use: nib(),
            compress: true,
            sourcemap: {
                inline: true,
                basePath: 'project/www/css'
            }
        }))
        .pipe(sourcemaps.init({ loadMaps: true }))
        .pipe(sourcemaps.write('.'))
        .pipe(gulp.dest('project/www/css'));
});

gulp.task('watch', function() {
    gulp.watch(Assets.styl, ['styl']);
    gulp.watch(Assets.ts.src, ['ts']);
});

gulp.task('default', ['styl', 'ts', 'watch']);

gulp.task('compile', ['ts']);

gulp.task('build', ['styl', 'ts']);

module.exports = gulp;