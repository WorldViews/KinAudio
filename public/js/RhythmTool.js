/*
Originally based on https://github.com/omgmog/beatmaker
although there is little remaining resemblance.
*/

'use strict';
var AudioContext = window.AudioContext || window.webkitAudioContext || false;

//var soundPrefix = 'http://localhost:8000/sounds/';
var soundPrefix = 'sounds/';
var SOUNDS1 = [
    'bass_drum.wav',
    'snare_drum.wav',
    'low_tom.wav',
    'mid_tom.wav',
    'hi_tom.wav',
    'rim_shot.wav',
    'hand_clap.wav',
    'cowbell.wav',
    'cymbal.wav',
    'o_hi_hat.wav',
    'cl_hi_hat.wav',
    'low_conga.wav',
    'mid_conga.wav',
    'hi_conga.wav',
    'claves.wav',
    'maracas.wav'
];

var SOUNDS2 = [
    'count',
    'nihongo',
    'low_conga.wav',
    'mid_conga.wav',
    'hi_conga.wav',
    'claves.wav',
    'cowbell.wav',
    'taiko.wav'
];

var SOUNDS3 = [
    'low_conga.wav',
    'mid_conga.wav',
    'cowbell.wav',
    'taiko.wav',
    'taiko.wav'
];

var buffers = {};
if (AudioContext) {
    var context = new AudioContext();
}

function getClockTime() {
    return new Date().getTime() / 1000.0;
}

// This is a version for uploading to a specified path that may
// not be a session.  (i.e. global configs, etc.)
function uploadToFile(dpath, obj, fileName)
{
    return uploadDataToFile(dpath, JSON.stringify(obj, null, 3), fileName);
}

function uploadDataToFile(dpath, data, fileName)
{
    console.log("uploadDataToFile path " + dpath + "  fileName " + fileName);
    var formData = new FormData();
    formData.append('dir', dpath);
    let blob = new Blob([data], { type: 'application/json' });
    //  formData.append('data', blob, 'data.json');
    formData.append(fileName, blob, fileName);
    var request = new XMLHttpRequest();
    request.onload = function () {
        if (this.status == 200) {
            var r = JSON.parse(this.response);
            console.log(r);
            if (r.error) {
                alert('Error uploading: ' + r.error);
            }
        }
    };
    request.onerror = function (err) { alert('error uploading' + err) };
    request.upload.addEventListener("progress", function (evt) {
        if (evt.lengthComputable) {
            var pc = Math.floor((evt.loaded / evt.total) * 100);
            console.log(pc, '% uploaded');
        }
    }, false);
    request.open("POST", "/api/uploadfile");
    request.send(formData);
}

// This is a promise based version of code for getting
// JSON.
async function loadJSON(url)
{
    console.log("loadJSON: "+url);
    return new Promise((res, rej) => {
        $.ajax({
            url: url,
            dataType: 'text',
            success: function(str) {
                var data;
                try {
                    data = JSON.parse(str);
                }
                catch (err) {
                    console.log("err: "+err);
                    alert("Error in json for: "+url+"\n"+err);
                    rej(err);
                }
                res(data);
            },
            error: function(jqXHR, textStatus, errorThrown) {
                console.log("Failed to get JSON for "+url);
                rej(errorThrown);
            }
        });  
    })
}


class RhythmGUI {
    constructor(tool) {
        this.tool = tool;
    }

    init() {
        this.setupGUI();
    }

    noticeState(r, c, v) {
    }

    setupGUI() {
        var tool = this.tool;
        $('#export').click(() => tool.exportBeat());
        $('#random').click(() => tool.setRandomBeat());
        $('#clear').click(() => tool.clearBeat());
        //$('#beat').click(() => tool.hitBeat());
        $('#beat').mousedown(() => tool.hitBeat());
        this.setupDATGUI();
    }

    setupDATGUI() {
        var inst = this;
        var P = this.tool;
        var gui = new dat.GUI();
        this.tool.datgui = gui;
        gui.add(P, 'pRandOn', 0, 1);
        gui.add(P, 'pMutate', 0, 1);
        gui.add(P, 'pAdd', 0, 1);
        gui.add(P, 'pRemove', 0, 1);
        gui.add(P, "BPM", 0, 160).onChange((bpm) => inst.tool.updateBPM(bpm));
        gui.add(P, "playing").onChange((v) => inst.tool.setPlaying(v));;
        gui.add(P, "tick");
    }
}

