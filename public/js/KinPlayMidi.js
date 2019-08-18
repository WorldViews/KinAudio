var CW = {
    tempoOffset: 0
};

class Song {
    constructor(midi) {
        this.midi = midi;
        this.synths = [];
        this.parts = [];
    }

    init() {
        var midi = this.midi;
        Tone.Transport.PPQ = midi.header.ppq
        const numofVoices = midi.tracks.length
        var synths = this.synths;

        //************** Tell Transport about Time Signature changes  ********************
        for (let i = 0; i < midi.header.timeSignatures.length; i++) {
            Tone.Transport.schedule(function (time) {
                Tone.Transport.timeSignature = midi.header.timeSignatures[i].timeSignature;
                console.log(midi.header.timeSignatures[i].timeSignature, Tone.Transport.timeSignature,
                    Tone.Transport.position)
            }, midi.header.timeSignatures[i].ticks + "i");
        }

        //************** Tell Transport about bpm changes  ********************
        for (let i = 0; i < midi.header.tempos.length; i++) {
            Tone.Transport.schedule(function (time) {
                Tone.Transport.bpm.value = midi.header.tempos[i].bpm + CW.tempoOffset;
            }, midi.header.tempos[i].ticks + "i");
        }

        //************ Change time from seconds to ticks in each part  *************
        for (let i = 0; i < numofVoices; i++) {
            midi.tracks[i].notes.forEach(note => {
                note.time = note.ticks + "i"
            })
        }

        //************** Create Synths and Parts, one for each track  ********************
        for (let i = 0; i < numofVoices; i++) {
            synths[i] = new Tone.PolySynth().toMaster()

            //var part = new Tone.Part(function (time, value) {
            //    synths[i].triggerAttackRelease(value.name, value.duration, time, value.velocity)
            //}, midi.tracks[i].notes).start()
            var part = new Tone.Part(function (time, value) {
                synths[i].triggerAttackRelease(value.name, value.duration, time, value.velocity)
            }, midi.tracks[i].notes);
            this.parts[i] = part;
        }
        //setupPlayer(midi)  //only does this once makeSong finished
    }

    start() {
        this.parts.forEach(part => part.start());
    }

    stop() {
        this.parts.forEach(part => part.stop());
    }

    static async getSong(url) {
        var url = url || "/rvaudio/midi/wtc0.midi.json";
        console.log("getSong "+url);
        var mobj = await loadJSON(url);
        var jstr = JSON.stringify(mobj, null, 3);
        console.log("midi:" + jstr);
        return new Song(mobj);
    }
}

var song = null;

async function startMidi() {
    var url = "/rvaudio/midi/wtc0.midi.json";
    song = await Song.getSong(url);
    song.init();
}


class KinMidiPlay extends AudioProgram {
    constructor(app, opts) {
        super(app, opts);
        this.counter = 0;
        this.tickNum = 0;
        this.initGUI();
    }

    //***** GUI driven acctions *****/

    initGUI() {
        let inst = this;
        $("#tempo").on('input', () => inst.changeTempoFromSlider());
        $("#start").click(() => Tone.Transport.start());
        $("#stop").click(() => Tone.Transport.stop());
        $("#startMidi").click(() => song.start());
        $("#stopMidi").click(() => song.stop());
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
        console.log("speed:", rv.playSpeed);
        //this.changePartTempo(rv.playSpeed, rv.smooSpeed);
        //this.handleBodies();
        this.updateStatus();
    }


    start() {
        this.toneTool.currentBpm = tempo;
        startMidi();
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

    changeTempo(playSpeed, smooSpeed) {
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


    changeTempoFromSlider() {
        if (!this.toneTool) {
            console.log("changePartTempo ... ignored - no toneTool");
            return;
        }
        var tempoMin = 40;
        var tempoMax = 200;
        var v = document.getElementById("tempo").value;
        console.log("v:", v);
        var tempo = tempoMin + (v / 1000.0) * (tempoMax - tempoMin);
        console.log("tempo is now ", tempo);
        this.tempo = tempo;
        this.toneTool.setTempo(tempo);
        console.log("tempo is set to ", tempo);
    }

}
