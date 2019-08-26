var app = null;

function rigCollapsableDiv(ctrlId, panelId) {
    $(ctrlId).click(() => {
        var v = $(panelId).is(":visible");
        if (v)
            $(panelId).hide({ duration: 500 });
        else
            $(panelId).show({ duration: 500 });
    });
}

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
                var prog = new inst.progClass(inst);
                prog.init();
                inst.setProgram(prog);
            }
            else {
                alert("No Program Specified");
            }
        });
        $("#leapView").click(() => inst.setLeapView());
        $("#highView").click(() => inst.setLeapView());
        this.start();
    }

    setLeapView() {
        var view = {center: {x: 0, y: 0.8}, width: 1.0};
        var canvasTool = this.canvasTool;
        canvasTool.setView(view);
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
        this.canvasTool.setView(0, 1, 5);
    }

    initLeapWatcher() {
        this.leapWatcher = new CanvasLeapWatcher({ canvasTool: this.canvasTool,
                                                   portal: this.portal })
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
            inst.portal.sendMessage({ type: 'tick', n: inst.numSteps });
        }, 5000);

        $("#loadAudio").click(() => {
            inst.loadAudio();
        });
        $("#send").click(() => {
            inst.portal.sendMessage({ type: 'click', n: inst.numSteps });
        });

        rigCollapsableDiv("#trackedBodiesInfo", "#bodyStatus");
        rigCollapsableDiv("#showAudioControls", "#audioControls");
        rigCollapsableDiv("#showProgramControls", "#programControls");
        //rigCollapsableDiv("#showTrackingCanvas", "#trackingCanvas");
        rigCollapsableDiv("#showTrackingCanvas", "#canvasDiv");
        rigCollapsableDiv("#showMessage", "#messageDiv");
        rigCollapsableDiv("#showHandControls", "#handControls");
        rigCollapsableDiv("#showAuraToneControls", "#auraToneControls");
        rigCollapsableDiv("#showDrumsControls", "#drumsControls");
        
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

        if (msg.type == "leapPose" && this.leapWatcher) {
            this.leapWatcher.handleLeapPoseMSG(msg);
        }

        if (!this.toneTool) {
            return;
        }
    }

    // this gets called by rvWatcher.
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
            this.program.finish();
        }
        this.program = program;
        if (program) {
            program.start();
        }
    }

    loadApp(name) {
        var url = "Programs/" + name + ".html";
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

    static runApp(opts) {
        console.log("starting...");
        $("#museDiv").load("museDiv.html", () => {
            app = new KinAudioApp();
            app.setProgramClass(opts.program);
        });
    }
}



