/// <reference path='../dts/Q.d.ts'/>

declare var Path: any;

import opt = require('lib/immutable/Option');
import seq = require('./lib/immutable/List');
import utils = require('./utils/utils');
import IView = require('./views/IView');
import Timetable = require('./views/Timetable');
import Home = require('./views/Home');
import Trip = require('./views/Trip');
import Setup = require('./views/Setup');
import Storage = require('./db/storage');
import Planner = require('./models/Planner');

function view(views: seq.IList<IView>, name: string): IView {
    return views.find((view) => {
        return view.name == name;
    }).getOrElse(() => {
        utils.error("Can't get view " + name);
        return null;
    });
}

function viewsBut(views: seq.IList<IView>, exclude: string): seq.IList<IView> {
    return views.filterNot((view) => {
        return view.name === exclude;
    });
}

export function init(views: seq.IList<IView>) {

    function ensureInitApp(viewName: string): Q.Promise<void> {
        var p: Q.Promise<void>;
        if(!Storage.isInitialized()) {
            p = utils.measureF<any>(() => {
                return Storage.installDB(() => {
                    return view(views, 'setup').setup().then((setupView) => {
                        return setupView.show().then<ZeptoCollection>(() => {
                            return (<Setup>setupView).$progress();
                        });
                    });
                });
            }, 'all').fail((e) => {
                utils.error(e);
            });
        } else {
            p = Q<void>(null);
        }
        return p.then(() => {
            hideOtherViews(viewName);
            return view(views, viewName).setup().then(() => {
                return null;
            });
        });
    }

    var hideOtherViews = (but: string) => {
        return viewsBut(views, but).foreach((view) => {
            view.hide();
        });
    }

    Path.map('#/').to(function() {
        ensureInitApp('home').then(() => {
            var homeView = <Home>view(views, 'home');
            homeView.show();
        });
    });

    Path.map('#/start/:start').to(function() {
        ensureInitApp('home').then(() => {
            var start = this.params['start'];
            var homeView = <Home>view(views, 'home');
            homeView.fillSelectedStart(start);
            homeView.show();
        });
    });

    Path.map('#/end/:end').to(function() {
        ensureInitApp('home').then(() => {
            var end = this.params['end'];
            var homeView = <Home>view(views, 'home');
            homeView.fillSelectedEnd(end);
            homeView.show();
        });
    });

    Path.map('#/schedule/:start/:end').to(function() {
        ensureInitApp('home').then(() => {
            var homeView = <Home> view(views, 'home');
            var start = this.params['start'];
            var end = this.params['end'];
            homeView.show();
            homeView.displayWhen(start, end);
        });
    });

    Path.map('#/timetable/:start/:end/:when').to(function() {
        ensureInitApp('timetable').then(() => {
            var start = this.params['start'];
            var end = this.params['end'];
            var when = parseInt(this.params['when'], 10);
            Planner.schedulesFor(start, end).then((maybeSchedules) => {
                maybeSchedules.map((schedules) => {
                    var timetableView = <Timetable> view(views, 'timetable');
                    timetableView.buildWith(new Date(when), schedules);
                    timetableView.show();
                }).getOrElse(() => {
                });
            }).fail((reason) => {
                utils.log(reason);
            });
        });
    });

    Path.map('#/trip/:id').to(function() {
        ensureInitApp('trip').then(() => {
            var tripId = this.params['id'];
            Storage.impl().tripById(tripId).then((maybeTrip) => {
                maybeTrip.foreach((trip) => {
                    var tripView = <Trip> view(views, 'trip');
                    tripView.buildWith(trip);
                    tripView.show();
                });
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

export function navigateToHome(maybeStart: opt.IOption<string> = new opt.None<string>(), maybeEnd: opt.IOption<string> = new opt.None<string>()): void {
    if(!(maybeStart.isDefined() && maybeEnd.isDefined())) {
        var route = maybeStart.map((start) => {
            return '/start/' + start;
        }).getOrElse(() => {
            return maybeEnd.map((end) => {
                return '/end/' + end;
            }).getOrElse(() => {
                return '/';
            });
        });
        navigate(route);
    } else {
        utils.oops('Unable to navigate to home: both start & end are already filled !');
    }
}

export function navigateToHomeWhen(start: string, end: string): void {
    navigate('/schedule/' + start + '/' + end)
}

export function navigateToTrip(tripId: string): void {
    navigate('/trip/' + tripId);
}

export function navigateToTimetable(start: string, end: string, when: number): void {
    navigate('/timetable/' + start + '/' + end + '/' + when);
}

export function navigateToBack(): void {
    history.back();
}