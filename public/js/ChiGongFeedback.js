//TODO: move these parameters to members of Prog1 iff appropriate

/*
var part = new Tone.Part(function(time, pitch){
	synth.triggerAttackRelease(pitch, "8n", time);
}, [["0", "C#3"], ["4n", "G3"], [3 * Tone.Time("8n"), "G#3"], ["2n", "C3"]]);

part.start("4m");
*/

let part1 = [["0", "C#3"], ["4n", "G3"], [3 * Tone.Time("8n"), "G#3"], ["2n", "C3"]];
let part2 = [["0", "C3"], ["4n", null], [3 * Tone.Time("8n"), "Eb3"], [4 * Tone.Time("8n"), "F4"], [4 * Tone.Time("8n") + 1 / 3 * Tone.Time("4n"), "Bb4"], [4 * Tone.Time("8n") + 2 / 3 * Tone.Time("4n"), "Bb4"]];
let part3 = [["0", "F#3"], ["8n", "G3"], ["4n", "G#3"], [3 * Tone.Time("8n"), "D4"], ["2n", "F#3"], [5 * Tone.Time("8n"), "G3"]]; // Phrygian gates, J.Adams, m.944
let part4 = [["0", "Gb3"], ["8n", "A3"], ["4n", "C4"], [3 * Tone.Time("8n"), "Gb3"], ["2n", "A3"], [5 * Tone.Time("8n"), "C4"]]; // Phrygian gates, J.Adams, m.945
let part5 = [["0", "F#3"], ["8n", "A#3"], ["4n", "B#3"], [3 * Tone.Time("8n"), "C4"], ["2n", "D4"], [5 * Tone.Time("8n"), "F#3"]]; // Phrygian gates, J.Adams, m.946

let seq1 = ["C3", [null, "Eb3"], ["F4", "Bb4", "C5"]];

let chords = [["Eb3", "C2", "Ab2"], ["Eb3", "C2", "Ab3"], ["Eb3", "C2", "G3"]];

var toneGain = null;
var sweepEnv = null;

var tempo = 44;
let fc = null;

const errorThreshold = 100;
const maxError = 300;
const midFc = 200;
const maxFc = 1000;

class ChiGongFeedback extends AudioProgram {
    constructor(app, opts) {
        super(app, opts);
        this.counter = 0;
        this.tickNum = 0;
        this.part = part1; // part1 as default
        this.drumPart = null;
        this.initGUI();

        this.msg = this.rvWatcher.msg;
        this.maxPartNo = 5;
        this.minX = 400;
        this.maxX = 800;

        this.driver = null;
        this.driverId = null;
        this.auraTone = null;
        this.maxDLR = 50;
        this.maxVLR = 70;
        this.minVLR = 10;
        this.minHLR = 90;
        this.maxHLR = 250;
        this.auraVoices = null;

        //this.initializeLeapSmoothing();
    }

    //***** GUI driven acctions *****/

    initGUI() {
        let inst = this;

        $("#startDrums").click(() => inst.startDrums());
        $("#stopDrums").click(() => inst.stopDrums());
        $("#playAuraTone").click(() => inst.playAuraTone());
        $("#stopAuraTone").click(() => inst.stopAuraTone());
        $("#createAuraTone").click(() => inst.createAuraTone());
        $("#DLR").on('input', () => inst.updateAuraTone());
        $("#velocity").on('input', () => inst.updateAuraTone());
    }

    updateStatus() {
        return;
        var statusStr = sprintf("%s Step: %4d Tempo: %3d  PlaySpeed: %5.1f  SmooSpeed: %5.1f",
            this.constructor.name, this.tickNum, this.tempo, this.playSpeed, this.smooSpeed);
        //console.log("status:", statusStr);
        $("#status").html(statusStr);

    }

    update() {
        var rv = this.rvWatcher;
        //this.changePartTempo(rv.playSpeed, rv.smooSpeed);
        //this.changeFilterParam(rv.poseError);
        this.handleBodies();
        this.updateStatus();
    }

    noticePoseFit(msg, rvWatcher) {
        this.tickNum++;
        //console.log("Prog noticePoseFit");
        //this.changePartTempo(rvWatcher.playSpeed, rvWatcher.smooSpeed);
        this.updateAuraToneFromKinect(msg, rvWatcher);
        this.updateStatus();
    }

