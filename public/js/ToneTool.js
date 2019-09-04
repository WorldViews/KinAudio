let tempos = [30, 32, 34, 36, 38, 40, 42, 44, 46, 48, 50, 52, 54, 56, 58, 60, 63, 66, 69, 72, 76, 80, 84, 88, 92, 96, 100, 104, 108, 112, 116, 120, 126, 132, 138, 144, 152, 160, 168, 176, 184, 192, 200, 208];
let maxBpm = 208;
let minBpm = 30;
let maxSpeed = 10;

let part1 = [["0", "C#3"], ["4n", "G3"], [3 * Tone.Time("8n"), "G#3"], ["2n", "C3"]];
let part2 = [["0", "C3"], ["4n", null], [3 * Tone.Time("8n"), "Eb3"], [4 * Tone.Time("8n"), "F4"], [4 * Tone.Time("8n") + 1 / 3 * Tone.Time("4n"), "Bb4"], [4 * Tone.Time("8n") + 2 / 3 * Tone.Time("4n"), "Bb4"]];
let part3 = [["0", "F#3"], ["8n", "G3"], ["4n", "G#3"], [3 * Tone.Time("8n"), "D4"], ["2n", "F#3"], [5 * Tone.Time("8n"), "G3"]]; // Phrygian gates, J.Adams, m.944
let part4 = [["0", "Gb3"], ["8n", "A3"], ["4n", "C4"], [3 * Tone.Time("8n"), "Gb3"], ["2n", "A3"], [5 * Tone.Time("8n"), "C4"]]; // Phrygian gates, J.Adams, m.945
let part5 = [["0", "F#3"], ["8n", "A#3"], ["4n", "B#3"], [3 * Tone.Time("8n"), "C4"], ["2n", "D4"], [5 * Tone.Time("8n"), "F#3"]]; // Phrygian gates, J.Adams, m.946

let seq1 = ["C3", [null, "Eb3"], ["F4", "Bb4", "C5"]];

let chords = [["Eb3", "C2", "Ab2"], ["Eb3", "C2", "Ab3"], ["Eb3", "C2", "G3"], ["Eb3", "C2", "Bb3"], ["F2", "C2", "Ab3"], ["Eb2", "G2", "G3"], ["Eb2", "C2", "C3"]];

class ToneTool {

    constructor(audioContext) {
        this.audioContext = audioContext;
        var tone = new Tone();
        Tone.setContext(audioContext); // this could be a different AudioContext, up to 6 per tab for Chrome, depending on the browser
        console.log('Creating Tone.js Tool for audioContext', this.audioContext);

        this.defaultBpm = 44; // default
        this.curentBpm = this.defaultBpm;
        Tone.Transport.bpm.value = this.defaultBpm;
        this.now = Tone.Context.now;

        this.maxDLR = 50;
        this.maxVLR = 50;
        this.minHLR = 90;
        this.maxHLR = 250;
        this.auraVoices = null;
        this.lastChordChangeTime = getClockTime();
    }

    createDrum(){
        var drumSynth = new Tone.MembraneSynth({
            pitchDecay  : 0.005 ,
            octaves  : 6 ,
            oscillator  : {
            type  : 'sine'
            }  ,
            envelope  : {
            attack  : 0.05 ,
            decay  : 1 ,
            sustain  : 0.2 ,
            release  : 5 ,
            attackCurve  : 'exponential'
            }
        }).toMaster();
        drumSynth.volume.value = -24;
        return drumSynth;
    }

    gainControl(synth, newGain){
        if (synth != null)
        {
            synth.volume.value = newGain;
        }
        else {
            console.log("There is no synth in ToneTool.audioContext");
        }
    }

    getGain(synth){
        if (synth != null)
        {
            var gain = synth.volume;
        }
        else {
            console.log("There is no synth in ToneTool.audioContext");
        }
        return gain;
    }

    createBell(harmonicity, resonance, modIndex, decay, volume){
        var bell = new Tone.MetalSynth({
            "harmonicity" : harmonicity,
			"resonance" : resonance,
			"modulationIndex" : modIndex,
			"envelope" : {
                "decay" : decay,
			},
			"volume" : volume
        }).toMaster();

        return bell;
    }

    createBellPart(instrument, part){
        var bellPart = new Tone.Sequence(function(time, freq){
			instrument.frequency.setValueAtTime(freq, time, Math.random()*0.5 + 0.5);
			instrument.triggerAttack(time);
        }, part, "8n");
		bellPart.loop = false;
        //bellPart.loopEnd = "1m";
        return bellPart;
    }

