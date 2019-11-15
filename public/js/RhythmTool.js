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
        this.$grid = null;
        this.$button = null;
        this.$beats = null;
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

    tick() {
        for (var i = 0; i < this.slength; i++) {
            var lastBeat = this.$beats[i * this.TICKS + this.lastTick];
            var currentBeat = this.$beats[i * this.TICKS + this.currentTick];
            lastBeat.classList.remove('ticked');
            currentBeat.classList.add('ticked');
            if (this.getState(i, this.currentTick)) {
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
        var beat = this.$beats[r * this.TICKS + c];
        return beat.classList.contains('on');
    }

    setState(r, c, v) {
        console.log("setState", r, c, v);
        var beat = this.$beats[r * this.TICKS + c];
        if (v && !beat.classList.contains('on'))
            beat.classList.add('on');
        if (!v && beat.classList.contains('on'))
            beat.classList.remove('on');
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

    hitBeat() {
        var i = this.sounds.length - 1;
        this.playSound(soundPrefix + this.sounds[i])
    }

    exportBeat() {
        console.log("exportBeat");
        // create an object so we can jsonify it later
        var exportData = {}
        var inst = this;
        // for each row (sound)
        this.sounds.forEach(function (sound) {
            // get the soundname, without .wav
            var soundname = sound.split('.')[0];

            // create arrays
            var cellsgrouped = [];

            // this will give us [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
            var cellsbuffer = Array.apply(null, Array(inst.TICKS)).map(Number.prototype.valueOf, 0);

            // set the size of a group
            var groupsize = 4;

            // select all of the cells in the beat maker by the current soundname
            var cells = document.querySelectorAll(`.beat.${soundname}`);

            // loop over the cells
            for (var i = 0; i < cells.length; i++) {
                // if it's on, the value is 1
                if (cells[i].classList.contains('on')) {
                    cellsbuffer[i] = 1;
                }
            }
            // group the cells in to sets
            // this will give us [[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]]
            while (cellsbuffer.length > 0) {
                cellsgrouped.push(cellsbuffer.splice(0, groupsize));
            }
            // update the object
            exportData[soundname] = cellsgrouped;
        });
        console.log("beat:\n"+JSON.stringify(exportData));
    }

    setupGUI() {
        var inst = this;
        //this.$grid = document.querySelectorAll('.grid')[0];
        this.$grid = document.querySelector('#grid1');
        this.$button = document.createElement('button');
        this.$button.classList.add('beat');

        for (let r = 0; r < this.slength; r++) {
            for (let c = 0; c < this.TICKS; c++) {
                var _$button = this.$button.cloneNode(true);
                if (c === 0) {
                    _$button.classList.add('first');
                }
                // add a class based on the instrument
                var soundname = this.sounds[r].split('.')[0];
                _$button.classList.add(soundname);
                _$button.dataset.instrument = soundname;

                _$button.addEventListener('click', function () {
                    //this.classList.toggle('on');
                    inst.toggleState(r,c);
                    //this.classList.toggle('on');
                }, false);
                this.$grid.appendChild(_$button);
            }
        }

        this.$beats = document.querySelectorAll('.beat');
        document.querySelector('#export').addEventListener('click', () => inst.exportBeat());
        document.querySelector('#random').addEventListener('click', () => inst.setRandomBeat());
        document.querySelector('#clear').addEventListener('click', () => inst.clearBeat());
        document.querySelector('#beat').addEventListener('click', () => inst.hitBeat());
    }
}
