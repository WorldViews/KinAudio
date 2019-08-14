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

const energyThreshold = 100;
const maxEnergy = 300;
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
                console.log("drumPart note changing to", drumPart[notes]);
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

    stopDrums(){
        if(this.drums == null){
            console.log("No drums created");
            return;
        }
        else {
            this.drumPart.stop();
        }
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
        return;
        var statusStr = sprintf("%s Step: %4d Tempo: %3d  PlaySpeed: %5.1f  SmooSpeed: %5.1f",
            this.constructor.name, this.tickNum, this.tempo, this.playSpeed, this.smooSpeed);
        //console.log("status:", statusStr);
        $("#status").html(statusStr);
    }


    //***** GUI driven acctions *****/

    initGUI() {
        let inst = this;

        $("#changePart").on('input', () => inst.changeDrumPart());
        $("#stopDrums").click(() => inst.stopDrums());
    }

    changeDrumPart() {
        if (this.drumPart == null) {
            console.log("No drumPart created");
        }
        else {
            var partNo = document.getElementById("changePart").value;
            var drumPart;
            partNo = Math.round(partNo);
            console.log("new part playing with part number", partNo);
            switch (partNo) {
                case 1:
                    drumPart = part1;
                    break;
                case 2:
                    drumPart = part2;
                    break;
                case 3:
                    drumPart = part3;
                    break;
                case 4:
                    drumPart = part4;
                    break;
                case 5:
                    drumPart = part5;
                    break;
                default:
                    drumPart = part1;
            }
            this.setDrumPart(drumPart);
        }
    }


}
