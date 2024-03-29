var MIDI_URLS = [
    "/rvaudio/midi/wtc0.midi.json",
    "/rvaudio/midi/shimauta.midi.json",
    "/rvaudio/midi/NA_6-8_NmlStr_Congas_195.midi.json",
//    "/rvaudio/midi/NA_12-8_NmlStr_T167_FullKit_158.midi.json"
    //"/rvaudio/midi/taiko.midi.json"
    "/rvaudio/midi/P1000380.midi.drum.json"
];

var CW = {
    tempoOffset: 0
};

class Song {
    constructor(name, midi, url) {
        this.name = name;
        this.midi = midi;
        this.url = url;
        this.synths = [];
        this.parts = [];
    }

    init() {
        var midi = this.midi;
        Tone.Transport.PPQ = midi.header.ppq
        const numofVoices = midi.tracks.length
        var synths = this.synths;
        var inst = this;
        inst.tmax = 0;

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
            midi.tracks[i].notes.forEach(note => {
                inst.tmax = Math.max(inst.tmax, note.ticks);
            })
        }
        //setupPlayer(midi)  //only does this once makeSong finished
    }

    start() {
        this.parts.forEach(part => part.start());
    }

    stop() {
        this.parts.forEach(part => part.stop());
    }

    dump() {
        console.log("-----------------------------------");
        console.log("Midi song "+this.name+" "+this.url);
        var ntracks = this.midi.tracks.length;
        console.log(sprintf("ppq: %s", this.midi.header.ppq));
        console.log("tmax:", this.tmax);
        console.log("num tracks: "+ntracks);
        for (var i=0; i<ntracks; i++) {
            var track = this.midi.tracks[i];
            var nnotes = track.notes.length;
            var tmax = 0;
            if (nnotes) {
                var note = track.notes[nnotes-1];
                var tmax = note.ticks;
            }
            console.log(sprintf("track%02d %4d notes  tmax: %4d", i+1, nnotes, tmax));
        }
        console.log("-----------------------------------");
    }

    static async getSong(name, url) {
        var url = url || "/rvaudio/midi/wtc0.midi.json";
        console.log("getSong "+url);
        var mobj = await loadJSON(url);
        var jstr = JSON.stringify(mobj, null, 3);
        console.log("midi:" + jstr);
        return new Song(name, mobj, url);
    }
}

class MidiGraphic extends CanvasTool.Graphic {
    constructor(song, x, y) {
        super({id: song.name, x, y});
        this.song = song;
    }

    draw(canvas, ctx) {
        super.draw(canvas, ctx);
        var midi = this.song.midi;
        var ntracks = midi.tracks.length;
        ctx.beginPath();
        var ytrack = 0;
        var tscale = 0.0001;
        for (var i=0; i<ntracks; i++) {
            var track = midi.tracks[i];
            var notes = track.notes;
            var ytrack = this.y + 0.1*i;
            for (var j=0; j<notes.length; j++) {
                var note = notes[j];
                var t = note.ticks;
                var dur = note.duration;
                var x = t*tscale;
                var dx = dur*0.1;
                var y = ytrack + 0.01*note.midi;
                ctx.moveTo(x, y);
                ctx.lineTo(x+dx, y);
            }
        }
        ctx.stroke();
    }

}

///var song1 = null;
//var song2 = null;

async function startMidi(name, url) {
    var song = await Song.getSong(name, url);
    song.init();
    return song;
}


class MidiPlay1 extends AudioProgram {
    constructor(app, opts) {
        super(app, opts);
        this.counter = 0;
        this.tickNum = 0;
        this.songs = [];
        this.initGUI();
        var gui = app.gui;
        this.gain = 1;
        this.tempo = 44;
        this.useGain = true;
        this.randomVal = 0;
        this.DLR = .1;
        this.newRandVal = function() {
            this.randomVal = Math.random();
        }
        gui.add(this, 'gain', 0, 5);
        gui.add(this, 'DLR', 0, 1.5).listen();
        gui.add(this, 'useGain');
        gui.add(this, 'randomVal', -2, 2).listen();
        gui.add(this, 'newRandVal');
        gui.add(this, "dumpSongs");
    }

