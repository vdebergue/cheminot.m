/// <reference path='../../dts/Q.d.ts'/>
/// <reference path='../../dts/zepto.d.ts'/>

import utils = require('../utils/utils');

function fetchEntry(): Q.Promise<any> {
    var d = Q.defer<any>();
    var url = window['CONFIG'].api;

    $.ajax({
        url: url,
        success: (api) => {
            d.resolve(api);
        },
        error: () => {
            d.reject("Failed to load DB version !");
        }
    });

    return d.promise;
}

function fetchSize(url: string): Q.Promise<number> {
    var d = Q.defer<any>();

    $.ajax({
        type: 'HEAD',
        url: url,
        success: (x, y, req) => {
            var size = parseInt(req.getResponseHeader("X-Content-Length"), 10);
            d.resolve(size);
        },
        error: () => {
            var errorMessage = "Failed to load DB size from " + url;
            utils.error(errorMessage);
            d.reject(errorMessage);
        }
    });

    return d.promise;
}

function fetchDB(api: any, size: number, $progress: ZeptoCollection) {
    var d = Q.defer<any>();

    var req = $.ajax({
        url: api.url,
        success: (data) => {
            d.resolve(data);
        },
        error: () => {
            var errorMessage = 'Failed to load DB from ' + api.url;
            utils.error(errorMessage);
            d.reject(errorMessage);
        }
    });

    req.addEventListener("progress", (e) => {
        var percent = (e.loaded / size) * 100;
        $progress.trigger('setup:fetch', [percent]);
    }, false);

    return d.promise;
}

export function db($progress: ZeptoCollection): Q.Promise<any> {
    return fetchEntry().then((api) => {
        return fetchSize(api.url).then((size) => {
            return fetchDB(api, size, $progress);
        });
    });
}

export function version(): Q.Promise<string> {
    return fetchEntry().then((api) => {
        return api.version;
    });
}