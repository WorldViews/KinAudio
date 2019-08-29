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
        this.lastChordChangeTime = getClockTime();

        this.initOneEuroFilters();

        // dat.DUI controls
        var gui = app.gui;

        this.VLR = 0;
        this.smoothVLR = 0;
        this.DLR = 0;
        this.volume = -12;
        this.playSpeed = 0;
        this.smoothPlaySpeed = 0.1;
        this.auraEnergy = 0;
        this.poseFitMessage = false;


        var s01 = gui.addFolder('RV Data');
        var s02 = gui.addFolder('VLR Filter Parameters');
        var s03 = gui.addFolder('Aura Parameters');
        s01.add(this, 'DLR', 0, 15).listen();
        s01.add(this, 'VLR', 0, 70).listen();
        s01.add(this, 'smoothVLR', 0, 70).listen();
        s01.add(this, 'volume', -48, 6).listen();
        s01.add(this, 'playSpeed', -1, 1).listen();
        s01.add(this, 'smoothPlaySpeed', -1, 1).listen();
        s02.add(this, 'cutoff', 0, 1.0);
        s02.add(this, 'minCutoff', 0, 1.0);
        s02.add(this, 'beta', 0, 1.0);
        s02.add(this, 'alpha', 0, 1.0);
        s02.add(this, 'setVLRFilterParameters');
        s03.add(this,'auraEnergy', 1, 1000).listen();
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
        this.updateAuraEnergy();
        this.handleBodies();
        this.updateStatus();
    }

    noticePoseFit(msg, rvWatcher) {
        this.tickNum++;
        //console.log("Prog noticePoseFit");
        //this.changePartTempo(rvWatcher.playSpeed, rvWatcher.smooSpeed);
        this.updateAuraToneFromKinect(msg, rvWatcher);
        this.updateStatus();
        this.setAuraEnergyFromKinect();
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

    initOneEuroFilters() {
        this.cutoff = 0.1;
        this.minCutoff = 0.1;
        this.beta = 0.001;
        this.alpha = 1;
        this.VLRFilter = new OneEuroFilter(this.cutoff, this.minCutoff, this.beta, this.alpha);
        this.playSpeedFilter = new OneEuroFilter(this.cutoff, this.minCutoff, this.beta, this.alpha);
        this.setVLRFilterParameters = function () {
            this.VLRFilter.setFrequency(this.cutoff);
            this.VLRFilter.setMinCutoff(this.minCutoff);
            this.VLRFilter.setBeta(this.beta);
            console.log("OneEuroFilter for VLR parameters are set to; cutoff, ", this.cutoff, "minCutoff,  ", this.minCutoff, "beta, ", this.beta);
        }
    }

    smoothVLRData(VLR) {
        var timeStamp = getClockTime();
        var VLRSmoo = this.VLRFilter.filter(VLR, timeStamp);
        this.smoothVLR = VLRSmoo;

        return VLRSmoo;
    }

    smoothPSData(ps){
        var timeStamp = getClockTime();
        var psSmoo = this.playSpeedFilter.filter(ps, timeStamp);
        this.smoothPlaySpeed = psSmoo;

        return psSmoo;
    }

    updateAuraEnergy() {
        var aMax = this.auraEnergy/1000;
        var auras = [
            {name: "hands", rgb: [255,50,0], aMax,
             joints: [JointType.handLeft, JointType.handRight]}
        ];
        var msg = {'type':'setProps', auras};
        app.portal.sendMessage(msg);
    }
    setAuraEnergyFromKinect(){
        var rv = this.rvWatcher;
        if (rv.msg.type == 'poseFit'){
            var poseError = rv.poseError;
            if (poseError > 150){
                poseError = 150;
            }
            poseError = (1 - poseError/150)*1000;
            this.auraEnergy = poseError;
        }
        else {
            return;
        }
    }

    /////////////////////// Aura Voice Section ////////////////////////
    updateAuraToneFromKinect(msg, rvWatcher) {
        // TODO #1: replace data with posefit msg data - done
        // TODO #2: calibrate data for ChiGong - done for VLR and DLR
        // TODO #3: see which smoothing to use - done (smothing with 1 Euro Filter)
        // TODO #4: Check if the skelwatcher RHAND is broken - done (not broken)

        // TODO #2.1: add only one chord change - limit the duration of chord changes - done
        // TODO #2.2: add volume - done
        // TODO #2.3: check the velocity use (is the modulation enough)
        // TODO #2.4: add aura intensity control 1) gui - done and 2) from kinect - 
        // TODO #2.5: add new chords
        // TODO #2.6: add scale change based on poseError

        if (!this.driver) {
            return;
        }
        var rv = rvWatcher;
        this.RHAND = this.driver.RHAND.get();
        this.LHAND = this.driver.LHAND.get();
        var rhXvel = Math.abs(this.RHAND[3]);
        var lhXvel = Math.abs(this.LHAND[3]);
        var DLR = this.driver.DLR.get(); 
        var VLR = (rhXvel + lhXvel) * 50 / 2; 
        var playSpeed = rv.playSpeed;
        playSpeed = this.smoothPSData(playSpeed)/5.0;

        if (playSpeed > 0.999) {
            playSpeed = 0.999;
        }
        else if (playSpeed <= 0) {
            playSpeed = 0.1;
        }
        this.playSpeed = playSpeed;
        var volume = 12 * Math.log10(playSpeed);

        if (VLR < this.minVLR) {
            VLR = this.minVLR;
        }
        else if (VLR > this.maxVLR) {
            VLR = this.maxVLR;
        }

        DLR = Math.round(DLR * 10);
        VLR = Math.round(VLR);
        var VLRSmoo = this.smoothVLRData(VLR);
        this.tuneAuraToneFromTone(DLR, VLR, volume);
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

        voices.volume.value = -18;

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
        this.VLR = velocity;
        this.DLR = DLR;
        this.volume = volume;
        //console.log("tuneAuraToneFromTone with DLR, ", DLR, " and velocity, ", velocity);
        this.auraVoices.set({
            "oscillator": {
                "spread": velocity
            }
        });
        //console.log("velocity value in tuneAuraToneFromTone is ", velocity);
        this.selectAuraNotes(DLR);
        this.auraVoices.volume.value = volume;

    }

    selectAuraNotes(DLR) {

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

        //console.log("playing aura notes:, ", this.auraVoices.notes);
    }

    changeAuraChord() {
        var t = getClockTime();
        var dt = t - this.lastChordChangeTime;
        console.log("the time between chord change is ", dt);
        if (dt > 2) {
            this.lastChordChangeTime = getClockTime();
            var chord = this.auraVoices.chord;
            var chordNo = chords.indexOf(chord);
            var nextChordNo = (chordNo + 1) % chords.length;
            console.log("******Chord is changed from, ", chord);
            var newChord = chords[nextChordNo];
            this.auraVoices.chord = newChord;
            this.auraVoices.notes = newChord.slice(0);
            console.log("...to, ", newChord);
            this.playAuraToneFromTone(this.auraVoices.notes);
        }
        else {
            return;
        }
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

