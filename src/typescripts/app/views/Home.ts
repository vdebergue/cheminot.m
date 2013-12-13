/// <reference path='../../dts/Q.d.ts'/>
/// <reference path='../../dts/zepto.d.ts'/>

import seq = require('lib/immutable/List');
import opt = require('lib/immutable/Option');
import tuple = require('lib/immutable/Tuple');
import IView = require('./IView');
import View = require('./View');
import Templating = require('./templating')
import Storage = require('../db/storage');
import TernaryTree = require('../utils/ternaryTree');

declare var array_intersect;

export = Home;

class Home extends View implements IView {

    name: string;

    constructor(container: string, scope: string) {
        this.name = 'home';
        super(container, scope);
    }

    setup(): Q.Promise<void> {
        return super.ensure(Templating.home).then(() => {
            this.bindEvents();
        });
    }

    bindEvents(): void {
        this.header.bindEvent('click', 'button', this.onButtonClick)
        super.bindEvent('keyup', 'input[name=start], input[name=end]', this.onStationKeyUp);
        super.bindEvent('click', '.suggestions > li', this.onSuggestionTouch);
    }

    show(): Q.Promise<void> {
        return Templating.header.home().then((tpl) => {
            this.header.update(tpl);
        });
    }

    hide(): Q.Promise<void> {
        return null;
    }

    suggest(suggestions: seq.IList<any>): void {
        var $scope = super.$scope();
        var $suggestions = $scope.find('.suggestions');
        $suggestions.empty();
        suggestions.foreach((s) => {
            $suggestions.prepend('<li id="'+ s.id +'">'+ s.name +'</li>');
            $suggestions.find('li:first-child').data('data', JSON.stringify(s));
        });
    }

    onButtonClick(e: Event): boolean {
        console.log('haaa');
        return true;
    }

    onStationKeyUp(e: Event): boolean {
        var stopsTree = Storage.stops();
        var $scope = super.$scope();
        var $input = $(e.currentTarget);
        var term = $input.val();
        if($input.is('[name=start]')) {
            $scope.find('.suggestions').removeClass('end').addClass('start');
        } else {
            $scope.find('.suggestions').removeClass('start').addClass('end');
        }
        var founds = TernaryTree.search(term.toLowerCase(), stopsTree, 20);
        this.suggest(founds);
        return true;
    }

    onSuggestionTouch(e: Event): boolean {
        var $suggestion = $(e.currentTarget);
        var $suggestions = $suggestion.parent();
        if($suggestions.is('.start')) {
            var data = JSON.stringify($suggestion.data('data'));
            $suggestions.data('start', data);
        } else if($suggestions.is('.end')) {
            var data = JSON.stringify($suggestion.data('data'));
            $suggestions.data('end', data);
        }
        opt.Option<any>($suggestions.data('start')).foreach((start) => {
            opt.Option<any>($suggestions.data('end')).foreach((end) => {
                var tripIds = array_intersect((id) => {
                    return id;
                }, start.tripIds, end.tripIds);

                opt.Option<any>(tripIds[0]).foreach((oneTripId) => {
                    Storage.getTripDirection(start.id, end.id, oneTripId).then((direction) => {
                        return Storage.tripsByIds(tripIds || [], direction).then((trips) => {
                            var stopTimes: Array<number> = trips.flatMap<any>((trip) => {
                                return seq.List.apply(null, trip.stopTimes).find((stopTime) => {
                                    return stopTime.stop.id === start.id;
                                });
                            }).map((stopTime) => {
                                return stopTime.departure;
                            }).asArray();
                            stopTimes.sort((a,b) => {
                                return a -b;
                            }).map((x) => {
                                return new Date(x);
                            });
                        })
                    }).fail((e) => {
                        console.error(e);
                    });
                });
            });
        });
        return true;
    }
}