// This is like the original HTML Buttom based version
// from https://github.com/omgmog/beatmaker
class ButtonGUI extends RhythmGUI {
    constructor(tool) {
        super(tool);
    }

    setupGUI() {
        super.setupGUI();
        this.beats = {};
        var inst = this;
        var tool = this.tool;
        var div = $("#beatsDiv");
        for (let r = 0; r < tool.numTracks; r++) {
            var beatDiv = div.append("<div class='beats'></div>");
            var soundname = tool.tracks[r].sound.split('.')[0];
            var id = soundname;
            beatDiv.append(sprintf("<input id='%s' type='button' value=' ' style='width:30px;height:30px;margin:4px'></input>", id));
            beatDiv.append(sprintf("%s", soundname));
            beatDiv.append("<br>");
            $("#" + id).click(e => tool.hitBeat(r));
            for (let c = 0; c < tool.TICKS; c++) {
                let id = sprintf("b_%s_%s", r, c);
                let beat = $(sprintf("<input type='button' class='beatsbutton' id='%s' value=''></input>", id));
                beatDiv.append(beat);
                beat.click((e) => tool.clickedOn(r, c));
                this.beats[(r, c)] = beat;
            }
            beatDiv.append("<p>");
        }
    }

    noticeState(r, c, v) {
        var bt = this.tool.getBeat(r, c);
        bt.css('background-color', v ? 'blue' : 'white');
    }

}


class RhythmTool {
    constructor(opts) {
        opts = opts || {};
        this.songs = [];
        this.states = {};
        this.muted = {};
        this.numTracks = 0;
        this.playing = false;
        this.BPM = 80;
        //this.TICKS = 16;
        this.beatsPerMeasure = 4;
        this.numMeasures = 4;
        this.TICKS = this.beatsPerMeasure * this.numMeasures;
        this.pRandOn = .3;
        this.pMutate = 0.001;
        this.pAdd = .02;
        this.pRemove = 0.02;
        this.t = 0;
        this.currentTick = 0;
        this.beatNum = 0;
        this.lastTick = this.TICKS - 1;
        this.tickTime = 1 / (4 * this.BPM / (60 * 1000));
        var guiClass = opts.guiClass || ButtonGUI;
        //console.log("class", guiClass);
        this.gui = new guiClass(this);
        this.initFromSounds(opts.sounds);
        this.gui.init();
        //this.gui = new RhythmGUI(this);
        this.setRandomBeat();
        this.addSongButton("songs/triplets.json", "triplets");
        this.addSongButton("songs/cowbells24.json", "cowbells24");
        this.addSongButton("songs/cowbells33.json", "cowbells33");
        this.addSongButton("songs/taikoEx1.json", "TaikoExercise1");
        this.addSongButton("songs/taikoEx2.json", "TaikoExercise2");
        this.addSongButton("songs/taikoEx3.json", "TaikoExercise3");
    }

    initFromSounds(sounds) {
        sounds = sounds || SOUNDS2;
        this.numTracks = sounds.length;
        this.tracks = [];
        for (var i=0; i<this.numTracks; i++) {
            var name = sounds[i];
            var sound = name;
            if (name.indexOf('.') >= 0)
                name = name.split('.')[0];
            this.tracks[i] = {name, sound};
        }
    }

    start() {
        var inst = this;
        //this.requestInterval(() => inst.handleTick(), 1 / (4 * this.BPM / (60 * 1000)));
        this.requestInterval();
    }

    setMuted(r, val) {
        console.log("setMuted", r, val);
        this.muted[r] = val;
    }

