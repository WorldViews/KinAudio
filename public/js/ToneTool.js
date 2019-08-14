let tempos = [30, 32, 34, 36, 38, 40, 42, 44, 46, 48, 50, 52, 54, 56, 58, 60, 63, 66, 69, 72, 76, 80, 84, 88, 92, 96, 100, 104, 108, 112, 116, 120, 126, 132, 138, 144, 152, 160, 168, 176, 184, 192, 200, 208];
let maxBpm = 208;
let minBpm = 30;
let maxSpeed = 10;

class ToneTool {

    construtor(audioContext) {
        this.audioContext = audioContext;
        this.Tone = new Tone();
        this.Tone.Context(audioContext); // this could be a different AudioContext, up to 6 per tab for Chrome, depending on the browser
        console.log('Creating Tone.js Tool for audioContext', this.audioContext);
        
        this.defaultBpm = 44; // default
        this.curentBpm = this.defaultBpm;
        Tone.Transport.bpm.value = this.bpm;
        this.now = Tone.Context.now;
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

}