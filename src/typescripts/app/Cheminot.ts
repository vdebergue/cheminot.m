import utils = require('./utils/utils');

export function initApp(app) {
    app.configure({urlSync: 'hash'});
    app.init();
    window['CheminitApp'] = app;
}

export function app() {
    return window['CheminitApp'];
}

export function config() {
    return window['config'];
}