    handleBodies() {
        var rv = this.rvWatcher;
        var sw = this.skelWatcher;
        var J = JointType;
        for (var bodyId in sw.bodies) {
            var body = sw.bodies[bodyId];
            if (body.TRIGGER.get()) {
                this.driverId = bodyId;
                this.driver = body;
                this.bodyNum = sw.bodies[bodyId].bodyNum;
                console.log("ChiGong driver is set with id and body number, ", this.driverId, this.bodyNum);
                this.RHx = rv.prevMsg.controlPoints[0].pt[0];
            }
            /*
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
            */
        }
    }

    getDriver() {
        if (this.driver == null) {
            console.log("No driver");
            return;
        }
        else {
            var driver = this.driver;
        }
        return driver;
    }

    getDriverId() {
        if (this.driver == null) {
            console.log("No driver");
            return;
        }
        else {
            var driverId = this.driverId;
        }
        return driverId;
    }


    start() {
        Tone.Transport.start();
        this.generateAuraTonefromTone();
        var note = this.auraVoices.chord[0];
        this.playAuraToneFromTone(note);
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

    /////////////////////// Aura Voice Section ////////////////////////
    updateAuraToneFromKinect(msg, rvWatcher) {
        // TODO #1: replace data with posefit msg data - done
        // TODO #2: calibrate data for ChiGong - done for VLR and DLR
        // TODO #3: see which smoothing to use
        // TODO #4: Check if the skelwatcher RHAND is broken

        if (!this.driver) {
            return;
        }
        var rv = rvWatcher;
        this.RHAND = this.driver.RHAND.get();
        this.LHAND = this.driver.LHAND.get();
        // receive kinect x axis data => TODO: Double check if x is the first element in the array
        var rhXvel = Math.abs(this.RHAND[3]);
        var lhXvel = Math.abs(this.LHAND[3]);
        // recieve the distance data
        var DLR = this.driver.DLR.get(); // in what? m? mm?
        var VLR = (rhXvel + lhXvel) * 50 / 2; // check the velocity values again

        var playSpeed = rv.playSpeed; // => map it to volume
        if (playSpeed > 0.999) {
            playSpeed = 0.999;
        }
        else if (playSpeed < 0) {
            playSpeed = 0.001;
        }

        var volume = 24 * Math.log10(playSpeed);


        if (VLR < this.minVLR){
            VLR = this.minVLR;
        } 
        else if (VLR > this.maxVLR){
            VLR = this.maxVLR;
        }
        
        DLR = Math.round(DLR * 10);
        console.log("VLR with scaling of 50,  ", VLR);
        VLR = Math.round(VLR);
        console.log("DLR -two hand distance value is, ", DLR);
        this.tuneAuraToneFromTone(DLR, VLR);

        //console.log("Leap Data:, ", leapData);
        //console.log("Smooth Data:, ",smoothData);

    }

    updateAuraTone() {
        var DLR = document.getElementById("DLR").value;
        var velocity = document.getElementById("velocity").value;
        this.tuneAuraToneFromTone(DLR / 5, velocity * 2);
    }

    playAuraTone() {

        var note = this.auraVoices.chord[0];
        this.playAuraToneFromTone(note);
        this.auraVoices.notes.push(note);
    }

    stopAuraTone() {
        for (var i = 0; i < this.auraVoices.notes.length; i++) {
            var lastNote = this.auraVoices.notes.pop();
            this.stopAuraToneFromTone(lastNote);
        }

    }

    generateAuraTonefromTone() {
        var voices = new Tone.PolySynth(8, Tone.Synth, {
            "oscillator": {
                "type": "fatsine",
                "partials": [0, 2, 3, 4],
                "partialCount": 0,
                "spread": 10,
                "count": 10
            },
            "envelope": {
                "attackCurve": "sine",
                "attack": 0.4,
                "decayCurve": "exponential",
                "decay": 0.1,
                "sustain": 1,
                "releaseCurve": "exponential",
                "release": 0.4,
            }
        });

        voices.volume.value = -12;

        var filter = new Tone.Filter({
            type: "lowpass",
            frequency: 440,
            rolloff: -12,
            Q: 1
        });

        //voices.chain(filter, Tone.Master);
        voices.chain(Tone.Master);
        this.auraVoices = voices;
        this.auraVoices.filter = filter;
        this.auraVoices.chord = chords[0];
        this.auraVoices.notes = [];

        console.log("****** Aura Voices are generates from ToneTool.");
        return voices;
    }

    tuneAuraToneFromTone(DLR, velocity, volume) {
        //console.log("tuneAuraToneFromTone with DLR, ", DLR, " and velocity, ", velocity);
        this.auraVoices.set({
            "oscillator": {
                "spread": velocity
            }
        });
        

        console.log("velocity value in tuneAuraToneFromTone is ", velocity);

        // control the volume
        //this.auraVoices.volume.value = volume;
        //console.log("auraVoices.volume:, ", volume);

        if (DLR > 2) {
            if (!this.auraVoices.notes.includes(this.auraVoices.chord[1])) {
                this.auraVoices.notes.push(this.auraVoices.chord[1]);
                this.playAuraToneFromTone(this.auraVoices.notes);
            }
        }
        if (DLR > 4) {
            if (!this.auraVoices.notes.includes(this.auraVoices.chord[2])) {
                this.auraVoices.notes.push(this.auraVoices.chord[2]);
                this.playAuraToneFromTone(this.auraVoices.notes);
            }
        }
        if (DLR < 4) {
            if (this.auraVoices.notes.includes(this.auraVoices.chord[2])) {
                this.stopAuraToneFromTone(this.auraVoices.chord[2]);
                this.auraVoices.notes.pop();
            }
        }
        if (DLR < 2) {
            if (this.auraVoices.notes.includes(this.auraVoices.chord[1])) {
                this.stopAuraToneFromTone(this.auraVoices.chord[1]);
                this.auraVoices.notes.pop();
            }
        }

        if (DLR > 7) {
            this.changeAuraChord();
        }
        //console.log("playing the aura notes, ", this.auraVoices.notes);

        console.log("playing aura notes:, ", this.auraVoices.notes);


        // TODO #2: create a pattern array and play the notes based on the velocity
        // TODO #1: smooth the velocity - 
        // TODO #0: add gain control - done
    }

    changeAuraChord() {
        var chord = this.auraVoices.chord;
        var chordNo = chords.indexOf(chord);
        var nextChordNo = (chordNo + 1) % chords.length;
        console.log("Chord is changed from, ", chord);
        var newChord = chords[nextChordNo];
        this.auraVoices.chord = newChord;
        this.auraVoices.notes = newChord.slice(0);
        console.log("...to, ", newChord);
        this.playAuraToneFromTone(this.auraVoices.notes);
    }

    playAuraToneFromTone(notes) {
        this.auraVoices.triggerAttack(notes, this.audioEffects.currentTime);

    }

    stopAuraToneFromTone(notes) {
        if (this.auraVoices == null) {
            console.log("No auraTone created");
            return;
        }
        else {
            this.auraVoices.triggerRelease(notes, this.audioEffects.currentTime);
        }
    }

    /////////////////////// Drum Part Section ////////////////////////

    generateDrums() {
        var drums = this.toneTool.createDrum();
        this.drums = drums;
        this.toneTool.addFilter(drums, 150, 'lowpass', -12);
        this.toneTool.addReverb(this.toneTool.filter, 0.5);
        this.toneTool.currentBpm = tempo;
        var drumPart = part1;
        this.triggerDrums(drumPart, "8n");
    }

    triggerDrums(drumPart, duration) {
        this.part = drumPart;
        var inst = this;
        this.drumPart = new Tone.Part(function (time, pitch) {
            inst.drums.triggerAttackRelease(pitch, duration, time);
        }, inst.part);
        this.drumPart.loop = true;
    }

    startDrums() {
        if (this.drums == null) {
            console.log("Creating drums ...");
            this.start();
        }
        else {
            this.drumPart.start();
        }
    }

    stopDrums() {
        if (this.drums == null) {
            console.log("No drums created");
            return;
        }
        else {
            this.drumPart.stop();
        }
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

    changeDrumsTempo() {
        if (!this.toneTool) {
            console.log("changePartTempo ... ignored - no toneTool");
            return;
        }
        tempo = document.getElementById("changeTempo").value;
        console.log("tempo is now ", tempo);
        tempo = this.toneTool.getClosestTempo(tempo); // target tempo in bpm
        this.tempo = tempo;
        this.toneTool.setTempo(tempo);
        console.log("tempo is set to ", tempo);
    }
}

