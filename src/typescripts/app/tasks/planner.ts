
export function lookForBestTrip() {
    var p: Q.Promise<void>;
    var worker = new Worker('app/workers/planner.js');
    worker.postMessage("Hello world !");

    worker.onmessage = (e) => {
        var msg = JSON.parse(e.data);
        console.log(msg);
    }
}
