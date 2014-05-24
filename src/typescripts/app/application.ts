/// <reference path='../dts/Q.d.ts'/>

declare var Abyssa: any;

import opt = require('./lib/immutable/Option');
import seq = require('./lib/immutable/List');
import utils = require('./utils/utils');
import IView = require('./views/IView');
import View = require('./views/View');
import Timetable = require('./views/Timetable');
import Splashscreen = require('./views/Splashscreen');
import Home = require('./views/Home');
import Storage = require('./db/storage');
import Planner = require('./models/Planner');
import Upgrade = require('./tasks/upgrade');
import Cheminot = require('./Cheminot');

export function init(views: seq.IList<IView>) {

    var cheminotViews = new CheminotViews(views);

    function ensureInitApp(viewName: string): Q.Promise<void> {
        var p: Q.Promise<void>;
        if(!Storage.isInitialized()) {
            var splashscreenView = cheminotViews.splashscreen();
            p = splashscreenView.setup().then(() => {
                return splashscreenView.show().then(() => {
                    return Storage.installDB(Cheminot.config(), (event, data) => {
                        if(event === 'setup:fetch') {
                            splashscreenView.progress(data);
                        } else if(event.indexOf('worker') >= 0) {
                            CheminotViews.onSetupProgress(event, data);
                        }
                    }).then(() => {
                        return Q.delay(utils.Promise.DONE(), 1000);
                    });
                });
            }).fail((reason) => {
                utils.error(reason);
            });
        } else {
            p = utils.Promise.DONE();
        }
        return p.then(() => {
            if(View.currentViewName() != viewName) {
                cheminotViews.hideOthers(viewName);
                return CheminotViews.view(views, viewName).setup().then(() => {
                    return utils.Promise.DONE();
                });
            } else {
                return utils.Promise.DONE();
            }
        });
    }

    var CheminotApp = Abyssa.Router({
        app: Abyssa.State('', {
            enter: function(params) {
                var fromURL = window.location.href.match(/.*?#\/(\w+)\/.*/);
                var viewName = 'home';
                if(fromURL) {
                    viewName = (fromURL[1] == "schedule") ? viewName : fromURL[1];
                }
                return this.async(ensureInitApp(viewName).then(() => {
                    cheminotViews.home().show();
                }));
            },

            show: Abyssa.State('', function() {
                cheminotViews.home().reset();
            }),

            onlyStart: Abyssa.State('start/:start', function(params) {
                var start = params['start'];
                var homeView = cheminotViews.home();
                homeView.fillStart(start);
                homeView.resetEnd();
            }),

            onlyEnd: Abyssa.State('end/:end', function(params) {
                var end = params['end'];
                var homeView = cheminotViews.home();
                homeView.fillEnd(end);
                homeView.resetStart();
            }),

            schedule: Abyssa.State('schedule/:start/:end', function(params) {
                var start = params['start'];
                var end = params['end'];
                var homeView = cheminotViews.home();
                homeView.fillStart(start);
                homeView.fillEnd(end);
            }),

            timetable: Abyssa.State('timetable/:start/:end/:when', function(params) {
                return this.async(
                    opt.Option(params['start']).flatMap((start:string) => {
                        return opt.Option(params['end']).flatMap((end:string) => {
                            return opt.Option(params['when']).flatMap((when:string) => {
                                return opt.Option(parseInt(when, 10));
                            }).map((when:number) => {
                                return ensureInitApp('timetable').then(() => {
                                    var timetableView = cheminotViews.timetable();
                                    timetableView.buildWith(start, end, new Date(when)).then(() => {
                                        return timetableView.show();
                                    });
                                });
                            });
                        });
                    }).getOrElse(() => {
                        return utils.Promise.DONE();
                    })
                );
            })
        })
    });

    Cheminot.initApp(CheminotApp);
}

export class Navigate {

    static home(maybeStart: opt.IOption<string> = new opt.None<string>(), maybeEnd: opt.IOption<string> = new opt.None<string>()): Q.Promise<void> {
        var f = (() => {
            if(maybeStart.isDefined() && maybeEnd.isDefined()) {
                return maybeStart.map((start) => {
                    return maybeEnd.map((end) => {
                        return Cheminot.app().state('schedule/' + start + '/' + end);
                    }).getOrElse(() => {
                        return utils.Promise.DONE();
                    });
                }).getOrElse(() => {
                    return utils.Promise.DONE();
                });
            } else {
                if(maybeStart.isEmpty() && maybeEnd.isEmpty()) {
                    return Cheminot.app().state('');
                } else {
                    return maybeStart.map((start) => {
                        return Cheminot.app().state('start/' + start);
                    }).getOrElse(() => {
                        return maybeEnd.map((end) => {
                            return Cheminot.app().state('end/' + end);
                        }).getOrElse(() => {
                            return utils.Promise.DONE();
                        });
                    });
                }
            }
        })();

        return f.fail((reason) => {
            return utils.Promise.DONE();
        });
    }

    static timetable(start: string, end: string, when: number): Q.Promise<void> {
        return Cheminot.app().state('timetable/' + start + '/' + end + '/' + when);
    }
}

class CheminotViews {

    views: seq.IList<IView>;

    constructor(views: seq.IList<IView>) {
        this.views = views;
    }

    hideOthers = (but: string) => {
        return CheminotViews.viewsBut(this.views, but).foreach((view) => {
            view.hide();
        });
    }

    splashscreen(): Splashscreen {
        return <Splashscreen>CheminotViews.view(this.views, 'splashscreen');
    }

    home(): Home {
        return <Home>CheminotViews.view(this.views, 'home');
    }

    timetable(): Timetable {
        return <Timetable>CheminotViews.view(this.views, 'timetable');
    }

    static view(views: seq.IList<IView>, name: string): IView {
        return views.find((view) => {
            return view.name == name;
        }).getOrElse(() => {
            utils.error("Can't get view " + name);
            return null;
        });
    }

    static viewsBut(views: seq.IList<IView>, exclude: string): seq.IList<IView> {
        return views.filterNot((view) => {
            return view.name === exclude;
        });
    }

    static onSetupProgress(event: string, data: any) {
        var $progress = $('.setup-progress');
        var $bar = $progress.find('.bar');
        var $value = $progress.find('.value');
        var current = parseInt($value.text(), 10);
        $progress.addClass('on');

        if(event === 'worker.setup:fetch') {
            var percent = Math.round((parseInt(data, 10) * 30) / 100);
            $value.text(percent.toString());
            $bar.css('width', percent.toString() + '%');
        } else if(event === 'worker.setup:exceptions') {
            $value.text('40%');
            $bar.css('width', '40%');
        } else if(event === 'worker.setup:stops') {
            $value.text('50%');
            $bar.css('width', '50%');
        } else if(event === 'worker.setup:trip') {
            var percent = Math.round((((data.value / data.total) * 100) * 50) / 100);
            $value.text((50 + percent).toString() + '%');
            $bar.css('width', (50 + percent).toString() + '%');
        } else if(event === 'worker.setup:done') {
            $value.text('100%');
            $bar.css('width', '100%');
            $progress.addClass('hidden');
        }
    }
}