    playSound(url) {
        //console.log("playSound "+url);
        if (!AudioContext) {
            new Audio(url).play();
            return;
        }
        if (typeof (buffers[url]) == 'undefined') {
            buffers[url] = null;
            var req = new XMLHttpRequest();
            req.open('GET', url, true);
            req.responseType = 'arraybuffer';

            req.onload = function () {
                context.decodeAudioData(req.response,
                    function (buffer) {
                        buffers[url] = buffer;
                        playBuffer(buffer);
                    },
                    function (err) {
                        console.log(err);
                    }
                );
            };
            req.send();
        }
        function playBuffer(buffer) {
            var source = context.createBufferSource();
            source.buffer = buffer;
            source.connect(context.destination);
            source.start();
        };
        if (buffers[url]) {
            playBuffer(buffers[url]);
        }
    }

    requestInterval() {
        var inst = this;
        this.lastClockTime = getClockTime();
        this.iPrevBeatNum = -1;
        var handle = {};

        function loop() {
            if (inst.playing) {
                inst.updateBPM(inst.BPM);
            }
            handle.value = requestAnimationFrame(loop);
        }
        handle.value = requestAnimationFrame(loop);
        return handle;
    }

    setBeatNum(beatNum) {
        beatNum = beatNum % this.TICKS;
        this.beatNum = beatNum;
        $("#beatNum").html(sprintf("%.2f", this.beatNum));
        //console.log("beatNum", inst.beatNum);
        this.gui.noticeTime(beatNum);
        var iBeatNum = Math.floor(beatNum);
        this.lastTick = this.currentTick;
        this.currentTick = iBeatNum;
        if (iBeatNum != this.iPrevBeatNum) {
            this.handleBeat();
            this.iPrevBeatNum = iBeatNum;
        }
    }

    handleBeat() {
        //this.gui.noticeTime(this.t);
        this.gui.activateBeat(this.currentTick);
        for (let i = 0; i < this.numTracks; i++) {
            this.setBeatBorder(i, this.lastTick, 'grey');
            this.setBeatBorder(i, this.currentTick, 'red');
            if (this.muted[i])
                continue;
            if (this.getState(i, this.currentTick)) {
                //console.log("tick play ", i, this.currentTick);
                this.playSound(soundPrefix + this.tracks[i].sound)
            }
        }
        this.mutate();
    }

    setPlaying(v) {
        console.log("setPlaying", v);
        this.playing = v;
        if (this.playing) {
            this.lastClockTime = getClockTime();
            this.updateBPM(this.BPM);
        }
    }

    updateBPM(bpm) {
        //console.log(">bpm ", bpm, this);
        var t = getClockTime();
        var delta = t - this.lastClockTime;
        this.lastClockTime = t;
        var beatDelay = 1 / (4 * bpm / 60.0);
        var beatNum = this.beatNum + delta / beatDelay;
        this.setBeatNum(beatNum)
    }

    tick() {
        this.setBeatNum(this.beatNum + 1);
        console.log("tick...");
    }

    getBeat(r, c) {
        let id = sprintf("#b_%s_%s", r, c); ''
        return $(id);
    }

    setBeatBorder(r, c, color) {
        //console.log("setBeatBG", r, c);
        this.getBeat(r, c).css('border-color', color);
    }

    clear() {
        this.tracks = [];
        this.numTracks = 0;
        this.states = {};
    }

    clearBeat() {
        for (var r = 0; r < this.numTracks; r++) {
            for (var c = 0; c < this.TICKS; c++) {
                this.setState(r, c, false);
            }
        }
    }

    setRandomBeat() {
        this.clearBeat();
        for (var r = 0; r < this.numTracks; r++) {
            for (var c = 0; c < this.TICKS; c++) {
                if (Math.random() < this.pRandOn) {
                    this.setState(r, c, true);
                }
            }
        }
    }

    getState(r, c) {
        return this.states[r + "_" + c];
    }

    setState(r, c, v) {
        //console.log("setState", r, c, v);
        this.states[r + "_" + c] = v;
        this.gui.noticeState(r, c, v);
        //var bt = this.getBeat(r,c);
        //bt.css('background-color', v ? 'blue' : 'white');
    }

    toggleState(r, c) {
        //console.log("toggleState", r,c);
        this.setState(r, c, !this.getState(r, c));
    }

