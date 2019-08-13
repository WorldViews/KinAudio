//TODO: move these parameters to members of Prog1 iff appropriate

/*
var part = new Tone.Part(function(time, pitch){
	synth.triggerAttackRelease(pitch, "8n", time);
}, [["0", "C#3"], ["4n", "G3"], [3 * Tone.Time("8n"), "G#3"], ["2n", "C3"]]);

part.start("4m");
*/

let part1 = [["0", "C#3"], ["4n", "G3"], [3 * Tone.Time("8n"), "G#3"], ["2n", "C3"]];
let part2 = [["0", "C3"], ["4n", null], [3 * Tone.Time("8n"),"Eb3"], [4 * Tone.Time("8n"),"F4"], [4 * Tone.Time("8n") + 1/3 * Tone.Time("4n"),"Bb4"], [4 * Tone.Time("8n") + 2/3 * Tone.Time("4n"),"Bb4"]];
let seq1 = ["C3", [null, "Eb3"], ["F4", "Bb4", "C5"]]; 

var toneGain = null;
var sweepEnv = null;

var tempo = 44;
let fc = null;

const energyThreshold = 100;
const maxEnergy = 300;
const midFc = 200;
const maxFc = 1000;


class Prog1 extends AudioProgram {
    constructor(app, opts) {
        super(app, opts);
        this.counter = 0;
        this.tickNum = 0;
        this.part = part1; // part1 as default
        this.drumPart = null;
        this.initGUI();
    }

    setDrumPart(drumPart){
      this.part = drumPart;
    }

    triggerDrums(drumPart, duration){
      this.part = drumPart;
      this.drumPart = new Tone.Part(function(time, pitch){
      	synth.triggerAttackRelease(pitch, duration, time);
      }, this.part);
    }

    start() {
        var drums = this.toneTool.createDrum();
        this.drums = drums;
        this.toneTool.addFilter(drums, 150, 'lowpass', -12);
        this.toneTool.addReverb(this.toneTool.filter, 0.5);
        this.toneTool.currentBpm = tempo;
        triggerDrums(drumPart, "8n");
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
        var statusStr = sprintf("%s Step: %4d Tempo: %3d  PlaySpeed: %5.1f  SmooSpeed: %5.1f",
            this.constructor.name, this.tickNum, this.tempo, this.playSpeed, this.smooSpeed);
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
