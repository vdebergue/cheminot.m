/// <reference path='../../dts/Q.d.ts'/>

var DB: any;

export function db(): Q.Promise<any> {
    var d = Q.defer<any>();
    var url = 'http://localhost:9000/api/db';
    $.ajax({
        url: url,
        success: (data) => {
            d.resolve(data);
        },
        error: () => {
            d.reject("Failed to load DB !");
        }
    });
    return d.promise;
}
