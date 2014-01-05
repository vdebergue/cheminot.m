/// <reference path='../../dts/Q.d.ts'/>

function fetchEntry(): Q.Promise<string> {
    var d = Q.defer<any>();
    var url = 'http://195.154.9.131/api';
    //var url = 'http://127.0.0.1:9000/api';

    $.ajax({
        url: url,
        success: (data) => {
            d.resolve(data.version);
        },
        error: () => {
            d.reject("Failed to load DB version !");
        }
    });
    return d.promise;
}

function fetchDB(version: string) {
    var d = Q.defer<any>();
    var url = 'http://195.154.9.131/api/db/' + version;
    //var url = 'http://127.0.0.1:9000/api/db';

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

export function db(): Q.Promise<any> {
    return fetchEntry().then((version) => {
        return fetchDB(version);
    });
}
