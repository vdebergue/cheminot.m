/*
 * build.js
 */

var preprocess = require('preprocess'),
    Q = require('q'),
    path = require('path'),
    fs = require('fs'),
    gulp = require('../../gulpfile.js');

function mapSettings(settings, platform, configurationName) {
    var mapping = require('./mapping');
    var result = {};
    var flatSettings = {};

    for (var k in settings) {
        if (k !== "configurations") {
            flatSettings[k] = settings[k];
        } else {
            for (var l in settings[k][platform][configurationName]) {
                flatSettings[l] = settings[k][platform][configurationName][l];
            }
        }
    }

    for (var j in flatSettings) {
        if (mapping[j] !== undefined) {
            result[mapping[j]] = flatSettings[j];
        }
    }

    return result;
}

module.exports = function build(platform, settings, configurationName) {
    var d = Q.defer(),
        settingsPath = path.join(__dirname, '../www/js/settings.js'),
        htmlPath = {
            src: path.join(__dirname, '../html/index.html'),
            dest: path.join(__dirname, '../www/index.html')
        };

    gulp.doneCallback = function() {
        var settingsContent = "Settings = " + JSON.stringify(mapSettings(settings, platform, configurationName)) + ';';
        fs.writeFileSync(settingsPath, settingsContent, {"encoding": "utf8"});
        preprocess.preprocessFileSync(htmlPath.src, htmlPath.dest, {
            PLATFORM : platform
        });
        d.resolve();
    };

    gulp.start.apply(gulp, ['build']);

    return d.promise;
};