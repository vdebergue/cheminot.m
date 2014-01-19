/// <reference path='../../dts/Q.d.ts'/>
/// <reference path='../../dts/zepto.d.ts'/>

function fetchEntry($progress: ZeptoCollection): Q.Promise<string> {
    var d = Q.defer<any>();
    var url = 'http://195.154.9.131/api';
    //var url = 'http://127.0.0.1:9000/api';

    var req = $.ajax({
        url: url,
        success: (data) => {
            d.resolve(data.version);
        },
        error: () => {
            d.reject("Failed to load DB version !");
        }
    });

    req.addEventListener("progress", (e) => {
        if(e.lengthComputable) {
            var percent = (e.loaded / e.total) * 100;
            $progress.trigger('setup:fetch', [percent]);
        }
    }, false);

    return d.promise;
}

function fetchDB(version: string) {
    var d = Q.defer<any>();
    var url = 'http://195.154.9.131/api/db/' + version;
    //var url = 'http://127.0.0.1:9000/api/db/' + version;

    $.ajax({
        url: url,
        success: (data) => {
            d.resolve(data);
        },
        error: () => {
            d.reject("Failed to load DB " + version);
        }
    });
    return d.promise;
}

export function db($progress: ZeptoCollection): Q.Promise<any> {
    return fetchEntry($progress).then((version) => {
        return fetchDB(version);
    });
}
