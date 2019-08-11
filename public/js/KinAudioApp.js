var n = 0;

var toneGain = null;
var sweepEnv = null;
var startTime = null;
var lastTime = null;
var playStartTime = null;
var player = null;

// initialize fot the toneTool
var drums = null;
var drums2 = null;
var bell = null;
var loopBeat = null;
var bellPart = null;
var churchBellPart = null;
var tempo = 44;
let currentBeat = null;
let counter = 0;
let msgCounter = 0;
let eventMsgCounter = 0;
let fc = null;

const energyThreshold = 100;
const maxEnergy = 300;
const midFc = 200;
const maxFc = 1000;

var part1 = [[null, null, null], [null, null, null], [null, null, null], [220, null, null], [null, null, null], [null, null, null], [null, null, null]];


class KinAudioApp {
    constructor(portal) {
        console.log("creating KinAudioApp");
        this.setupGUIBindings();
        if (!portal) {
            console.log("Getting MUSEPortal");
            portal = new MUSEPortal();
        }
        this.portal = portal;
        portal.addWatcher(msg => {
            this.handleMessage(msg);
        });
        //this.portal.addWatcher.bind(this.handleMessage);
        this.audioContext = null;
        this.audioEffects = null;
        this.rvWatcher = new RVWatcher();
        this.rvWatcher.onConnect = (msg) => this.onConnect();
        this.rvWatcher.onDisconnect = (msg) => this.onDisconnect();
        this.toneTool = null;
        this.canvasTool = new CanvasTool("canvas1");
        let inst = this;
        $("#startButton").click(() => {
            inst.initAudio();
        });
    
    }

    setupGUIBindings() {
        var inst = this;

        setInterval(() => {
            console.log("tick...");
            n++;
            inst.portal.sendMessage(inst.rvWatcher.msg, { type: 'tick', n });
            $("#log").html("N: " + n + "<br>\n");
        }, 5000);

        $("#loadAudio").click(() => {
            inst.loadAudio();
        });
        $("#send").click(() => {
            inst.portal.sendMessage({ type: 'click', n });
        });
    }


    handleMessage(msg) {
        if (!$("#handleRVMessagesCB").prop('checked')) {
            return;
        }
        //console.log("AudioFeedbackApp.handleMessage", msg);
        $("#log").html(JSON.stringify(msg, null, 3));

        if (!this.rvWatcher) {
            console.log("PoseFit Message Watcher not created");
            return;
        }
        this.rvWatcher.handleMessage(msg);


        if (!this.toneTool) {
            return;
        }
        if (msg.type == "poseFit") {
            if (msgCounter == 0) {
                this.initAudio();
            }
            msgCounter++;
            this.changeFilterParam(msg.energy);
        }

        if (eventMsgCounter == 0) {
           // this.loadAudio();
        }

        eventMsgCounter++;
    }

    loadAudio() {
        console.log("loadAudio");
        this.initAudio();// make sure we are initialized
        var url = '../Audio/samples/RVSoundscapeV2.wav';
        var startTime = 0;
        console.log("loading audio", url, startTime);
        this.audioEffects.loadAudio(url, () => {
            console.log("ready to startAudio");
            this.audioEffects.addBiquad(this.audioEffects.source, 500, 'lowpass');
            console.log("audioEffects.source", this.audioEffects.source);
            this.audioEffects.startAudio(this.audioEffects.source);
        });
    }

