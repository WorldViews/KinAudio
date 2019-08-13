
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
        this.toneTool = app.toneTool;
        this.audioEffects = app.audioEffects;
    }

    start() {
        console.log("start");
    }

    finish() {
        console.log("finish");
    }

    noticePoseFit(msg, rvWatcher) {

    }

    // gets called every processing cycle
    update() {

    }
}

