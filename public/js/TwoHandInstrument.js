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

var toneGain = null;
var sweepEnv = null;

var tempo = 44;
let fc = null;

const errorThreshold = 100;
const maxError = 300;
const midFc = 200;
const maxFc = 1000;


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

        this.driver = null;
        this.driverId = null;
        this.leapDriver = null;
        this.leapDriverId = null;
    }

    //***** GUI driven acctions *****/

    initGUI() {
        let inst = this;

        $("#startDrums").click(() => inst.startDrums());
        $("#stopDrums").click(() => inst.stopDrums());
        $("#leftUp").click(() => inst.leftUp());
        $("#changePart").on('input', () => inst.changeDrumPart());
        $("#changeTempo").on('input', () => inst.changeDrumsTempo());
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

    updateLeapInfo(){
        this.updateDrumPartFromLeap();
    }

    updateDrumPartFromLeap(){
        if (app.leapWatcher) {
            var lz = this.LHzLeap;
            var rx = this.RHxLeap;
            var th = this.lhzTreshold;
            if (lz > th){
                var partNo = this.scaleRHxFromLeap(rx);
                this.changeDrumPart(partNo);
            }
            else {
                console.log("***** Lift the left hand higher to change the drum part!! *****");
                return;
            }
        }
    }
    scaleRHxFromLeap(x){
        var partNo = Math.floor((x/this.rhxLeapStep) -1) + 3;
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
            else
            {
                console.log("left hand is below head, no part change");
                partNo = null;
            }
        }
    }


    scaleRHx(x) {
        //var partNo = ((x - this.minX) / this.Xstep) + 1;
        var partNo = Math.floor((x - this.RHx)/this.rhxstep) + 3;
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
        var leapLastFrame = app.leapWatcher.leapClient.lastFrame;
        this.leapDriver = app.leapWatcher.leapClient;
        this.leapDriverId = leapLastFrame.id;
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
        if(leapLastFrame.hands.length){
            this.RHFromLeap = app.leapWatcher.RHAND.get();
            this.LHFromLeap = app.leapWatcher.LHAND.get();
            this.RHxLeap = this.RHFromLeap[0];
            this.LHzLeap = this.LHFromLeap[1];
            this.lhzTreshold = 180;
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
        this.drumPart.start();
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

}
