
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
        this.skelWatcher = null;
        this.initSkelWatcher();
        this.leapWatcher = null;
        this.initLeapWatcher();
        $("#startProgram").click(() => {
            inst.initAudio();
            if (inst.progClass) {
                inst.setProgram(new inst.progClass(inst))
            }
            else {
                alert("No Program Specified");
            }
        });
       // $("#startButton").click(() => {
       //     inst.initAudio();
      //      //this.initProgram();
        //});
        this.program = null;
        this.start();
        //this.initProgram();
    }

    start() {
        let inst = this;
        setInterval(() => inst.update(app), 100);
    }

    update() {
        //console.log("***** KinAudioApp.update()");
        if (this.program)
            this.program.update();
    }

    initProgram() {
        return;
        this.program = new Prog1(this);
        this.program.start();
    }

    initCanvasTool() {
        this.canvasTool = new CanvasTool("trackingCanvas");
        var addSampleGraphics = false;
        if (addSampleGraphics) {
            var n = 0;
            var low = -400;
            var high = 400;
            var inc = 200;
            for (var i = low; i <= high; i += inc) {
                for (var j = low; j <= high; j += inc) {
                    var g = new CanvasTool.Graphic(n, i, j);
                    this.canvasTool.addGraphic(g);
                    n++;
                }
            }
        }
        this.canvasTool.start();
        this.canvasTool.setView(0,1,5);
    }

    initLeapWatcher() {
        this.leapWatcher = new CanvasLeapWatcher({ canvasTool: this.canvasTool })
    }

    initSkelWatcher() {
        this.skelWatcher = new CanvasSkelWatcher({ canvasTool: this.canvasTool });
    }

    setupGUIBindings() {
        var inst = this;
        this.numSteps = 0;

        setInterval(() => {
            //console.log("tick...");
            inst.numSteps++;
            inst.portal.sendMessage(inst.rvWatcher.msg, { type: 'tick', n: inst.numSteps });
            //$("#log").html("N: " + inst.numSteps + "<br>\n");
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
        //rigCollapsableDiv("#showTrackingCanvas", "#trackingCanvas");
        rigCollapsableDiv("#showTrackingCanvas", "#canvasDiv");
        rigCollapsableDiv("#showMessage", "#messageDiv");
    }


    handleMessage(msg) {
        if (!$("#handleRVMessagesCB").prop('checked')) {
            return;
        }
        //console.log("AudioFeedbackApp.handleMessage", msg);
        $("#messageDiv").html(JSON.stringify(msg, null, 3));

        if (!this.rvWatcher) {
            console.log("PoseFit Message Watcher not created");
            return;
        }
        this.rvWatcher.handleMessage(msg);

        if (!this.toneTool) {
            return;
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

    /*
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
    */

    onConnect(msg) {
        console.log("***** onConect ****")
    }

    onDisconnect(msg) {
        console.log("***** onDisconnect ****")
    }

    setProgramClass(progClass) {
        this.progClass = progClass;
    }

    setProgram(program) {
        this.initAudio();
        if (this.program) {
            this.program.stop();
        }
        this.program = program;
        if (program) {
            program.start();
        }
    }

    loadApp(name) {
        var url = "Programs/"+name+".html";
        this.loadAppURL(url);
    }

    loadAppURL(url) {
        this.initAudio();
        if (this.program) {
            this.program.finish();
            this.program = null;
        }
        $("#audioControls").load(url);
    }
}


