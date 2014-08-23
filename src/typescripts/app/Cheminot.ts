import utils = require('./utils/utils');

export function initApp(app) {
    app.configure({urlSync: 'hash'});
    app.init();
    window['CheminotApp'] = app;
}

export function app() {
    return window['CheminotApp'];
}

export function config() {
    return window['config'];
}