    mutate() {
        if (Math.random() > this.pMutate) {
            return;
        }
        //console.log("mutate");
        for (var r = 0; r < this.numTracks; r++) {
            for (var c = 0; c < this.TICKS; c++) {
                if (this.getState(r, c)) {
                    if (Math.random() < this.pRemove) {
                        this.setState(r, c, false);
                        console.log("remove r,c", r, c);
                    }
                }
                else {
                    if (Math.random() < this.pAdd) {
                        this.setState(r, c, true);
                        console.log("add r,c", r, c);
                    }
                }
            }
        }
    }

    hitBeat(i) {
        if (i == null)
            i = this.numTracks - 1;
        this.playSound(soundPrefix + this.tracks[i].sound);
        this.gui.noticeUserBeat(this.beatNum);
    }

    loadData(id, spec) {
        console.log("loadData", id, spec);
        var tracks = spec.tracks;
        this.numMeasures = spec.numMeasures || 4;
        this.beatsPerMeasure = spec.beatsPerMeasure || 4;
        this.TICKS = this.numMeasures * this.beatsPerMeasure;
        this.clear();
        for (var r=0; r<tracks.length; r++) {
            var track = tracks[r];
            if (!track.sound)
                track.sound = track.name+".wav";
            //var soundname = track.sound;
            //var fname = soundname+".wav";
            this.tracks.push(track);
            this.numTracks = this.tracks.length;
            console.log("track", r, track.name);
            var beats = track.beats;
            let c = 0;
            for (var i = 0; i < this.numMeasures; i++) {
                var bar = beats[i];
                console.log(" ", i, bar);
                for (var j = 0; j < this.beatsPerMeasure; j++) {
                    this.setState(r, c, bar[j]);
                    c++;
                }
            }
        }
        this.gui.updateSong();
    }

    /*
    updateGraphics() {
        console.log("updateGraphics");
        for (var r=0; r<this.numTracks; r++) {
            let c = 0;
            for (var i = 0; i < this.numMeasures; i++) {
                for (var j = 0; j < this.beatsPerMeasure; j++) {
                    var v = this.getState(r, c);
                    console.log("update", r, c, v);
                    this.gui.noticeState(r,c,v);
                    c++;
                }
            }
        }
    }
    */

    getRhythmSpec() {
        console.log("getRhythmSpec");
        var spec = {tracks:[]};
        var inst = this;
        // for each row (sound)
        for (let r = 0; r < this.numTracks; r++) {
            var sound = this.tracks[r].sound;
            // get the soundname, without .wav
            var soundname = sound.split('.')[0];
            // create arrays
            var cellsgrouped = [];

            // this will give us [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
            var cellsbuffer = Array.apply(null, Array(inst.TICKS)).map(Number.prototype.valueOf, 0);

            // set the size of a group
            var groupsize = 4;
            for (let c = 0; c < this.TICKS; c++) {
                // if it's on, the value is 1
                if (this.getState(r, c))
                    cellsbuffer[c] = 1;
            }
            while (cellsbuffer.length > 0) {
                cellsgrouped.push(cellsbuffer.splice(0, groupsize));
            }
            // update the object
            var track = {name: soundname, beats: cellsgrouped};
            spec.tracks.push(track);
        }
        return spec;
    }

    exportBeat() {
        console.log("exportBeat");
        var spec = this.getRhythmSpec();
        // create an object so we can jsonify it later
        console.log("spec:\n" + JSON.stringify(spec, null, 3));
        this.songs.push(spec);
        var n = this.songs.length + 1;
        var id = "song" + n;    
        this.addSongButton(spec, id);
        uploadToFile("songSpecs", spec, id+".json");
    }

    async addSongButton(specOrURL, id) {
        $("#songs").append(sprintf("<button id='%s'>%s</button>", id, id));
        var inst = this;
        $("#" + id).click(async e => {
            console.log("song ", id);
            if (typeof specOrURL == "string") {
                console.log("load song from URL", specOrURL);
                var spec = await loadJSON(specOrURL);
                inst.loadData(id, spec);
            }
            else {
                inst.loadData(id, specOrURL);
            }
        });
    }

    clickedOn(r, c) {
        console.log(sprintf("clickedOn r: %s c: %s", r, c));
        this.toggleState(r, c);
    }

}
