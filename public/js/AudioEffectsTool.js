// This class is for digital audio effects and processing. 

class AudioEffectsTool{
    constructor(audioContext){
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

    removeBiquad(source, filter){
        if (this.biquad == null)
        {
            console.log("audioEffects.biquad is null. Nothing to remove!");
        }
        else{
            this.source.disconnect(filter);
            filter.disconnect(this.audioContext.destination);
            this.source.connect(this.audioContext.destination);
        }
    }

    createVibrato(depth, freq, osc){
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

    createTremolo(depth, freq){ // depth in dB, freq in Hz
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
    gainControl(source, newGain){
        if (source != null)
        {
            source.gain.value = newGain;
        }
        else {
            console.log("There is no source in AudioEffectsTool.audioContext");
        }
    }

    getGain(source){
        if (source != null)
        {
            var gain = source.gain;
        }
        else {
            console.log("There is no source in AudioEffectsTool.audioContext");
        }
        return gain;
    }
    

    db2linear(dbLevel){
        var linear = Math.pow(10, (dbLevel/20));
        return linear;
    }

    linear2db(level){
        var dbLevel = 20*Math.log10(level);
        return dbLevel;    
    }

    // Sweep Envelope - Attack, Sustain, Release
    createSweepEnv(){
        let sweepEnv = this.audioContext.createGain();
        sweepEnv.gain.cancelScheduledValues(this.audioContext.currentTime);
        sweepEnv.gain.setValueAtTime(0, this.audioContext.currentTime);
        this.sweepEnv = sweepEnv;
        // connect it to this.audioContext.destination
        return sweepEnv;
    }

    triggerLinearSweepEnv(attackTime, releaseTime, sweepLength, sweepEnv){
        sweepEnv.gain.linearRampToValueAtTime(0.8, this.audioContext.currentTime + attackTime);
        sweepEnv.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + sweepLength - releaseTime);
    }

    triggerLinearADSR(attackTime, decayTime, decayLevel, sustain, releaseTime, sweepEnv){
        sweepEnv.gain.linearRampToValueAtTime(0.8, this.audioContext.currentTime + attackTime);
        sweepEnv.gain.linearRampToValueAtTime(decayLevel, this.audioContext.currentTime + decayTime);
        sweepEnv.gain.setValueAtTime(decayLevel, this.audioContext.currentTime + sustain);
        sweepEnv.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + releaseTime);
    }

    triggerExpADSR(attackTime, decayTime, decayLevel, sustain, releaseTime, sweepEnv){
        sweepEnv.gain.exponentialRampToValueAtTime(0.8, this.audioContext.currentTime + attackTime);
        sweepEnv.gain.exponentialRampToValueAtTime(decayLevel, this.audioContext.currentTime + decayTime);
        sweepEnv.gain.setValueAtTime(decayLevel, this.audioContext.currentTime + sustain);
        sweepEnv.gain.exponentialRampToValueAtTime(0, this.audioContext.currentTime + releaseTime);
    }

    triggerCustomADSR(props, sweepEnv){
        for (var val in props){
            if (props[val].type == 'linear'){
                sweepEnv.gain.linearRampToValueAtTime(props[val].level, this.audioContext.currentTime + props[val].time)
            }
            else if (props[val].type == 'exp'){
                sweepEnv.gain.exponentialRampToValueAtTime(props[val].level, this.audioContext.currentTime + props[val].time);
            }
            else {
                sweepEnv.gain.setValueAtTime(props[val].level, this.audioContext.currentTime + props[val].time);
            }
        }
    }

    createTriTone(root, h1, h2, fc){
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

    startTriTone(){
        this.osc1.start();
        this.osc2.start();
        this.osc3.start();
    }

    stopTriTone(dur){
        this.osc1.stop(this.audioContext.currentTime + dur);
        this.osc2.stop(this.audioContext.currentTime + dur);
        this.osc3.stop(this.audioContext.currentTime + dur);
    }

    loadAudio(url, onLoaded){
        this.onLoaded = onLoaded;
        var inst = this;
        this.bufferLoader = new BufferLoader(this.audioContext, [url], (buffer) => inst.finishedLoading(buffer));
        this.bufferLoader.load();
    }

    finishedLoading(buffer){
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

    startAudio(source){
        if (source != null){
            source.start(0);
        }
        else {
            console.log("There is no audio source created");
            return;
        }
    }
}