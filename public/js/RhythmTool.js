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
        this.BPM = 80;
        this.TICKS = 16;
        this.currentTick = 0;
        this.lastTick = this.TICKS - 1;
        this.tickTime = 1 / (4 * this.BPM / (60 * 1000));
        this.setupGUI();
    }

    start() {
        var inst = this;
        this.requestInterval(() => inst.handleTick(), 1 / (4 * this.BPM / (60 * 1000)));
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

    requestInterval(fn, delay) {
        var start = new Date().getTime();
        var handle = {};

        function loop() {
            var current = new Date().getTime();
            var delta = current - start;
            if (delta >= delay) {
                fn.call();
                start = new Date().getTime();
            }
            handle.value = requestAnimationFrame(loop);
        }
        handle.value = requestAnimationFrame(loop);
        return handle;
    }

    handleTick() {
        for (var i = 0; i < this.slength; i++) {
            var lastBeat = this.$beats[i * this.TICKS + this.lastTick];
            var currentBeat = this.$beats[i * this.TICKS + this.currentTick];
            lastBeat.classList.remove('ticked');
            currentBeat.classList.add('ticked');
            if (currentBeat.classList.contains('on')) {
                this.playSound(soundPrefix + this.sounds[i]);
            }
        }
        this.lastTick = this.currentTick;
        this.currentTick = (this.currentTick + 1) % this.TICKS;
    }

    clearBeat() {
        var $onbeats = document.querySelectorAll('.beat.on');
        if (!$onbeats.length) return;
        for (var r = 0; r < this.slength; r++) {
            for (var c = 0; c < this.TICKS; c++) {
                var cell = $onbeats[c + (r * this.TICKS)];
                if (cell) {
                    cell.classList.remove('on');
                }
            }
        }
    }

    setRandomBeat() {
        this.clearBeat();

        for (var r = 0; r < this.slength; r++) {
            for (var c = 0; c < this.TICKS; c++) {
                var num = Math.ceil(Math.random() * 100) % 3;
                if (num === 0) {
                    this.$beats[c + (r * this.TICKS)].classList.toggle('on');
                }
            }
        }
    }

    exportBeat() {
        // create an object so we can jsonify it later
        var exportData = {}
        // for each row (sound)
        this.sounds.forEach(function (sound) {
            // get the soundname, without .wav
            var soundname = sound.split('.')[0];

            // create arrays
            var cellsgrouped = [];

            // this will give us [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
            var cellsbuffer = Array.apply(null, Array(this.TICKS)).map(Number.prototype.valueOf, 0);

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
    }

    setupGUI() {
        var inst = this;
        //this.$grid = document.querySelectorAll('.grid')[0];
        this.$grid = document.querySelector('#grid1');
        this.$button = document.createElement('button');
        this.$button.classList.add('beat');

        for (var r = 0; r < this.slength; r++) {
            for (var c = 0; c < this.TICKS; c++) {
                var _$button = this.$button.cloneNode(true);
                if (c === 0) {
                    _$button.classList.add('first');
                }
                // add a class based on the instrument
                var soundname = this.sounds[r].split('.')[0];
                _$button.classList.add(soundname);
                _$button.dataset.instrument = soundname;

                _$button.addEventListener('click', function () {
                    this.classList.toggle('on');
                }, false);
                this.$grid.appendChild(_$button);
            }
        }

        this.$beats = document.querySelectorAll('.beat');
        document.querySelector('#export').addEventListener('click', () => inst.exportBeat());
        document.querySelector('#random').addEventListener('click', () => inst.setRandomBeat());
        document.querySelector('#clear').addEventListener('click', () => inst.clearBeat());
    }
}
