
class Program {
    constructor(app) {
        this.app = app;
    }

    onCreate() {
    }

    onDestroy() {
    }
}

class AudioProgram extends Program {
    constructor(app, opts) {
        super(app);
        this.rvWatcher = app.rvWatcher;
        this.skelWatcher = app.skelWatcher;
    }

// Main lifecycle events...
    init() {
        this.toneTool = app.toneTool;
        this.audioEffects = app.audioEffects;
    }

    // This gets called once when the Program is started
    start() {
        console.log("start");
    }

    // this gets called every processing cycle
    update() {
        console.log("AudioProgram.update");
    }

    // This gets called once when a program is ended, and should
    // perform cleanup.
    finish() {
        console.log("finish");
    }

    // This gets called when RVWatcher has a new poseFitMessage.
    noticePoseFit(msg, rvWatcher) {
    }

}

