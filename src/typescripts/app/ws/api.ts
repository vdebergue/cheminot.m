/// <reference path='../../dts/Q.d.ts'/>

import utils = require('../utils/utils');

function fetchEntry(config: any): Q.Promise<any> {
    var d = Q.defer<any>();
    var url = config.api;

    var req = new XMLHttpRequest();
    req.onreadystatechange = () => {
        if (req.readyState === 4) {
            if(req.status === 200) {
                d.resolve(JSON.parse(req.responseText));
            } else {
                var errorMessage = 'Failed to get DB version from ' + url;
                utils.error(errorMessage);
                d.reject(errorMessage);
            }
        }
    };

    req.open('GET', url, true);
    req.send(null);

    return d.promise;
}

function fetchSize(url: string): Q.Promise<number> {
    var d = Q.defer<any>();

    var req = new XMLHttpRequest();
    req.onreadystatechange = () => {
        if (req.readyState === 4) {
            if(req.status === 200) {
                var size = parseInt(req.getResponseHeader("X-Content-Length"), 10);
                d.resolve(size);
            } else {
                var errorMessage = 'Failed to get DB size from ' + url;
                utils.error(errorMessage);
                d.reject(errorMessage);
            }
        }
    };

    req.open('HEAD', url, true);
    req.send(null);

    return d.promise;
}

function fetchDB(api: any, size: number, progress: (string, any?) => void) {
    var d = Q.defer<any>();

    var req = new XMLHttpRequest();
    req.onreadystatechange = () => {
        if (req.readyState === 4) {
            if(req.status === 200) {
                d.resolve(JSON.parse(req.responseText));
            } else {
                var errorMessage = 'Failed to load DB from ' + api.url;
                utils.error(errorMessage);
                d.reject(errorMessage);
            }
        }
    };

    req.open('GET', api.url, true);
    req.send(null);

    req.addEventListener("progress", (e) => {
        var percent = (e.loaded / size) * 100;
        progress('setup:fetch', percent);
    }, false);

    return d.promise;
}

export function db(config: any, progress: (string, number) => void): Q.Promise<any> {
    return fetchEntry(config).then((api) => {
        return fetchSize(api.url).then((size) => {
            return fetchDB(api, size, progress);
        });
    });
}

export function version(config: any): Q.Promise<string> {
    return fetchEntry(config).then((api) => {
        return api.version;
    });
}