    createConga(){
        var conga = new Tone.MembraneSynth({
            "pitchDecay" : 0.008,
			"octaves" : 2,
			"envelope" : {
				"attack" : 0.0006,
				"decay" : 0.5,
                "sustain" : 0
            }
        }).toMaster();
        return conga;
    }

    createBass(){
      var bass = new Tone.FMSynth({
        "harmonicity" : 1,
        "modulationIndex" : 1.5,
        "carrier" : {
        "oscillator" : {
          "type" : "custom",
          "partials" : [0, 3, 0, 2]
        },
          "envelope" : {
            "attack" : 0.58,
            "decay" : 0.4,
            "sustain" : 0,
          },
        },
      "modulator" : {
        "oscillator" : {
          "type" : "square"
        },
          "envelope" : {
            "attack" : 0.1,
            "decay" : 0.9,
            "sustain" : 0.3,
            "release" : 0.01
          },
        }
      }).toMaster();
      return bass;
    }

    createVoice(){
      var voice = new Tone.DuoSynth({
  			"vibratoAmount" : 0.2,
  			"vibratoRate" : 2,
  			"portamento" : 0.1,
  			"harmonicity" : 1.005,
  			"volume" : 5,
  			"voice0" : {
  				"volume" : -2,
  				"oscillator" : {
  					"type" : "sawtooth"
  				},
  				"filter" : {
  					"Q" : 1,
  					"type" : "lowpass",
  					"rolloff" : -24
  				},
  				"envelope" : {
  					"attack" : 0.01,
  					"decay" : 0.001,
  					"sustain" : 0.2,
  					"release" : 0.2
  				},
  				"filterEnvelope" : {
  					"attack" : 0.001,
  					"decay" : 0.05,
  					"sustain" : 0.3,
  					"release" : 2.2,
  					"baseFrequency" : 10,
  					"octaves" : 2
  				}
  			},
  			"voice1" : {
  				"volume" : -10,
  				"oscillator" : {
  					"type" : "sawtooth"
  				},
  				"filter" : {
  					"Q" : 2,
  					"type" : "bandpass",
  					"rolloff" : -12
  				},
  				"envelope" : {
  					"attack" : 0.25,
  					"decay" : 4,
  					"sustain" : 0.1,
  					"release" : 0.8
  				},
  				"filterEnvelope" : {
  					"attack" : 0.05,
  					"decay" : 0.05,
  					"sustain" : 0.7,
  					"release" : 2,
  					"baseFrequency" : 5000,
  					"octaves" : -1.5
  				}
  			}
		    }).toMaster();
        return voice;
    }

    createLoopBeat(loop, measureNo, bpm){
        if (!bpm){
            bpm = this.defaultBpm; // default tempo
        }
        Tone.Transport.bpm.value = bpm;
        var loopBeat = new Tone.Loop(loop, measureNo);
        return loopBeat;
    }

    // Change the tempo based on the mode (input average playSpeed)
    calculateTempo(playSpeed, smooSpeed){
        var bpm;
        var currentBpm = this.currentBpm;
        var defaultBpm = this.defaultBpm;
        var speed;
        // if the user speed matches the video speed, playSpeed is 0
        if (smooSpeed > playSpeed){
            speed = smooSpeed;
        }
        else{
            speed = smooSpeed;
        }

        if (speed > 1 ) // user is speeding up
        {
            bpm = (speed-1)/maxSpeed * (maxBpm-defaultBpm) + defaultBpm;
        } else if (speed < 1) // user is slowing down
        {
            bpm = (speed-1)/maxSpeed * (defaultBpm-minBpm) + defaultBpm;
        }
        return bpm;
    }

    getClosestTempo(bpm) {
        var current = tempos[0];
        var diff = Math.abs(bpm - current)
        for (var value = 0; value < tempos.length; value++){
            var newDiff = Math.abs(bpm - tempos[value]);
            if (newDiff < diff) {
                diff = newDiff;
                current = tempos[value];
            }
        }
        if (current > maxBpm) current = maxBpm;
        return current;
    }

    setTempo(bpm) {
        //console.log("setTempo", bpm);
        Tone.Transport.bpm.value = bpm;
        this.currentBpm = bpm;
    }

    addFilter(synth, freq, type, rolloff){
        var filter = new Tone.Filter(freq, type, rolloff);
        this.filter = filter;

        synth.chain(filter, Tone.Master);
        return filter;
    }

