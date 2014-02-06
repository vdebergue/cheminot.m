import Api = require('../ws/api');
import utils = require('../utils/utils');
import Storage = require('../db/storage');

export var checkPeriodically = _.once(() => {
    var config = window['CONFIG'];
    setInterval(() => {
        Storage.impl().version().then((maybeVersion) => {
            maybeVersion.foreach((versionDB) => {
                Q.timeout(Api.version(config), 2000).then((versionApi) => {
                    if(versionDB && versionApi && (versionDB != versionApi)) {
                        alert('A new version is available');
                    }
                }).fail((reason) => {
                    utils.error('Unable to fetch /api: ' + reason)
                });
            });
        });
    }, 24 * 60 * 60)
});
