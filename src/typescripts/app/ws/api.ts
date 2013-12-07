/// <reference path='../../dts/Q.d.ts'/>

import IStorage = require('../db/IStorage');

var DB: IStorage;

export function db(): Q.Promise<IStorage> {
    var d = Q.defer<IStorage>();
    var url = 'http://localhost:9000/api/db';
    $.ajax({
        url: url,
        success: (data) => {
            d.resolve(<IStorage>data);
        },
        error: () => {
            d.reject("Failed to load DB !");
        }
    });
    return d.promise;
}
