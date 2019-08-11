
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
}

