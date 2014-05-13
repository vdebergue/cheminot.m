import Cheminot = require('../Cheminot');

export function start(progress: (string, any?) => void): Q.Promise<void> {
    var d = Q.defer<any>();
    var config = Cheminot.config();
    var worker = new Worker(config.workers.setup);
    worker.postMessage(JSON.stringify({
        event: 'config',
        data: config
    }));

    worker.onmessage = (e) => {
        var msg = JSON.parse(e.data);
        if(msg.event != 'end') {
            var ns = "worker."
            progress(ns + msg.event, msg.data);
        } else {
            worker.terminate();
            d.resolve(null);
        }
    }

    worker.postMessage(JSON.stringify({
        event: 'install'
    }));

    worker.onerror = (e) => {
        d.reject(e);
        worker.terminate();
    };

    return d.promise;
}
