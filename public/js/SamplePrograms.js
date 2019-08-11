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
        this.part1 = [
            [null, null, null],
            [null, null, null],
            [null, null, null],
            [220, null, null],
            [null, null, null],
            [null, null, null],
            [null, null, null]];
    }

    triggerDrums(onset, notes, duration, time, volume){
        if (this.counter % 8 == onset){
            this.drums.triggerAttackRelease(notes[0],duration,time,volume);
            this.drums2.triggerAttackRelease(notes[1],duration,time,volume);
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

        /*
        churchBell = toneTool.createBell(100, 100, 250, 8, -20);
        let delay2 = toneTool.addFeedbackDelay(churchBell, 0.05, 0.5);
        let reverb2 = toneTool.addReverb(delay2, 0.2);
        churchBell.chain(delay2, reverb2, Tone.Master);
        */
    }

    loadAudio() {
        console.log("loadAudio");
       var url = '../Audio/samples/RVSoundscapeV2.wav';
        var startTime = 0;
        console.log("loading audio", url, startTime);
        this.audioEffects.loadAudio(url, () => {
            console.log("ready to startAudio");
            this.audioEffects.addBiquad(this.audioEffects.source, 500, 'lowpass');
            console.log("audioEffects.source", this.audioEffects.source);
            this.audioEffects.startAudio(this.audioEffects.source);
        });
    }

    noticePoseFit(msg, rvWatcher) {
        console.log("Prog noticePoseFit");
        this.changePartTempo(rvWatcher.playSpeed, rvWatcher.smooSpeed);
    }

    changePartTempo(playSpeed, smooSpeed) {
        if (!this.toneTool) {
            console.log("changePartTempo ... ignored - no toneTool");
            return;
        }
        tempo = this.toneTool.calculateTempo(playSpeed, smooSpeed);
        tempo = this.toneTool.getClosestTempo(tempo); // target tempo in bpm
        this.toneTool.setTempo(tempo);
        return tempo;
    }

}



