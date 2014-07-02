import opt = require('../lib/immutable/Option');

declare var tmpl:any;

var paths = {
    layout: 'layout.tpl.html',
    home: {
        layout: 'layout.tpl.html',
        header: 'header.tpl.html',
        suggestions: 'suggestions.tpl.html'
    },
    timetable: {
        layout: 'layout.tpl.html',
        header: 'header.tpl.html',
        schedule: 'schedule.tpl.html'
    },
    trip: {
        layout: 'layout.tpl.html',
        header: 'header.tpl.html',
        details: 'details.tpl.html'
    },
    splashscreen: {
        layout: 'layout.tpl.html'
    },
    tests: {
        layout: 'layout.tpl.html',
        header: 'header.tpl.html'
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
        return getTemplate('layout', opt.Option<string>('home')).then((t) => {
            return tmpl(t, {});
        });
    },
    header(): Q.Promise<string> {
        return getTemplate('header', opt.Option<string>('home'));
    },
    suggestions(): Q.Promise<string> {
        return getTemplate('suggestions', opt.Option<string>('home'));
    }
}

export var timetable = {
    layout(): Q.Promise<string> {
        return getTemplate('layout', opt.Option<string>('timetable'));
    },
    header(): Q.Promise<string> {
        return getTemplate('header', opt.Option<string>('timetable'));
    },
    schedule(): Q.Promise<string> {
        return getTemplate('schedule', opt.Option<string>('timetable'));
    }
}

export var trip = {
    layout(): Q.Promise<string> {
        return getTemplate('layout', opt.Option<string>('trip'));
    },
    header(): Q.Promise<string> {
        return getTemplate('header', opt.Option<string>('trip'));
    },
    details(): Q.Promise<string> {
        return getTemplate('details', opt.Option<string>('trip'));
    }
}

export var splashscreen = {
    layout(): Q.Promise<string> {
        return getTemplate('layout', opt.Option<string>('splashscreen'));
    }
}

export var tests = {
    layout(): Q.Promise<string> {
        return getTemplate('layout', opt.Option<string>('tests'));
    },
    header(): Q.Promise<string> {
        return getTemplate('header', opt.Option<string>('tests'));
    }
}