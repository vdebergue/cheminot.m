/// <reference path='../../dts/Q.d.ts'/>
/// <reference path='../../dts/zepto.d.ts'/>

import opt = require('../lib/immutable/Option');

var paths = {
    layout: 'layout.tpl.html',
    home: 'home.tpl.html',
    timetable: 'timetable.tpl.html',
    header: {
        home: 'header-home.tpl.html',
        timetable: 'header-timetable.tpl.html'
    }
};

function getTemplate(name: string, directory: opt.IOption<string> = new opt.None<string>()): Q.Promise<string> {
    var d = Q.defer<string>();
    var url = directory.map((d) => {
        return 'templates/' + d + '/' + paths[d][name];
    }).getOrElse(() => {
        return 'templates/' + paths[name]
    });

    $.ajax({
        url: url,
        success: (data) => {
            d.resolve(<string>data);
        },
        error: () => {
            d.reject("Failed to load template " + name);
        }
    });
    return d.promise;
}

export function layout(): Q.Promise<string> {
    return getTemplate('layout');
}

export function home(): Q.Promise<string> {
    return getTemplate('home');
}

export function timetable(): Q.Promise<string> {
    return getTemplate('timetable');
}

export var header = {
    home(): Q.Promise<string> {
        return getTemplate('home', opt.Option<string>('header'));
    },
    timetable(): Q.Promise<string> {
        return getTemplate('timetable', opt.Option<string>('header'));
    }
}