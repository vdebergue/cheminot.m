
export function start(progress: (string, any?) => void) {
    var p: Q.Promise<void>;
    var worker = new Worker('assets/javascripts/app/workers/setup.js');
    worker.postMessage(JSON.stringify({
        event: 'config',
        data: window['CONFIG']
    }));

    worker.onmessage = (e) => {
        var msg = JSON.parse(e.data);
        var ns = "worker."
        progress(ns + msg.event, msg.data);
    }

    worker.postMessage(JSON.stringify({
        event: 'install'
    }));
}
