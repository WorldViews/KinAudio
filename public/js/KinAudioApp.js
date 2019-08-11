
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
        this.initCanvasTool();
        let inst = this;
        this.skelApp = null;
        this.initSkelApp();
        $("#startButton").click(() => {
            inst.initAudio();
            this.initProgram();
        });
        this.program = null;
        //this.initProgram();
    }

    initProgram() {
        this.program = new Prog1(this);
        this.program.start();
    }

    initCanvasTool() {
        this.canvasTool = new CanvasTool("trackingCanvas");
        var addSampleGraphics = false;
        if (addSampleGraphics) {
            var n = 0;
            var low = -100;
            var high = 100;
            var inc = 50;
            for (var i = low; i <= high; i += inc) {
                for (var j = low; j <= high; j += inc) {
                    var g = new CanvasTool.Graphic(n, i, j);
                    this.canvasTool.addGraphic(g);
                    n++;
                }
            }
        }
        this.canvasTool.start();
    }

    initSkelApp() {
        this.skelApp = new CanvasSkelWatcher({ canvasTool: this.canvasTool });
    }

    setupGUIBindings() {
        var inst = this;
        this.numSteps = 0;

        setInterval(() => {
            //console.log("tick...");
            inst.numSteps++;
            inst.portal.sendMessage(inst.rvWatcher.msg, { type: 'tick', n: inst.numSteps });
            $("#log").html("N: " + inst.numSteps + "<br>\n");
        }, 5000);

        $("#loadAudio").click(() => {
            inst.loadAudio();
        });
        $("#send").click(() => {
            inst.portal.sendMessage({ type: 'click', n: inst.numSteps });
        });

        function rigCollapsableDiv(ctrlId, panelId) {
            $(ctrlId).click(() => {
                var v = $(panelId).is(":visible");
                if (v)
                    $(panelId).hide({ duration: 500 });
                else
                    $(panelId).show({ duration: 500 });
            });
        }
        rigCollapsableDiv("#trackedBodiesInfo", "#bodyStatus");
        rigCollapsableDiv("#showAudioControls", "#audioControls");
        rigCollapsableDiv("#showTrackingCanvas", "#trackingCanvas");
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
            this.changeFilterParam(msg.energy);
        }

    }

    noticePoseFit(msg, rvWatcher) {
        if (!this.program) {
            return;
        }
        this.program.noticePoseFit(msg, rvWatcher);
    }

    loadAudio() {
        console.log("loadAudio");
        this.initAudio();// make sure we are initialized
        if (!this.program) {
            console.log("No program");
            return;
        }
        this.program.loadAudio();
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


