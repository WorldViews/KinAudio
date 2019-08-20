//TODO: move these parameters to members of Prog1 iff appropriate

var toneGain = null;
var sweepEnv = null;

var tempo = 44;
let fc = null;

var errorThreshold = 100;
var maxError = 300;
var midFc = 200;
var maxFc = 1000;

try {
    console.log("delete Prog1");
    delete Prog1;
}
catch (e) { };

var RVAudioFeedback = class extends AudioProgram {
    constructor(app, opts) {
        console.log("create Prog1");
        super(app, opts);
        this.counter = 0;
        this.tickNum = 0;
        this.part1 = [
            [null, null, null],
            [null, null, null],
            [null, null, null],
            [220, null, null],
            [null, null, null],
            [null, null, null],
            [null, null, null]];
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
        this.toneTool.currentBpm = tempo;
        let inst = this;
        this.loopBeat = this.toneTool.createLoopBeat(time => {
            var gain = 0.4;
            inst.triggerDrums(0, ['c3', 'c3'], '4n', time, gain);
            inst.triggerDrums(5, ['f#2', 'f#2'], '8n', time, gain);
            inst.triggerDrums(6, ['f#2', 'f#2'], '8n', time, gain);

            var bellPart = inst.toneTool.createBellPart(inst.bell, this.part1);
            //churchBellPart = toneTool.createBellPart(churchBell, part1);

            //bellPart.start(5);
            //churchBellPart.start(10);

            this.counter = (this.counter + 1) % 16;
        }, '16n', this.toneTool.currentBpm);

        this.loopBeat.start();
        //loopBeat.start(0);
        Tone.Transport.start();

        this.bell = this.toneTool.createBell(12, 600, 20, 8, -20);
        let delay = this.toneTool.addFeedbackDelay(this.bell, 0.05, 0.5);
        let reverb = this.toneTool.addReverb(delay, 0.2);
        this.bell.chain(delay, reverb, Tone.Master);

        // load audio
        this.loadAudio();

        /*
        churchBell = toneTool.createBell(100, 100, 250, 8, -20);
        let delay2 = toneTool.addFeedbackDelay(churchBell, 0.05, 0.5);
        let reverb2 = toneTool.addReverb(delay2, 0.2);
        churchBell.chain(delay2, reverb2, Tone.Master);
        */
    }

    update() {
        //super.update();
        var rv = this.rvWatcher;
        console.log("speed:", rv.playSpeed);
        this.changePartTempo(rv.playSpeed, rv.smooSpeed);
        this.changeFilterParam(rv.poseError);
        this.handleBodies();
        this.updateStatus();
    }

    // This is just to give some sample code of some things that can be
    // found from the bodies...
    handleBodies() {
        var sw = this.skelWatcher;
        var J = JointType;
        for (var bodyId in sw.bodies) {
            var body = sw.bodies[bodyId];
            console.log("body", bodyId, body);
            console.log(" head pos", body.getWPos(J.head));
            console.log(" head floor coordinates", body.getFloorXY(J.head));
            console.log(" TRIGGER:", body.TRIGGER.get());
            console.log(" LEFT_UP", body.LEFT_UP.get());
            console.log(" LHAND", body.LHAND.get());
            console.log(" RHAND", body.RHAND.get());
            console.log(" RHAND tracking state", body.getTrackingState(J.handRight));
            console.log(" RHAND joint", body.getJoint(J.handRight));
            console.log(" Dist Left Right", body.DLR.get());
        }
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

    noticePoseFit(msg, rvWatcher) {
        this.tickNum++;
        //console.log("Prog noticePoseFit");
    }

    changePartTempo(playSpeed, smooSpeed) {
        if (!this.toneTool) {
            console.log("changePartTempo ... ignored - no toneTool");
            return;
        }
        //console.log("playSpeed:", playSpeed, "smooSpeed", smooSpeed);
        this.playSpeed = playSpeed;
        this.smooSpeed = smooSpeed;
        tempo = this.toneTool.calculateTempo(playSpeed, smooSpeed);
        tempo = this.toneTool.getClosestTempo(tempo); // target tempo in bpm
        this.tempo = tempo;
        this.toneTool.setTempo(tempo);
    }

    updateStatus() {
        //console.log(this.constructor.name, this.tickNum, this.tempo, this.playSpeed);
        var statusStr = sprintf("%s Step: %4d Tempo: %3d  PlaySpeed: %5.1f",
            this.constructor.name, this.tickNum, this.tempo, this.playSpeed);
        //console.log("status:", statusStr);
        $("#status").html(statusStr);
    }


    //***** GUI driven acctions *****/

    initGUI() {
        let inst = this;

        $("#addFilter").click(() => inst.addFilter());
        $("#removeFilter").click(() => inst.removeFilter());
        $("#filterFrequency").on('input', () => inst.changeFilterFrequency());
        $("#detune").on('input', () => inst.changeFilterDetune());
        $("#Q").on('input', () => inst.changeFilterQ());
    }


    changeFilterParam(error) {
        if (this.audioEffects.biquad == null) {
            console.log("No filter added yet");
        }
        else {
            if (error > maxError) {
                error = maxError;
            }
            if (error <= errorThreshold) {
                fc = maxFc - error * 8;
            }
            else {
                fc = midFc - (error - errorThreshold);
            }
            this.audioEffects.biquad.frequency.value = fc;
            this.audioEffects.biquad.freq = fc;
            console.log("Changing audioEffects.biquad.freq to ", fc, this.audioEffects.biquad.freq, this.audioEffects.biquad.frequency);
        }
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

//app.setProgram(new Prog1(app));



