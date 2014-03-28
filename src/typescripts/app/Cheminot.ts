import utils = require('./utils/utils');

export function initApp(app) {
    if(utils.isMobile()) {
        app.configure({urlSync: false});
    } else {
        app.configure({urlSync: 'hash'});
    }
    app.init();
    window['CheminitApp'] = app;
}

export function app() {
    return window['CheminitApp'];
}

export function config() {
    return window['config'];
}