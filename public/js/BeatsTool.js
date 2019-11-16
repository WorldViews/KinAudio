/*
Base on
https://github.com/omgmog/beatmaker
*/

'use strict';
var AudioContext = window.AudioContext || window.webkitAudioContext || false;

var soundPrefix = 'http://localhost:8000/sounds/';
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

class RhythmTool {
    constructor(sounds) {
        this.beats = {};
        this.states = {};
        this.sounds = sounds || SOUNDS2;
        this.slength = this.sounds.length;
        this.playing = true;
        this.BPM = 80;
        this.TICKS = 16;
        this.pRandOn = .3;
        this.pMutate = 0.001;
        this.pAdd = .02;
        this.pRemove = 0.02;
        this.currentTick = 0;
        this.lastTick = this.TICKS - 1;
        this.tickTime = 1 / (4 * this.BPM / (60 * 1000));
        this.setupGUI();
        this.setupDATGUI();
    }

    start() {
        var inst = this;
        //this.requestInterval(() => inst.handleTick(), 1 / (4 * this.BPM / (60 * 1000)));
        this.requestInterval(() => inst.tick());
    }

    setupDATGUI() {
        var P = this;
        var gui = new dat.GUI();
        gui.add(P, 'pRandOn', 0, 1);
        gui.add(P, 'pMutate', 0, 1);
        gui.add(P, 'pAdd', 0, 1);
        gui.add(P, 'pRemove', 0, 1);
        gui.add(P, "BPM", 50, 160);
        gui.add(P, "playing");
        gui.add(P, "tick");
    }


    playSound(url) {
        console.log("playSound "+url);
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

    requestInterval(fn) {
        var inst = this;
        var start = new Date().getTime();
        var handle = {};

        function loop() {
            var delay = 1 / (4 * inst.BPM / (60 * 1000));
            var current = new Date().getTime();
            var delta = current - start;
            if (delta >= delay && inst.playing) {
                fn.call();
                start = new Date().getTime();
            }
            handle.value = requestAnimationFrame(loop);
        }
        handle.value = requestAnimationFrame(loop);
        return handle;
    }

    getBeat(r,c) {
        let id = sprintf("#b_%s_%s", r, c);''
        return $(id);
        return this.beats[(r,c)];
    }

    setBeatBorder(r, c, color) {
        //console.log("setBeatBG", r, c);
        this.getBeat(r,c).css('border-color', color);
    }

    tick() {
        for (let i = 0; i < this.slength; i++) {
            this.setBeatBorder(i, this.lastTick, 'grey');
            this.setBeatBorder(i, this.currentTick, 'red');
            if (this.getState(i, this.currentTick)) {
                console.log("tick play ", i, this.currentTick);
                this.playSound(soundPrefix + this.sounds[i])
            }
        }
        this.mutate();
        this.lastTick = this.currentTick;
        this.currentTick = (this.currentTick + 1) % this.TICKS;
    }

    clearBeat() {
        for (var r = 0; r < this.slength; r++) {
            for (var c = 0; c < this.TICKS; c++) {
                this.setState(r, c, false);
            }
        }
    }

    setRandomBeat() {
        this.clearBeat();
        for (var r = 0; r < this.slength; r++) {
            for (var c = 0; c < this.TICKS; c++) {
                if (Math.random() < this.pRandOn) {
                    this.setState(r,c,true);
                }
            }
        }
    }

    getState(r, c) {
        return this.states[r+"_"+c];
    }

    setState(r, c, v) {
        console.log("setState", r, c, v);
        this.states[r+"_"+c] = v;
        var bt = this.getBeat(r,c);
        bt.css('background-color', v ? 'blue' : 'white');
    }

    toggleState(r,c) {
        //console.log("toggleState", r,c);
        this.setState(r,c, !this.getState(r,c));
    }

    mutate() {
        if (Math.random() > this.pMutate) {
            return;
        }
        //console.log("mutate");
        for (var r = 0; r < this.slength; r++) {
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
            i = this.sounds.length - 1;
        this.playSound(soundPrefix + this.sounds[i])
    }

    exportBeat() {
        console.log("exportBeat");
        // create an object so we can jsonify it later
        var exportData = {}
        var inst = this;
        // for each row (sound)
        for (let r=0; r<this.sounds.length; r++) {
            var sound = this.sounds[r];
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
                if (this.getState(r,c))
                    cellsbuffer[c] = 1;
            }
            while (cellsbuffer.length > 0) {
                cellsgrouped.push(cellsbuffer.splice(0, groupsize));
            }
            // update the object
            exportData[soundname] = cellsgrouped;
        };
        console.log("beat:\n"+JSON.stringify(exportData, null, 3));
    }

    clickedOn(r,c) {
        console.log(sprintf("clickedOn r: %s c: %s", r, c));
        this.toggleState(r,c);
    }

    setupGUI() {
        var inst = this;
        var div = $("#beatsDiv");
        for (let r = 0; r < this.slength; r++) {
            var beatDiv = div.append("<div class='beats'></div>");
            var soundname = this.sounds[r].split('.')[0];
            var id = soundname;
            beatDiv.append(sprintf("<input id='%s' type='button' value=' ' style='width:30px;height:30px;margin:4px'></input>", id));
            beatDiv.append(sprintf("%s", soundname));
            beatDiv.append("<br>");
            $("#"+id).click(e => inst.hitBeat(r));
            for (let c = 0; c < this.TICKS; c++) {
                let id = sprintf("b_%s_%s", r, c);
                let beat = $(sprintf("<input type='button' class='beatsbutton' id='%s' value=''></input>", id));
                beatDiv.append(beat);
                beat.click((e) => inst.clickedOn(r,c));
                this.beats[(r,c)] = beat;
            }
            beatDiv.append("<p>");
        }
        $('#export').click(() => inst.exportBeat());
        $('#random').click(() => inst.setRandomBeat());
        $('#clear').click(() => inst.clearBeat());
        $('#beat').click(() => inst.hitBeat());
    }
}
