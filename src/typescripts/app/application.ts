declare var Path: any;

import seq = require('./lib/immutable/List');
import utils = require('./utils/utils');
import IView = require('./views/IView');
import Storage = require('./db/storage');
import Planner = require('./models/Planner');

function initViews(views: seq.IList<IView>): Q.Promise<seq.IList<IView>> {
    return utils.sequencePromises<IView>(
        views.map((view) => {
            return view.setup().then(() => {
                return view;
            });
        })
    );
}

function view(views: seq.IList<IView>, name: string): IView {
    return views.find((view) => {
        return view.name == name;
    }).getOrElse(() => {
        utils.error("Can't get view " + name);
        return null;
    });
}

export function init(views: seq.IList<IView>) {

    utils.measureF<any>(() => {
        return Storage.installDB();
    }).then(() => {
        console.log('DONE !');
        return null;
    }).fail((e) => {
        console.error(e);
    });

    initViews(views).then(() => {

        Path.map('#/').to(() => {
            view(views, 'home').show();
        });

        Path.map('#/timetable/:start/:end').to(function() {
            var start = this.params['start'];
            var end = this.params['end'];
            Planner.scheduleFor(start, end).then((schedule) => {
                console.log(schedule);
            });
            view(views, 'timetable').show();
        });

        Path.rescue(() => {
            navigate('/');
        });

        Path.listen();
        if(!window.location.hash) {
            navigate('/');
        }

    });
}

function navigate(path: string): boolean {
    var hash = "#" + path;
    if(window.location.hash !== hash) {
        window.location.hash = hash;
        return true;
    } else {
        return false;
    }
}

export function navigateToTimetable(start: string, end: string): void {
    navigate('/timetable/' + start + '/' + end);
}

export function navigateToHome(): void {
    navigate('/');
}