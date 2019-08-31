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

var errorThreshold = 100;
var maxError = 300;
var midFc = 200;
var maxFc = 1000;

class TwoHandInstrument extends AudioProgram {
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
        this.maxX = 800; // min-max X axis for right hand range
        //this.Xstep = (this.maxX - this.minX) / this.maxPartNo;
        this.rhxstep = 75;
        this.rhxLeapStep = 50;
        this.RHx = null;
        this.RHxLeap = null;
        this.LHzLeap = null;
        this.handWatcher = null;

        this.driver = null;
        this.driverId = null;
        this.leapHandsCount = 0;
        this.auraTone = null;
        this.maxDLR = 50;
        this.maxVLR = 50;
        this.minHLR = 90;
        this.maxHLR = 250;
        this.auraVoices = null;

        this.initializeLeapSmoothing();
    }

    //***** GUI driven acctions *****/

    initGUI() {
        let inst = this;

        $("#startDrums").click(() => inst.startDrums());
        $("#stopDrums").click(() => inst.stopDrums());
        $("#leftUp").click(() => inst.leftUp());
        $("#playAuraTone").click(() => inst.playAuraTone());
        $("#stopAuraTone").click(() => inst.stopAuraTone());
        $("#createAuraTone").click(() => inst.createAuraTone());
        $("#changePart").on('input', () => inst.changeDrumPart());
        $("#changeTempo").on('input', () => inst.changeDrumsTempo());
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
        this.handleBodies();
        this.updateStatus();
        //this.updateDrumPart();
        this.updateLeapInfo();
    }

    updateLeapInfo() {
        //this.updateDrumPartFromLeap();
        //this.smoothLeapData();
        this.updateAuraToneFromLeap();
    }

    initializeLeapSmoothing(){
        this.VLRfilter = new OneEuroFilter(0.1,0.1,0.001, 1);
        this.DLRfilter = new OneEuroFilter(10,1,0.001, 1);
        this.HLRfilter = new OneEuroFilter(10,1,0.001, 1);
    }

    smoothLeapData(VLR, DLR, HLR){
        if (DLR == null){
            DLR = 0; // reset DLR if not computed
        }

        if (VLR > 20*this.maxVLR){
            VLR = 20*this.maxVLR;
        }
        var timeStamp = getClockTime();
        var VLRSmoo = this.VLRfilter.filter(VLR, timeStamp);
        var DLRSmoo = this.DLRfilter.filter(DLR, timeStamp);
        var HLRSmoo = this.HLRfilter.filter(HLR, timeStamp);

        // find out which rate works better for which value

        return [VLRSmoo, DLRSmoo, HLRSmoo];

    }

    updateAuraToneFromLeap() {
        if (this.handWatcher <= 0)
            return;
        var rhXvel = this.RHFromLeap[3];
        var lhXvel = this.LHFromLeap[3];
        var DLR = this.DLRFromLeap; // in mms
        var aveVLR = (Math.abs(rhXvel) + Math.abs(lhXvel)) / 2;

       var HLR = (this.RHFromLeap[1] + this.LHFromLeap[1])/2;

       var leapData = [aveVLR, DLR, HLR];
       document.getElementById("originalVelocity").value = aveVLR;
       document.getElementById("originalDistance").value = DLR*10;
       var smoothData = this.smoothLeapData(aveVLR, DLR, HLR);
       aveVLR = smoothData[0];
       DLR = smoothData[1];
       document.getElementById("smoothVelocity").value = smoothData[0];
       document.getElementById("smoothDistance").value = smoothData[1]*10;
       
       HLR = HLR - this.minHLR;
       HLR = HLR/this.maxHLR;
    
       if(HLR > 1){
           HLR = 0.99;
       }
       else if (HLR < 0){
           HLR = 0.01;
       }
       var volume = 24*Math.log10(HLR);

       //console.log("Average height, ", HLR, "volume, ", volume);

        if (aveVLR > this.maxVLR * 10) {
            aveVLR = this.maxVLR * 10;
        }
        
        DLR = Math.round(DLR * 10);
        aveVLR = Math.round(aveVLR / 5);

        //console.log("aveVLR, ", aveVLR);

        if ($("#usingAudioEffects").prop('checked') && !$("#usingToneTool").prop('checked')) {
            //this.tuneAuraTone(aveVLR / 10, DLR * 100);
        }
        if ($("#usingToneTool").prop('checked') && !$("#usingAudioEffects").prop('checked')) {
            this.tuneAuraToneFromTone(DLR, aveVLR, volume);
        }

        //console.log("Leap Data:, ", leapData);
        //console.log("Smooth Data:, ",smoothData);

    }

    updateDrumPartFromLeap() {
        if (app.leapWatcher) {
            var lz = this.LHzLeap;
            var rx = this.RHxLeap;
            var th = this.lhzTreshold;
            if (lz > th) {
                var partNo = this.scaleRHxFromLeap(rx);
                this.changeDrumPart(partNo);
            }
            else {
                console.log("***** Lift the left hand higher to change the drum part!! *****");
                return;
            }
        }
    }
    scaleRHxFromLeap(x) {
        var partNo = Math.floor((x / this.rhxLeapStep) - 1) + 3;
        console.log("partNo ", partNo);
        return partNo;
    }

    updateDrumPart() {
        var sw = this.skelWatcher;
        var rv = this.rvWatcher;

        if (this.getDriver()) {
            var driver = this.getDriver();
            if (driver.LEFT_UP.get() && !driver.RIGHT_UP.get()) {
                var RHxy = rv.prevMsg.controlPoints[0].pt;
                var RHx = RHxy[0];
                var RHy = RHxy[1];
                console.log("Right hand x position ", RHx);
                if (rv.prevMsg.controlPoints['length'] == 2) {
                    var LHxy = rv.prevMsg.controlPoints[1].pt;
                    var LHx = LHxy[0];
                    var LHy = LHxy[1];
                }

                var partNo = this.scaleRHx(RHx);
                this.changeDrumPart(partNo);
            }
            else {
                console.log("left hand is below head, no part change");
                partNo = null;
            }
        }
    }


    scaleRHx(x) {
        //var partNo = ((x - this.minX) / this.Xstep) + 1;
        var partNo = Math.floor((x - this.RHx) / this.rhxstep) + 3;
        console.log("partNo ", partNo);
        return partNo;
    }

    leftUp() {
        var sw = this.skelWatcher;
        var body = this.getDriver();
        body.LEFT_UP = true;
        this.RH_Slide();
    }

    leftDown() {
        var sw = this.skelWatcher;
        var body = this.getDriver();
        body.LEFT_UP = false;
    }

    // ?: Do we need a left hand up checker in RH_Slider ?
    RH_Slide() {
        var partNo = document.getElementById("RH_Slide").value;
        this.changeDrumPart(partNo);
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
                console.log("TwoHandInstrument driver is set with id and body number, ", this.driverId, this.bodyNum);
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
        if (app.leapWatcher == null || app.leapWatcher.leapClient == null)
            return;
        var leapLastFrame = app.leapWatcher.leapClient.lastFrame;
        if (leapLastFrame == null || leapLastFrame.hands == null)
            return;
        //console.log("frame", leapLastFrame);
        //console.log("hands", leapLastFrame.hands);
        this.handWatcher = leapLastFrame.hands.length;
        if (leapLastFrame.hands.length != 0) {
            this.leapHandsCount++;
            this.RHFromLeap = app.leapWatcher.RHAND.get();
            this.LHFromLeap = app.leapWatcher.LHAND.get();
            this.DLRFromLeap = app.leapWatcher.DLR.get();
            this.RHxLeap = this.RHFromLeap[0];
            this.LHzLeap = this.LHFromLeap[1];
            this.lhzTreshold = 180;

            //console.log("Average velocity", (Math.abs( this.LHFromLeap[3])+Math.abs( this.RHFromLeap[3]))/2);
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
        var drums = this.toneTool.createDrum();
        this.drums = drums;
        this.toneTool.addFilter(drums, 150, 'lowpass', -12);
        this.toneTool.addReverb(this.toneTool.filter, 0.5);
        this.toneTool.currentBpm = tempo;
        var drumPart = part1;
        this.triggerDrums(drumPart, "8n");
        //this.drumPart.start();
        Tone.Transport.start();
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
        return;
        this.tickNum++;
        //console.log("Prog noticePoseFit");
        this.changePartTempo(rvWatcher.playSpeed, rvWatcher.smooSpeed);
        this.updateStatus();
    }

    setDrumPart(drumPart) {
        this.part = drumPart;
        if (this.drums == null) {
            console.log("No drums created");
            return;
        }
        else {
            this.drumPart.removeAll();
            for (var notes in drumPart) {
                //console.log("drumPart note changing to", drumPart[notes]);
                this.drumPart.add(drumPart[notes][0], drumPart[notes][1]);
            }
        }
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

    changeDrumPart(partNo) {
        if (this.drumPart == null) {
            console.log("No drumPart created");
        }
        else {
            if (partNo == null) {
                partNo = document.getElementById("changePart").value;
                console.log("partNo is assigned by slider value");
            }
            var drumPart;
            var beepSeq = ["C4"];
            partNo = Math.round(partNo);
            console.log("new part playing with part number", partNo);
            switch (partNo) {
                case 1:
                    drumPart = part1;
                    beepSeq = ["C4"];
                    break;
                case 2:
                    drumPart = part2;
                    beepSeq = ["C4", "C4"];
                    break;
                case 3:
                    drumPart = part3;
                    beepSeq = ["C4", "C4", "C4"];
                    break;
                case 4:
                    drumPart = part4;
                    beepSeq = ["C4", "C4", "C4", "C4"];
                    break;
                case 5:
                    drumPart = part5;
                    break;
                default:
                    drumPart = part1;
            }
            //this.playBeep(partNo, beepSeq);
            this.setDrumPart(drumPart);
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

    playBeep(no, seq) {
        var beep = new Tone.Synth().toMaster();
        var conga = this.toneTool.createConga();
        if (no != 5) {
            var beepSeq = new Tone.Sequence(function (time, note) {
                beep.triggerAttackRelease(note, "16n", time)
            }, seq, '4n');
            beepSeq.loop = 0;
            beepSeq.start();
        }
        else {
            conga.triggerAttackRelease("C4", "2n");
        }
    }

    createAuraTone() {
        if (!$("#usingToneTool").prop('checked') && $("#usingAudioEffects").prop('checked')) {
            //this.generateAuraTone(6, 6, 110);
            console.log("Aura tone is created from AudioEffects");
        }
        else if ($("#usingToneTool").prop('checked') && !$("#usingAudioEffects").prop('checked')) {
            this.generateAuraTonefromTone();
            console.log("Aura tone is created from ToneTool");
        }
        else {
            console.log("Select only one aura tone generator!");
            return;
        }
    }

    updateAuraTone() {
        var DLR = document.getElementById("DLR").value;
        var velocity = document.getElementById("velocity").value;
        if (!$("#usingToneTool").prop('checked') && $("#usingAudioEffects").prop('checked')) {
            //this.tuneAuraTone(velocity, DLR);
        }
        if ($("#usingToneTool").prop('checked') && !$("#usingAudioEffects").prop('checked')) {
            this.tuneAuraToneFromTone(DLR / 5, velocity * 2);
        }
    }

    generateAuraTone(numOscs, maxOverTone, f0) {
        var audioEffects = this.audioEffects;
        this.SinOscs = [];
        this.SinOscGains = [];
        this.oscOuts = [];
        this.outGains = [];
        for (var i = 0; i < numOscs; i++) {
            this.oscOuts[i] = audioEffects.audioContext.createGain();
            this.SinOscs[i] = [];
            this.SinOscGains[i] = [];
            for (var j = 0; j < maxOverTone; j++) {
                var osc = audioEffects.audioContext.createOscillator();
                var oscNum = i * maxOverTone + j;
                osc.type = 'sine';
                osc.frequency.value = f0;
                var oscGain = audioEffects.audioContext.createGain();
                oscGain.gain.setValueAtTime(0, audioEffects.audioContext.currentTime);
                this.SinOscs[i][j] = osc;
                this.SinOscGains[i][j] = oscGain;
                this.SinOscs[i][j].oscNum = oscNum;
                this.SinOscs[i][j].connect(this.SinOscGains[i][j]);
                this.SinOscGains[i][j].connect(this.oscOuts[i]);
            }
            this.outGains[i] = audioEffects.audioContext.createGain();
            this.oscOuts[i].connect(this.outGains[i]);
            this.oscOuts[i].gain.setValueAtTime(0, audioEffects.audioContext.currentTime);
            this.outGains[i].gain.setValueAtTime(0, audioEffects.audioContext.currentTime);
        }
        this.initiateAuraTone(numOscs, maxOverTone, f0);

    }

    initiateAuraTone(numOscs, maxOverTone, f0) {
        this.auraTone = [
            {
                id: "SinOsc",
                type: "oscillatorNode",
                element: this.SinOscs
            },
            {
                id: "SinOscGains",
                type: "gainNode",
                element: this.SinOscGains
            },
            {
                id: "oscOuts",
                type: "gainNode",
                element: this.oscOuts
            },
            {
                id: "outGains",
                type: "gainNode",
                element: this.outGains
            },
        ];
        this.auraTone.numOscs = numOscs;
        this.auraTone.numOverTones = maxOverTone;
        this.auraTone.f0 = f0;
        this.auraTone.masterGain = 0.1;
        this.auraTone.targetGain = 0.3;
    }

    connectAuraTone() {
        for (var i = 0; i < this.outGains.length; i++) {
            this.outGains[i].connect(this.audioEffects.audioContext.destination);
        }
    }

    playAuraTone() {
        if ($("#usingAudioEffects").prop('checked') && !$("#usingToneTool").prop('checked')) {
            //this.playAuraToneFromAE();
        }
        if ($("#usingToneTool").prop('checked') && !$("#usingAudioEffects").prop('checked')) {
            var note = this.auraVoices.chord[0];
            this.playAuraToneFromTone(note);
            this.auraVoices.notes.push(note);
        }
    }

    stopAuraTone() {
        if ($("#usingAudioEffects").prop('checked') && !$("#usingToneTool").prop('checked')) {
            //this.stopAuraToneFromAE();
        }
        if ($("#usingToneTool").prop('checked') && !$("#usingAudioEffects").prop('checked')) {
            /*
            for (var note in this.auraVoices.notes){
                var lastNote =  this.auraVoices.notes[note];
                this.stopAuraToneFromTone(lastNote);
            }
            */
           for (var i=0; i<this.auraVoices.notes.length; i++){
               var lastNote = this.auraVoices.notes.pop();
               this.stopAuraToneFromTone(lastNote);
           }
        }
    }

    // TODO: add fade in and fade out envelopes
    playAuraToneFromAE() {
        this.connectAuraTone();
        this.tuneAuraTone(0, 0);
        if (this.SinOscs != null) {
            for (var tone in this.SinOscs) {
                for (var osc in this.SinOscs[tone]) {
                    this.SinOscs[tone][osc].start();
                }
                this.audioEffects.fadein(this.SinOscGains[tone]);
                this.audioEffects.fadein(this.oscOuts);
            }
        }
        else {
            console.log("No aura tone!");
            return;
        }
        this.audioEffects.fadein(this.outGains);
    }


    stopAuraToneFromAE() {
        this.audioEffects.fadeout(this.outGains);
        if (this.SinOscs != null) {
            for (var tone in this.SinOscs) {
                for (var osc in this.SinOscs[tone]) {
                    this.SinOscs[tone][osc].stop(this.audioEffects.audioContext.currentTime + 1);
                }
            }
        }
        else {
            console.log("No aura tone!");
            return;
        }
    }

    tuneAuraTone(velocity, DLR) {
        if (this.auraTone == null) {
            console.log("Create AuraTone");
            return;
        }
        var attackCoef = 5;
        var relaseCoef = 0.99;
        var maxDLR = this.maxDLR;
        var maxVLR = this.maxVLR;
        this.auraTone.overToneScale = (maxDLR - DLR) / maxDLR;
        //this.auraTone.overToneScale = 1;
        var detune = velocity / maxVLR * 0.001;
        var timbre = 0.98;
        var t = this.audioEffects.audioContext.currentTime;

        console.log("DLR in tuneAuraTone, ", DLR);

        if (DLR > 45) {
            this.auraTone.masterGain += DLR * 0.01 / attackCoef;
        }
        else {
            this.auraTone.masterGain *= relaseCoef;
        }
        if (this.auraTone.masterGain > this.oscOuts.length) {
            this.auraTone.masterGain = this.oscOuts.length;
        }
        for (var i = 0; i < this.oscOuts.length; i++) {
            this.oscOuts[i].gain.setValueAtTime(this.auraTone.masterGain / (i + 2), this.audioEffects.audioContext.currentTime);
            console.log("auraTone.masterGain, ", this.auraTone.masterGain / (i + 2));
        }

        for (var tone in this.SinOscs) {
            for (var osc in this.SinOscs[tone]) {
                var oscGain = 1 / Math.pow((osc + 1), this.auraTone.overToneScale) / (this.auraTone.numOverTones);
                this.SinOscGains[tone][osc].gain.setValueAtTime(oscGain, this.audioEffects.audioContext.currentTime);
                var freq = this.auraTone.f0 / this.auraTone.numOverTones * Math.pow((osc + 1), (Math.pow(timbre, this.auraTone.numOscs / 2))) * (detune * tone + 1);
                if (freq < this.auraTone.f0 / 2) {
                    freq = this.auraTone.f0 / 2;
                }
                this.SinOscs[tone][osc].frequency.setValueAtTime(freq, this.audioEffects.audioContext.currentTime);
            }
            var outGain = (1 + (DLR / maxDLR) * Math.cos(2 * 3.14 * t * (tone + 1) / this.auraTone.numOscs) / (2 * this.auraTone.numOscs));
            console.log("oscillator gains, ", outGain);
            this.outGains[tone].gain.setValueAtTime(outGain, this.audioEffects.audioContext.currentTime);
        }
    }

    generateAuraTonefromTone() {
        var voices = new Tone.PolySynth(8, Tone.Synth, {
            "oscillator": {
                "type": "fatsine",
                "partials": [0, 2, 3, 4],
                "partialCount": 0,
                "spread": 60,
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
        return voices;
    }

    tuneAuraToneFromTone(DLR, velocity, volume) {


        //console.log("tuneAuraToneFromTone with DLR, ", DLR, " and velocity, ", velocity);
        var freq = Math.floor(velocity + 1);
        this.auraVoices.set({
            "oscillator": {
                "spread": velocity
            }
        });

        // control the volume
        this.auraVoices.volume.value = volume;
        //console.log("auraVoices.volume:, ", volume);

        if (DLR > 1.5){
            if (!this.auraVoices.notes.includes(this.auraVoices.chord[1])){
            this.auraVoices.notes.push(this.auraVoices.chord[1]);
            this.playAuraToneFromTone(this.auraVoices.notes);
            }
        }
        if (DLR > 3){
            if (!this.auraVoices.notes.includes(this.auraVoices.chord[2])){
                this.auraVoices.notes.push(this.auraVoices.chord[2]);
                this.playAuraToneFromTone(this.auraVoices.notes);
            }
        }
        if (DLR < 3){
            if (this.auraVoices.notes.includes(this.auraVoices.chord[2])){
                this.stopAuraToneFromTone(this.auraVoices.chord[2]);
                this.auraVoices.notes.pop();
            }
        }
        if (DLR < 1.5){
            if (this.auraVoices.notes.includes(this.auraVoices.chord[1])){
                this.stopAuraToneFromTone(this.auraVoices.chord[1]);
                this.auraVoices.notes.pop();
            }
        }

        if (DLR > 5){
            this.changeAuraChord();
        }
        //console.log("playing the aura notes, ", this.auraVoices.notes);

        console.log("playing aura notes:, ", this.auraVoices.notes);


        // TODO #2: create a pattern array and play the notes based on the velocity
        // TODO #1: smooth the velocity - 
        // TODO #0: add gain control - done
    }

    changeAuraChord(){
        var chord = this.auraVoices.chord;
        var chordNo = chords.indexOf(chord);
        var nextChordNo = (chordNo+1)%chords.length;
        console.log("Chord is changed from, ", chord);
        var newChord =  chords[nextChordNo];
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
            this.auraVoices.triggerRelease( notes ,this.audioEffects.currentTime);
        }
    }

}