    initAudio() {
        var inst = this;
        console.log("initAudio");
        if (this.audioContext) {
            console.log("already initialized...");
            return;
        }
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.audioEffects = new AudioEffectsTool(this.audioContext);
        this.toneTool = new ToneTool(this.audioContext);
        this.toneTool.defaultBpm = 44;
        drums = this.toneTool.createDrum();
        drums2 = this.toneTool.createDrum();
        drums2.oscillator.type = 'triangle';
        drums2.octaves = 1;
        drums2.volume.value = -14;
        this.toneTool.addFilter(drums, 150, 'lowpass', -12);
        this.toneTool.addFilter(drums2, 150, 'lowpass', -12);
        this.toneTool.addReverb(this.toneTool.filter, 0.5);
        this.toneTool.currentBpm = tempo;

        loopBeat = this.toneTool.createLoopBeat(time => {
            currentBeat = Tone.Transport.position.split(':');
            var gain = 0.4;
            inst.toneTool.createDrumMelody(counter, 0, ['c3', 'c3'], '4n', time, gain);
            inst.toneTool.createDrumMelody(counter, 5, ['f#2', 'f#2'], '8n', time, gain);
            inst.toneTool.createDrumMelody(counter, 6, ['f#2', 'f#2'], '8n', time, gain);

            bellPart = inst.toneTool.createBellPart(bell, part1);
            //churchBellPart = toneTool.createBellPart(churchBell, part1);

            //bellPart.start(5);
            //churchBellPart.start(10);

            counter = (counter + 1) % 16;
        }, '16n', this.toneTool.currentBpm);

        loopBeat.start();
        //loopBeat.start(0);
        Tone.Transport.start();

        bell = this.toneTool.createBell(12, 600, 20, 8, -20);
        let delay = this.toneTool.addFeedbackDelay(bell, 0.05, 0.5);
        let reverb = this.toneTool.addReverb(delay, 0.2);
        bell.chain(delay, reverb, Tone.Master);

        /*
        churchBell = toneTool.createBell(100, 100, 250, 8, -20);
        let delay2 = toneTool.addFeedbackDelay(churchBell, 0.05, 0.5);
        let reverb2 = toneTool.addReverb(delay2, 0.2);
        churchBell.chain(delay2, reverb2, Tone.Master);
        */
    }

    loop(time) {
        currentBeat = Tone.Transport.position.split(':');
        var gain = 0.4;
        this.toneTool.createDrumMelody(counter, 0, ['c3', 'c3'], '4n', time, gain);
        this.toneTool.createDrumMelody(counter, 5, ['f#2', 'f#2'], '8n', time, gain);
        this.toneTool.createDrumMelody(counter, 6, ['f#2', 'f#2'], '8n', time, gain);

        bellPart = this.toneTool.createBellPart(bell, part1);
        //churchBellPart = toneTool.createBellPart(churchBell, part1);

        //bellPart.start(5);
        //churchBellPart.start(10);

        counter = (counter + 1) % 16;
    }

    changePartTempo(playSpeed, smooSpeed) {
        if (!this.toneTool) {
            console.log("changePartTempo ... ignored - no toneTool");
            return;
        }
        tempo = this.toneTool.calculateTempo(playSpeed, smooSpeed);
        tempo = this.toneTool.getClosestTempo(tempo); // target tempo in bpm
        this.toneTool.setTempo(tempo);
        return tempo;
    }

    changeFilterParam(energy) {
        if (this.audioEffects.biquad == null) {
            console.log("No filter added yet");
            return;
        }
        return;
        if (energy > maxEnergy) {
            energy = maxEnergy;
        }
        if (energy <= energyThreshold) {
            fc = maxFc - energy * 8;
        }
        else {
            fc = midFc - (energy - energyThreshold);
        }
        this.audioEffects.biquad.frequency.value = fc;
        this.audioEffects.biquad.freq = fc;
        console.log("Changing audioEffects.biquad.freq to ",
            fc, this.audioEffects.biquad.freq, this.audioEffects.biquad.frequency);
    }

    changeFilterFrequency() {
        if (this.audioEffects.biquad == null) {
            console.log("No filter added yet");
        }
        else {
            var f = document.getElementById("filterFrequency").value;
            console.log("new frequency value: ", f);
            this.audioEffects.biquad.frequency.value = f;
        }

    }

    changeFilterDetune() {
        if (this.audioEffects.biquad == null) {
            console.log("No filter added yet");
        }
        else {
            var detune = document.getElementById("detune").value;
            console.log("new frequency value: ", detune);
            this.audioEffects.biquad.detune.value = detune;
        }
    }

    changeFilterQ() {
        if (this.audioEffects.biquad == null) {
            console.log("No filter added yet");
        }
        else {
            var q = document.getElementById("Q").value;
            console.log("new frequency value: ", q);
            this.audioEffects.biquad.Q.value = q;
        }
    }

    addFilter() {
        var defaultFreq = 350;
        var type = "lowpass";
        this.audioEffects.addBiquad(this.audioEffects.source, defaultFreq, type);
    }

    removeFilter() {
        this.audioEffects.addBiquad(this.audioEffects.source, audioEffects.biquad);
    }

    onConnect(msg) {
        console.log("***** onConect ****")
    }

    onDisconnect(msg) {
        console.log("***** onDisconnect ****")
    }


}


