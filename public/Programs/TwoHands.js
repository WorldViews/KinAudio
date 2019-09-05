var tempo = 44;

class TwoHands extends AudioProgram {
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
        this.RHzLeap = null;
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
        this.lastChordChangeTime = getClockTime();
        this.lastTransposeTime = getClockTime();
        this.lastTransCoef = 0;

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

        rigCollapsableDiv("#showHandControls", "#handControls", "hide");
        rigCollapsableDiv("#showAuraToneControls", "#auraToneControls", "hide");
        rigCollapsableDiv("#showDrumsControls", "#drumsControls", "hide");
        rigCollapsableDiv("#showSmoothingControl", "#smooControl", "hide");
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
        this.updatePartFromLeap();
        //this.smoothLeapData();
        this.updateAuraToneFromLeap();
    }

    initializeLeapSmoothing() {
        this.VLRfilter = new OneEuroFilter(0.1, 0.1, 0.001, 1);
        this.DLRfilter = new OneEuroFilter(10, 1, 0.001, 1);
        this.HLRfilter = new OneEuroFilter(10, 1, 0.001, 1);
    }

    smoothLeapData(VLR, DLR, HLR) {
        if (DLR == null) {
            DLR = 0; // reset DLR if not computed
        }

        if (VLR > 20 * this.maxVLR) {
            VLR = 20 * this.maxVLR;
        }
        var timeStamp = getClockTime();
        var VLRSmoo = this.VLRfilter.filter(VLR, timeStamp);
        var DLRSmoo = this.DLRfilter.filter(DLR, timeStamp);
        var HLRSmoo = this.HLRfilter.filter(HLR, timeStamp);

        // find out which rate works better for which value

        return [VLRSmoo, DLRSmoo, HLRSmoo];

    }

    transposeAuraVoices(partNo) {

        var lz = this.LHzLeap;
        var rx = this.RHxLeap;
        var th = this.lhzTreshold;

        var t = getClockTime();
        var dt = t - this.lastTransposeTime;

        if (dt > 20) {
            var transCoef = 0; // in semitones, 0 means no transposition 
            var lastTransCoef = this.lastTransCoef;

            if (partNo < 1) {
                partNo = 1;
            }
            else if (partNo > 5) {
                partNo = 5;
            }

            switch (partNo) {
                case 1:
                    transCoef = -7;
                    break;
                case 2:
                    transCoef = -3;
                    break;
                case 3:
                    transCoef = 0;
                    break;
                case 4:
                    transCoef = 3;
                    break;
                case 5:
                    transCoef = 7;
                    break;
                default:
                    transCoef = 0;
            }
            this.lastTransCoef = transCoef;
            transCoef = transCoef - lastTransCoef;


            for (var chordNo in chords) {
                for (var noteNo in chords[chordNo]) {
                    var note = chords[chordNo][noteNo];
                    var newNote = Tone.Frequency(note).transpose(transCoef).toNote();
                    chords[chordNo][noteNo] = newNote;
                }
            }
            console.log("new chords array is ", chords);
        }
    }

    updateAuraToneFromLeap() {
        if (this.handWatcher <= 0)
            return;
        var rhXvel = this.RHFromLeap[3];
        var lhXvel = this.LHFromLeap[3];
        var DLR = this.DLRFromLeap; // in mms
        var aveVLR = (Math.abs(rhXvel) + Math.abs(lhXvel)) / 2;

        var HLR = (this.RHFromLeap[1] + this.LHFromLeap[1]) / 2;

        var leapData = [aveVLR, DLR, HLR];
        document.getElementById("originalVelocity").value = aveVLR;
        document.getElementById("originalDistance").value = DLR * 10;
        var smoothData = this.smoothLeapData(aveVLR, DLR, HLR);
        aveVLR = smoothData[0];
        DLR = smoothData[1];
        document.getElementById("smoothVelocity").value = smoothData[0];
        document.getElementById("smoothDistance").value = smoothData[1] * 10;

        HLR = HLR - this.minHLR;
        HLR = HLR / this.maxHLR;

        if (HLR > 1) {
            HLR = 0.99;
        }
        else if (HLR < 0) {
            HLR = 0.01;
        }
        var volume = 24 * Math.log10(HLR);

        //console.log("Average height, ", HLR, "volume, ", volume);

        if (aveVLR > this.maxVLR * 10) {
            aveVLR = this.maxVLR * 10;
        }

        DLR = Math.round(DLR * 10);
        aveVLR = Math.round(aveVLR / 5);

        this.toneTool.tuneAuraTone(DLR, aveVLR, volume);

        //console.log("Leap Data:, ", leapData);
        //console.log("Smooth Data:, ",smoothData);

    }

    updatePartFromLeap() {
        if (app.leapWatcher) {
            var lz = this.LHzLeap;
            var rz = this.RHzLeap;
            var rx = this.RHxLeap;
            var th = this.lhzTreshold;
            if ((lz - rz) > th) {
                var partNo = this.scaleRHxFromLeap(rx);
                if (this.drums != null && this.auraVoices == null) {
                    this.changeDrumPart(partNo);
                }
                else {
                    return;
                }
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
            this.RHzLeap = this.RHFromLeap[1];
            this.LHzLeap = this.LHFromLeap[1];
            this.lhzTreshold = 120;

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
        Tone.Transport.start();
        this.createAuraTone();
        this.playAuraTone();
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
            this.generateDrums();
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

        if (this.auraVoices == null) {
            this.generateAuraTonefromTone();
            console.log("Aura tone is created from ToneTool.");
        }
        else {
            console.log("Aura tone is already created.");
            return;
        }
    }

    updateAuraTone() {
        var DLR = document.getElementById("DLR").value;
        var velocity = document.getElementById("velocity").value;
        this.toneTool.tuneAuraTone(DLR / 5, velocity * 2);
    }


    playAuraTone() {
        var note = this.auraVoices.chord[0];
        this.toneTool.playAuraTone(note);
        this.auraVoices.notes.push(note);
    }

    stopAuraTone() {
        for (var i = 0; i < this.auraVoices.notes.length; i++) {
            var lastNote = this.auraVoices.notes.pop();
            this.toneTool.stopAuraTone(lastNote);
        }
        this.auraVoices.dispose();
    }

    generateAuraTonefromTone() {
        this.auraVoices = this.toneTool.generateAuraTone();

        this.toneTool.firstNoteDLR = 1.5;
        this.toneTool.secondNoteDLR = 2.5;
        this.toneTool.chordChangeDLR = 4;
    }
}