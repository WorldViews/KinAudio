
var A4 = class extends AudioProgram {
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
        gui.add(this, 'mute2');
        gui.add(this, 'f2', 20, 1000);
        gui.add(this, 'v2', -40, 20);
        gui.add(this, 'start2');
        gui.add(this, 'stop2');
    }

    start() {
        console.log("SampleProg1.start");
        this.vol1 = new Tone.Volume(0);
        this.vol2 = new Tone.Volume(0);
        //this.osc1 = new Tone.Oscillator(440, "triangle").toMaster().start();
        this.osc1 = new Tone.Oscillator(440, "triangle").chain(this.vol1, Tone.Master);
        //this.osc2 = new Tone.Oscillator(660, "triangle").toMaster().start();
        this.osc2 = new Tone.Oscillator(440, "triangle").chain(this.vol2, Tone.Master);
        //Tone.Transport.start();
    }

    start1() { this.osc1.start(); }
    stop1() { this.osc1.stop(); }
    start2() { this.osc2.start(); }
    stop2() { this.osc2.stop(); }

    update() {
        this.vol1.mute = this.mute1;
        this.vol1.volume.value = this.v1;
        this.osc1.frequency.value = this.f1;

        this.vol2.mute = this.mute2;
        this.vol2.volume.value = this.v2;
        this.osc2.frequency.value = this.f2;
    }
}




