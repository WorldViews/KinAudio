// This class is for digital audio effects and processing. 

class AudioEffectsTool {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.scene = new ResonanceAudio(this.audioContext, {
            ambisonicOrder: 3,
        }); // resonance audio
        //this.audioElementSource = audioElementSource; // audioNode
        this.audioElementSource = null;
        this.soundSource = this.scene.createSource(); // source model to spatialze an audio buffer
        this.id = null;
        this.onLoaded = null;
        this.sources = {};
        this.source = null;

        this.bufferLoader = null;

        this.biquad = null;
        this.tremolo = null;
        this.vibrato = null;

        this.osc1 = null;
        this.osc2 = null;
        this.osc3 = null;

        this.auraTone = null;
        this.maxDLR = 50;
        this.maxVLR = 50;

        console.log('Creating AudioEffectsTool ...');

    }

    addBiquad(source, freq, type) {
        if (!this.source) {
            console.log("no source");
            return;
        }
        if (this.biquad == null) {
            this.biquad = this.audioContext.createBiquadFilter();
            this.biquad.freq = freq;
            this.biquad.type = type;
            this.biquad.detune.value = 0;
            this.biquad.Q.value = 1;
        }
        else {
            console.log("audioEffects.biquad already exists!");
        }

        this.source.disconnect(this.audioContext.destination);
        this.source.connect(this.biquad);
        this.biquad.connect(this.audioContext.destination);
    }

    removeBiquad(source, filter) {
        if (this.biquad == null) {
            console.log("audioEffects.biquad is null. Nothing to remove!");
        }
        else {
            this.source.disconnect(filter);
            filter.disconnect(this.audioContext.destination);
            this.source.connect(this.audioContext.destination);
        }
    }

    createVibrato(depth, freq, osc) {
        var vibrato = this.audioContext.createGain();
        var linDepth = this.db2linear(depth);
        vibrato.gain.value = linDepth;

        var lfo = this.audioContext.createOscillator();
        lfo.frequency.value = freq;
        lfo.type = 'sine';

        lfo.connect(vibrato);
        vibrato.connect(osc.detune);

        lfo.start(0);
        this.vibrato.vibrato = vibrato; // gainNode
        this.vibrato.lfo = lfo;
        return osc; // do we need the connection here?
    }

    createTremolo(depth, freq) { // depth in dB, freq in Hz
        var lfo = this.audioContext.createOscillator();
        lfo.frequency.value = freq;
        lfo.type = 'sine';

        var tremolo = this.createGain();
        tremolo.gain.value = 1;
        var linDepth = this.db2linear(depth);
        var depthGain = this.createGain();
        depthGain.gain.value = linDepth;

        // connect it between osc and gain
        lfo.connect(depthGain);
        depthGain.connect(tremolo.gain);

        lfo.start(0);
        this.tremolo.lfo = lfo;
        this.tremolo.depthGain = depthGain;
        this.tremolo.tremolo = tremolo;
        return tremolo; // return the gainNode, connect to osc output

    }

    // need to create a gain node!!!
    gainControl(source, newGain) {
        if (source != null) {
            source.gain.value = newGain;
        }
        else {
            console.log("There is no source in AudioEffectsTool.audioContext");
        }
    }

    getGain(source) {
        if (source != null) {
            var gain = source.gain;
        }
        else {
            console.log("There is no source in AudioEffectsTool.audioContext");
        }
        return gain;
    }


    db2linear(dbLevel) {
        var linear = Math.pow(10, (dbLevel / 20));
        return linear;
    }

    linear2db(level) {
        var dbLevel = 20 * Math.log10(level);
        return dbLevel;
    }

    // Sweep Envelope - Attack, Sustain, Release
    createSweepEnv() {
        let sweepEnv = this.audioContext.createGain();
        sweepEnv.gain.cancelScheduledValues(this.audioContext.currentTime);
        sweepEnv.gain.setValueAtTime(0, this.audioContext.currentTime);
        this.sweepEnv = sweepEnv;
        // connect it to this.audioContext.destination
        return sweepEnv;
    }

    triggerLinearSweepEnv(attackTime, releaseTime, sweepLength, sweepEnv) {
        sweepEnv.gain.linearRampToValueAtTime(0.8, this.audioContext.currentTime + attackTime);
        sweepEnv.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + sweepLength - releaseTime);
    }

    triggerLinearADSR(attackTime, decayTime, decayLevel, sustain, releaseTime, sweepEnv) {
        sweepEnv.gain.linearRampToValueAtTime(0.8, this.audioContext.currentTime + attackTime);
        sweepEnv.gain.linearRampToValueAtTime(decayLevel, this.audioContext.currentTime + decayTime);
        sweepEnv.gain.setValueAtTime(decayLevel, this.audioContext.currentTime + sustain);
        sweepEnv.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + releaseTime);
    }

    triggerExpADSR(attackTime, decayTime, decayLevel, sustain, releaseTime, sweepEnv) {
        sweepEnv.gain.exponentialRampToValueAtTime(0.8, this.audioContext.currentTime + attackTime);
        sweepEnv.gain.exponentialRampToValueAtTime(decayLevel, this.audioContext.currentTime + decayTime);
        sweepEnv.gain.setValueAtTime(decayLevel, this.audioContext.currentTime + sustain);
        sweepEnv.gain.exponentialRampToValueAtTime(0, this.audioContext.currentTime + releaseTime);
    }

    triggerCustomADSR(props, sweepEnv) {
        for (var val in props) {
            if (props[val].type == 'linear') {
                sweepEnv.gain.linearRampToValueAtTime(props[val].level, this.audioContext.currentTime + props[val].time)
            }
            else if (props[val].type == 'exp') {
                sweepEnv.gain.exponentialRampToValueAtTime(props[val].level, this.audioContext.currentTime + props[val].time);
            }
            else {
                sweepEnv.gain.setValueAtTime(props[val].level, this.audioContext.currentTime + props[val].time);
            }
        }
    }

    createTriTone(root, h1, h2, fc) {
        this.osc1 = this.audioContext.createOscillator();
        this.osc2 = this.audioContext.createOscillator();
        this.osc3 = this.audioContext.createOscillator();
        this.osc1.type = 'sine';
        this.osc2.type = 'triangle';
        this.osc3.type = 'triangle';
        this.osc1.frequency.value = root;
        this.osc2.frequency.value = h1;
        this.osc3.frequency.value = h2;

        var bandpass = this.audioContext.createBiquadFilter();
        bandpass.type = 'bandpass';
        bandpass.frequency.value = fc;

        var toneGain = this.audioContext.createGain();
        toneGain.gain.gain = 0.1;

        // connect the audio path
        this.osc1.connect(bandpass);
        this.osc2.connect(bandpass);
        this.osc3.connect(bandpass);
        bandpass.connect(toneGain);
        return toneGain; // return an audioNode
    }

    startTriTone() {
        this.osc1.start();
        this.osc2.start();
        this.osc3.start();
    }

    stopTriTone(dur) {
        this.osc1.stop(this.audioContext.currentTime + dur);
        this.osc2.stop(this.audioContext.currentTime + dur);
        this.osc3.stop(this.audioContext.currentTime + dur);
    }

    createAuraTone(numOscs, maxOverTone, f0) {
        this.SinOscs = [];
        this.SinOscGains = [];
        this.oscOuts = [];
        this.outGains = [];
        for (var i = 0; i < numOscs; i++) {
            this.oscOuts[i] = this.audioContext.createGain();
            this.SinOscs[i] = [];
            this.SinOscGains[i] = [];
            for (var j = 0; j < maxOverTone; j++) {
                var osc = this.audioContext.createOscillator();
                var oscNum = i * maxOverTone + j;
                osc.type = 'sine';
                osc.frequency.value = f0;
                var oscGain = this.audioContext.createGain();
                oscGain.gain.setValueAtTime(0,this.audioContext.currentTime);
                this.SinOscs[i][j] = osc;
                this.SinOscGains[i][j] = oscGain;
                this.SinOscs[i][j].oscNum = oscNum;
                this.SinOscs[i][j].connect(this.SinOscGains[i][j]);
                this.SinOscGains[i][j].connect(this.oscOuts[i]);
            }
            this.outGains[i] = this.audioContext.createGain();
            this.oscOuts[i].connect(this.outGains[i]);
            this.oscOuts[i].gain.setValueAtTime(0,this.audioContext.currentTime);
            this.outGains[i].gain.setValueAtTime(0,this.audioContext.currentTime);
        }
        this.auraTone = this.outGains;
        this.auraTone.numOscs = numOscs;
        this.auraTone.numOverTones = maxOverTone;
        this.auraTone.f0 = f0;
        this.auraTone.masterGain = 0.1;
        this.auraTone.targetGain = 0.3;

    }

    connectAuraTone() {
        for (var i = 0; i < this.outGains.length; i++) {
            this.outGains[i].connect(this.audioContext.destination);
        }
    }

    // TODO: add fade in and fade out envelopes
    playAuraTone() {
        this.connectAuraTone();
        this.tuneAuraTone(0,0);
        if (this.SinOscs != null) {
            for (var tone in this.SinOscs) {
                for (var osc in this.SinOscs[tone]) {
                    this.SinOscs[tone][osc].start();
                }
                this.fadein(this.SinOscGains[tone]);
                this.fadein(this.oscOuts);
            }
        }
        else {
            console.log("No aura tone!");
            return;
        }
        this.fadein(this.outGains);
    }


    stopAuraTone() {
        this.fadeout(this.outGains);
        if (this.SinOscs != null) {
            for (var tone in this.SinOscs) {
                for (var osc in this.SinOscs[tone]) {
                    this.SinOscs[tone][osc].stop(this.audioContext.currentTime + 1);
                }
            }
        }
        else {
            console.log("No aura tone!");
            return;
        }
    }

    fadein(gain) {
        var target = this.auraTone.targetGain;
        for (var i = 0; i < gain.length; i++) {
            gain[i].gain.linearRampToValueAtTime(target, this.audioContext.currentTime + 1);
        }
    }

    fadeout(gain) {
        this.auraTone.targetGain = 0.001;
        var target = this.auraTone.targetGain;
        for (var i = 0; i < gain.length; i++) {
            gain[i].gain.linearRampToValueAtTime(target, this.audioContext.currentTime + 1);
        }
    }

       tuneAuraTone(velocity, DLR) {
        this.auraTone.velocity = velocity;
        var attackCoef = 5;
        var relaseCoef = 0.99;
        var maxDLR = this.maxDLR;
        var maxVLR = this.maxVLR;
        this.auraTone.overToneScale = (maxDLR - DLR) / maxDLR;
        //this.auraTone.overToneScale = 1;
        var detune = velocity / maxVLR * 0.001;
        detune = 0.002;
        var timbre = 0.98;

        console.log("DLR in tuneAuraTone, ", DLR);
        
        if (DLR > 35) {
            this.auraTone.masterGain += DLR*0.01 / attackCoef;
        }
        else {
            this.auraTone.masterGain *= relaseCoef;
        }
        if (this.auraTone.masterGain > this.oscOuts.length){
            this.auraTone.masterGain = this.oscOuts.length
        }
        for (var i=0; i< this.oscOuts.length; i++) {
            this.oscOuts[i].gain.setValueAtTime(this.auraTone.masterGain / (i+2), this.audioContext.currentTime);
            console.log("auraTone.masterGain, ", this.auraTone.masterGain/(i+2));
        }

        for (var tone in this.SinOscs) {
            for (var osc in this.SinOscs[tone]) {
                var oscGain = 1 / Math.pow((osc + 1), this.auraTone.overToneScale) / ( this.auraTone.numOverTones);
                this.SinOscGains[tone][osc].gain.setValueAtTime(oscGain, this.audioContext.currentTime);
                var freq = this.auraTone.f0/this.auraTone.numOverTones * Math.pow((osc+1),(Math.pow(timbre,this.auraTone.numOscs/2))) * (detune*tone +1);
                if(freq < this.auraTone.f0/2){
                    freq = this.auraTone.f0/2;
                }
                
                console.log("oscillator frequencies", freq);
                this.SinOscs[tone][osc].frequency.setValueAtTime(freq, this.audioContext.currentTime);
            }
            var outGain = (1+ (DLR/maxDLR)*Math.cos(2*3.14*tone/this.auraTone.numOscs + (maxDLR-DLR)))/(2*this.auraTone.numOscs);
            console.log("gain cosine frequency, ", 2*3.14*tone/this.auraTone.numOscs + (maxDLR-DLR));
            this.outGains[tone].gain.setValueAtTime(outGain, this.audioContext.currentTime);
        }
    }

    loadAudio(url, onLoaded) {
        this.onLoaded = onLoaded;
        var inst = this;
        this.bufferLoader = new BufferLoader(this.audioContext, [url], (buffer) => inst.finishedLoading(buffer));
        this.bufferLoader.load();
    }

    finishedLoading(buffer) {
        console.log("*** finished loading");
        var source = this.audioContext.createBufferSource();
        source.buffer = buffer[0];
        source.connect(this.audioContext.destination);
        source.loop = true;
        this.source = source;
        console.log("source:", this.source);
        if (this.onLoaded)
            this.onLoaded();
    }

    startAudio(source) {
        if (source != null) {
            source.start(0);
        }
        else {
            console.log("There is no audio source created");
            return;
        }
    }
}