
export function initApp(app) {
    app.init();
    window['CheminitApp'] = app;
}

export function app() {
    return window['CheminitApp'];
}

export function config() {
    return window['config'];
}