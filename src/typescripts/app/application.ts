declare var Path: any;

import seq = require('./lib/immutable/List');
import utils = require('./utils/utils');
import IView = require('./views/IView');
import Timetable = require('./views/Timetable');
import Trip = require('./views/Trip');
import Storage = require('./db/storage');
import Planner = require('./models/Planner');

function initViews(views: seq.IList<IView>): Q.Promise<seq.IList<IView>> {
    var f = (view: IView) => {
        return view.setup().then(() => {
            return view;
        });
    };
    return utils.sequencePromises<IView>(views.asArray(), f).then((views) => {
        return seq.List.apply(null, views);
    });
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
    }, 'all').then(() => {
        utils.log('DONE !');
        return null;
    }).fail((e) => {
        utils.error(e);
    });

    initViews(views).then(() => {

        Path.map('#/').to(() => {
            view(views, 'home').show();
        });

        Path.map('#/timetable/:start/:end').to(function() {
            var start = this.params['start'];
            var end = this.params['end'];
            Planner.schedulesFor(start, end).then((maybeSchedules) => {
                maybeSchedules.map((schedules) => {
                    var timetableView = <Timetable> view(views, 'timetable');
                    timetableView.buildWith(schedules);
                    timetableView.show();
                }).getOrElse(() => {
                });
            });
        });

        Path.map('#/trip/:id').to(function() {
            var tripId = this.params['id'];
            Storage.tripById(tripId).then((maybeTrip) => {
                maybeTrip.map((trip) => {
                    var tripView = <Trip> view(views, 'trip');
                    tripView.buildWith(trip);
                    tripView.show();
                }).getOrElse(() => {
                });
            });
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

export function navigateToTrip(tripId: string): void {
    navigate('/trip/' + tripId);
}