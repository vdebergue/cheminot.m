
export function start(progress: (string, any?) => void): Q.Promise<void> {
    var d = Q.defer<any>();

    var worker = new Worker('app/workers/setup.js');
    worker.postMessage(JSON.stringify({
        event: 'config',
        data: window['CONFIG']
    }));

    worker.onmessage = (e) => {
        var msg = JSON.parse(e.data);
        if(msg.event != 'end') {
            var ns = "worker."
            progress(ns + msg.event, msg.data);
        } else {
            console.log('Setup terminated');
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
