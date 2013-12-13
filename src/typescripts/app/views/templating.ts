/// <reference path='../../dts/Q.d.ts'/>
/// <reference path='../../dts/zepto.d.ts'/>

import opt = require('../lib/immutable/Option');

var paths = {
    layout: 'layout.tpl.html',
    home: {
        layout: 'layout.tpl.html',
        header: 'header.tpl.html'
    },
    timetable: {
        layout: 'layout.tpl.html',
        header: 'header.tpl.html',
        schedules: 'schedules.tpl.html'
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

export var home = {
    layout(): Q.Promise<string> {
        return getTemplate('layout', opt.Option<string>('home'));
    },
    header(): Q.Promise<string> {
        return getTemplate('header', opt.Option<string>('home'));
    }
}

export var timetable = {
    layout(): Q.Promise<string> {
        return getTemplate('layout', opt.Option<string>('timetable'));
    },
    header(): Q.Promise<string> {
        return getTemplate('header', opt.Option<string>('timetable'));
    },
    schedules(): Q.Promise<string> {
        return getTemplate('schedules', opt.Option<string>('timetable'));
    }
}