    //***** GUI driven acctions *****/

    initGUI() {
        console.log("*** Play1.initGUI");
        let inst = this;
        $("#tempo").on('input', () => inst.changeTempoFromSlider());
        $("#start").click(() => Tone.Transport.start());
        $("#stop").click(() => Tone.Transport.stop());
        $("#startMidi1").click(() => inst.songs[0].start());
        $("#stopMidi1").click(() => inst.songs[0].stop());
        $("#startMidi2").click(() => inst.songs[1].start());
        $("#stopMidi2").click(() => inst.songs[1].stop());
        $("#startMidi3").click(() => inst.songs[2].start());
        $("#stopMidi3").click(() => inst.songs[2].stop());
        $("#startMidi4").click(() => inst.songs[3].start());
        $("#stopMidi4").click(() => inst.songs[3].stop());
    }

    dumpSongs() {
        this.songs.forEach(song => song.dump());
    }

    updateStatus() {
        return;
        var statusStr = sprintf("%s Step: %4d Tempo: %3d  PlaySpeed: %5.1f  SmooSpeed: %5.1f",
            this.constructor.name, this.tickNum, this.tempo, this.playSpeed, this.smooSpeed);
        //console.log("status:", statusStr);
        $("#status").html(statusStr);
    }

    update() {
        //var rv = this.rvWatcher;
        //console.log("speed:", rv.playSpeed);
        //this.changePartTempo(rv.playSpeed, rv.smooSpeed);
        //this.handleBodies();
        var rpos = app.leapWatcher.RHAND.get();
        if (rpos && this.trail) {
            var pt = [rpos[0]/1000, rpos[1]/1000];
            this.trail.addPoint(pt);
        }
        var dlr = app.leapWatcher.DLR.get();
        //console.log("dlr", dlr);
        if (dlr && !app.leapWatcher.DLR.isStale()) {
            this.DLR = dlr;
            this.auraGraphic.r = dlr;
            if (this.graph) {
                if (this.useGain)
                    this.graph.addPoint(this.gain*dlr);
                else
                this.graph.addPoint(dlr);
            }
        }
        var tempoMin = 40;
        var tempo = tempoMin + 200*this.DLR;
        //this.toneTool.setTempo(tempo);
        this.updateLeapInfo();
        this.updateStatus();
    }


    start() {
        this.toneTool.currentBpm = this.tempo;
        this.initMidis(MIDI_URLS);
        this.auraGraphic = new CanvasTool.CloudGraphic({id: 'cloud', x: 0.0, y: 0.8, r: .25})
        app.canvasTool.addGraphic(this.auraGraphic);
        this.graph = new CanvasTool.GraphGraphic('graph1', 0, 0, 2, 1);
        app.canvasTool.addGraphic(this.graph);

        this.trail = new CanvasTool.TrailGraphic('trail1', 0, 0.8, 2, 1);
        app.canvasTool.addGraphic(this.trail);
   }

    async initMidis(urls) {
        var dy = 0.5;
        for (var i=0; i<urls.length; i++) {
            if (!this.songs[i]) {
                var name = "song"+i;
                var song = await startMidi(name, urls[i]);
                this.songs[i] = song;
                var songGraphic = new MidiGraphic(song, -1, dy*i);
                app.canvasTool.addGraphic(songGraphic);
            }
        }
        Tone.Transport.start();
    }


    loadAudio() {
        console.log("loadAudio");
        var url = '/rvaudio/audio/samples/RVSoundscapeV2.wav';
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

    updateLeapInfo() {
       // this.changeTempoFromLeap();
    }

    changeTempoFromLeap() {
        if (app.leapWatcher) {
            var d = app.leapWatcher.DLR.get();
            if (d == null)
                return;
            var tempoMin = 40;
            var tempo = tempoMin + 200*d;
            this.toneTool.setTempo(tempo);
        }
    }

    changeTempoFromSlider() {
        if (!this.toneTool) {
            console.log("changePartTempo ... ignored - no toneTool");
            return;
        }
        var tempoMin = 10;
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

//MidiPlay1.noHTML = false;

//app.setProgram(new MidiPlay1(app));
