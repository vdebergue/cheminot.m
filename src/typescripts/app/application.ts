declare var Path: any;

import seq = require('./lib/immutable/List');
import utils = require('./utils/utils');
import ternaryTree = require('./utils/ternaryTree');
import IView = require('./views/IView');
import Storage = require('./db/storage');
import IStorage = require('./db/IStorage');

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
    initViews(views).then(() => {

        Path.map('#/').to(() => {
            utils.measureF<IStorage>(() => {
                var x = Storage.db();
                x.then((db) => {
                    console.log(ternaryTree.search('chart', (<any>db).treeStops));
                }).fail((e) => {
                    console.error(e);
                });
                return x;
            });
            view(views, 'home').show();
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

export function navigate(path: string): boolean {
    var hash = "#" + path;
    if(window.location.hash !== hash) {
        window.location.hash = hash;
        return true;
    } else {
        return false;
    }
}
