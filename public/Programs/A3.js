
var A3 = class extends AudioProgram {
    constructor(app, opts) {
        console.log("***** create A3", app, opts)
        super(app, opts);
        this.tickNum = 0;
        this.gain = 1;
        this.osc1Vol = -14;
        this.osc2Vol = -14;
        this.initGUI();
    }

    getOsc(note, vol) {
        var osc = this.toneTool.createDrum();
        osc.oscillator.type = 'triangle';
        osc.octaves = 1;
        osc.volume.value = vol;
        osc.triggerAttackRelease(note, 1000);
        return osc;
    }

    start() {
        console.log("SampleProg1.start");
        this.osc1 = this.getOsc('c3', this.osc1Vol);
         this.osc2 = this.getOsc('e3', this.osc2Vol);
        //Tone.Transport.start();
    }

    update() {
       // this.updateStatus();
        this.osc1.volume.value = this.osc1Vol;
        this.osc2.volume.value = this.osc2Vol;
    }

    initGUI() {
        console.log("A1.initGUI...");
        let inst = this;
        this.freq = 200;
        var gui = app.gui;
        gui.add(this, 'freq', 20, 600);
        gui.add(this, 'osc1Vol', -20, 2);
        gui.add(this, 'osc2Vol', -20, 2);
    }
}




