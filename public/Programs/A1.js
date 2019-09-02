
var A1 = class extends AudioProgram {
    constructor(app, opts) {
        console.log("***** create A1", app, opts)
        super(app, opts);
        console.log("toneTool", this.toneTool)
        this.counter = 0;
        this.tickNum = 0;
        this.smooSpeed = 0;
        this.tempo = 44;
        this.initGUI();
    }

    triggerDrums(onset, notes, duration, time, volume) {
        if (this.counter % 8 == onset) {
            this.drums.triggerAttackRelease(notes[0], duration, time, volume);
            this.drums2.triggerAttackRelease(notes[1], duration, time, volume);
            //console.log(counter);
        }
    }

    start() {
        console.log("SampleProg1.start");
        var drums = this.toneTool.createDrum();
        var drums2 = this.toneTool.createDrum();
        this.drums = drums;
        this.drums2 = drums2;
        drums2.oscillator.type = 'triangle';
        drums2.octaves = 1;
        drums2.volume.value = -14;
        this.toneTool.addFilter(drums, 150, 'lowpass', -12);
        this.toneTool.addFilter(drums2, 150, 'lowpass', -12);
        this.toneTool.addReverb(this.toneTool.filter, 0.5);
        this.toneTool.currentBpm = this.tempo;
        let inst = this;
        this.loopBeat = this.toneTool.createLoopBeat(time => {
            var gain = 0.4;
            inst.triggerDrums(0, ['c3', 'c3'], '4n', time, gain);
            inst.triggerDrums(5, ['f#2', 'f#2'], '8n', time, gain);
            inst.triggerDrums(6, ['f#2', 'f#2'], '8n', time, gain);
            this.counter = (this.counter + 1) % 16;
        }, '16n', this.toneTool.currentBpm);

        this.loopBeat.start();
        Tone.Transport.start();
    }

    update() {
        //super.update();
        var rv = this.rvWatcher;
        //console.log("speed:", rv.playSpeed);
        this.changePartTempo(rv.playSpeed, rv.smooSpeed);
        this.updateStatus();
    }

    loadAudio() {
        console.log("loadAudio");
        var url = '../Audio/samples/RVSoundscapeV2.wav';
        var startTime = 0;
        console.log("loading audio", url, startTime);
        this.audioEffects.loadAudio(url, () => {
            console.log("ready to startAudio");
            console.log("audioEffects.source", this.audioEffects.source);
            this.audioEffects.addBiquad(this.audioEffects.source, 500, 'lowpass');
            this.audioEffects.startAudio(this.audioEffects.source);
        });
    }

    changePartTempo(playSpeed, smooSpeed) {
        if (!this.toneTool) {
            //console.log("changePartTempo ... ignored - no toneTool");
            return;
        }
        //console.log("playSpeed:", playSpeed, "smooSpeed", smooSpeed);
        this.playSpeed = playSpeed;
        this.smooSpeed = smooSpeed;
        var tempo = this.toneTool.calculateTempo(playSpeed, smooSpeed);
        tempo = this.toneTool.getClosestTempo(tempo); // target tempo in bpm
        this.tempo = tempo;
        this.toneTool.setTempo(tempo);
    }

    updateStatus() {
        var name = "prog1";
        var statusStr = "...";
        try {
            statusStr = sprintf("%s Step: %4d Tempo: %3d  PlaySpeed: %5.1f",
                name, this.tickNum, this.tempo, this.playSpeed);
        }
        catch (e) { }
        $("#status").html(statusStr);
    }


    //***** GUI driven acctions *****/

    initGUI() {
        console.log("A1.initGUI...");
        let inst = this;
        $("#loadAudio").click(() => inst.loadAudio());
        $("#addFilter").click(() => inst.addFilter());
        $("#removeFilter").click(() => inst.removeFilter());
        $("#filterFrequency").on('input', () => inst.changeFilterFrequency());
        $("#detune").on('input', () => inst.changeFilterDetune());
        $("#Q").on('input', () => inst.changeFilterQ());
    }

    changeFilterFrequency() {
        if (this.audioEffects.biquad == null) {
            console.log("No filter added yet");
        }
        else {
            var f = document.getElementById("filterFrequency").value;
            console.log("new frequency value: ", f);
            this.audioEffects.biquad.frequency.value = f;
        }
    }

    changeFilterDetune() {
        if (this.audioEffects.biquad == null) {
            console.log("No filter added yet");
        }
        else {
            var detune = document.getElementById("detune").value;
            console.log("new frequency value: ", detune);
            this.audioEffects.biquad.detune.value = detune;
        }
    }

    changeFilterQ() {
        if (this.audioEffects.biquad == null) {
            console.log("No filter added yet");
        }
        else {
            var q = document.getElementById("Q").value;
            console.log("new frequency value: ", q);
            this.audioEffects.biquad.Q.value = q;
        }
    }

    addFilter() {
        console.log("addFilter");
        var defaultFreq = 350;
        var type = "lowpass";
        this.audioEffects.addBiquad(this.audioEffects.source, defaultFreq, type);
    }

    removeFilter() {
        console.log("removeFilter");
        var effects = this.audioEffects;
        effects.removeBiquad(effects.source, effects.biquad);
    }

}




