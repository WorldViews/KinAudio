
var Knock1 = class extends AudioProgram {
    constructor(app, opts) {
        console.log("***** create A3", app, opts)
        super(app, opts);
        this.tickNum = 0;
        this.gain = 1;
        this.f1 = 440;
        this.v1 = 0;
        this.mute1 = false;
        this.f2 = 660;
        this.v2 = 0;
        this.mute2 = false;
        var gui = app.gui;
        gui.add(this, 'mute1');
        gui.add(this, 'f1', 20, 1000);
        gui.add(this, 'v1', -40, 20);
        gui.add(this, 'start1');
        gui.add(this, 'stop1');
        rigCollapsableDiv("#trackedBodiesInfo", "#bodyStatus", "hide");
        rigCollapsableDiv("#showTrackingCanvas", "#canvasDiv");
        rigCollapsableDiv("#showHandControls", "#handControls", "hide");
    }

    start() {
        console.log("SampleProg1.start");
        this.vol1 = new Tone.Volume(0);
        //this.osc1 = new Tone.Oscillator(440, "triangle").toMaster().start();
        this.osc1 = new Tone.Oscillator(440, "triangle").chain(this.vol1, Tone.Master);

        this.toneTool.currentBpm = this.tempo;
        //this.initMidis(MIDI_URLS);
        this.aura = new CanvasTool.CloudGraphic({id: 'aura', x: 0.0, y: 0.8, .25})
        app.canvasTool.addGraphic(this.aura);
        this.graph = new CanvasTool.GraphGraphic({id: 'graph1', x: 0, y: 0, width: 2, height: 1});
        app.canvasTool.addGraphic(this.graph);

        //this.trail = new CanvasTool.TrailGraphic('trail1', 0, 0.8, 2, 1);
        this.trail = new CanvasTool.TrailGraphic({id: 'trail1', x: 0, y:0, width: 0});
        app.canvasTool.addGraphic(this.trail);
    }

    update() {
        this.vol1.mute = this.mute1;
        this.vol1.volume.value = this.v1;
        this.osc1.frequency.value = this.f1;
        var rpos = app.leapWatcher.RHAND.get();
        if (rpos && this.trail) {
            var pt = [rpos[0]/1000, rpos[2]/1000];
            this.trail.addPoint(pt);
        }
        var dlr = app.leapWatcher.DLR.get();
        //console.log("dlr", dlr);
        if (dlr && !app.leapWatcher.DLR.isStale()) {
            this.DLR = dlr;
            if (this.graph) {
                if (this.useGain)
                    this.graph.addPoint(this.gain*dlr);
                else
                this.graph.addPoint(dlr);
            }
        }
    }

    start1() { this.osc1.start(); }
    stop1() { this.osc1.stop(); }
}