    addReverb(synth, roomSize){
        var reverb = new Tone.Freeverb(roomSize);
        this.reverb = reverb;

        synth.chain(reverb, Tone.Master);
        return reverb;
    }

    addFeedbackDelay(synth, delayTime, feedback){
        var delay = new Tone.FeedbackDelay(delayTime, feedback);
        this.delay = delay;

        synth.chain(delay, Tone.Master);
        return delay;
    }

    generateAuraTone() {
        var voices = new Tone.PolySynth(4, Tone.Synth, {
            "oscillator": {
                "type": "fatsine",
                "partials": [0, 2, 3, 4],
                "partialCount": 0,
                "spread": 10,
                "count": 10
            },
            "envelope": {
                "attackCurve": "sine",
                "attack": 0.4,
                "decayCurve": "exponential",
                "decay": 0.1,
                "sustain": 1,
                "releaseCurve": "exponential",
                "release": 0.4,
            }
        });

        voices.volume.value = -12;

        var filter = new Tone.Filter({
            type: "lowpass",
            frequency: 440,
            rolloff: -12,
            Q: 1
        });

        //voices.chain(filter, Tone.Master);
        voices.chain(Tone.Master);
        this.auraVoices = voices;
        this.auraVoices.filter = filter;
        this.auraVoices.chord = chords[0];
        this.auraVoices.notes = [];

        // default values for leap
        this.firstNoteDLR = 1.5;
        this.secondNoteDLR = 2.5;
        this.chordChangeDLR = 4;

        return voices;
    }

    tuneAuraTone(DLR, velocity, volume) {
        if (this.auraVoices.voices == null){
            return;
        }
        this.VLR = velocity;
        this.DLR = DLR;
        this.volume = volume;
        //console.log("tuneAuraToneFromTone with DLR, ", DLR, " and velocity, ", velocity);
        this.auraVoices.set({
            "oscillator": {
                "spread": velocity
            }
        });
        //console.log("velocity value in tuneAuraToneFromTone is ", velocity);
        this.selectAuraNotes(DLR);
        if (volume == NaN || volume == undefined){
            volume = -12;
        }
        this.auraVoices.volume.value = volume;

    }

    selectAuraNotes(DLR) {

        if (DLR > this.firstNoteDLR) {
            if (!this.auraVoices.notes.includes(this.auraVoices.chord[1])) {
                this.auraVoices.notes.push(this.auraVoices.chord[1]);
                this.playAuraTone(this.auraVoices.notes);
            }
        }
        if (DLR > this.secondNoteDLR) {
            if (!this.auraVoices.notes.includes(this.auraVoices.chord[2])) {
                this.auraVoices.notes.push(this.auraVoices.chord[2]);
                this.playAuraTone(this.auraVoices.notes);
            }
        }
        if (DLR < this.secondNoteDLR) {
            if (this.auraVoices.notes.includes(this.auraVoices.chord[2])) {
                this.stopAuraTone(this.auraVoices.chord[2]);
                this.auraVoices.notes.pop();
            }
        }
        if (DLR < this.firstNoteDLR) {
            if (this.auraVoices.notes.includes(this.auraVoices.chord[1])) {
                this.stopAuraTone(this.auraVoices.chord[1]);
                this.auraVoices.notes.pop();
            }
        }

        if (DLR > this.chordChangeDLR) {
            this.changeAuraChord();
        }
        console.log("playing aura notes:, ", this.auraVoices.notes);
    }

    changeAuraChord() {
        var t = getClockTime();
        var dt = t - this.lastChordChangeTime;
        if (dt > 2) {
            this.lastChordChangeTime = getClockTime();
            var chord = this.auraVoices.chord;
            var chordNo = chords.indexOf(chord);
            var nextChordNo = (chordNo + 1) % chords.length;
            console.log("Chord is changed from, ", chord);
            var newChord = chords[nextChordNo];
            this.auraVoices.chord = newChord;
            this.auraVoices.notes = newChord.slice(0);
            console.log("...to, ", newChord);
            this.playAuraTone(this.auraVoices.notes);
        }
    }

    playAuraTone(notes) {
        this.auraVoices.triggerAttack(notes, this.audioContext.currentTime);

    }

    stopAuraTone(notes) {
        if (this.auraVoices == null) {
            console.log("No auraTone created");
            return;
        }
        else {
            this.auraVoices.triggerRelease(notes, this.audioContext.currentTime);
        }
    }
}
