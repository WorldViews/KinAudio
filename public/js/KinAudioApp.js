var app = null;

var DEFAULT_PROGRAMS = [
    "MidiPlay1",
    "SampleProg1",
    "TwoHands",
    "ChiGong",
    "FreeChiGong",
    "RVFeedback"
];

var state = {};

function rigCollapsableDiv(ctrlId, panelId, init) {
    if (init == "hide") {
        $(panelId).hide({ duration: 500 });
    }
    else {
        $(panelId).show({ duration: 500 });
    }
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
        if (app) {
            alert("Warning ... app already exists");
        }
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
        $("#highView").click(() => inst.setHighView());
        this.state = state;
        state.speed = 1.0;
        this.setupDATGUI();
        this.start();
    }

    setLeapView() {
        var view = { center: { x: 0, y: 0.8 }, width: 1.0 };
        var canvasTool = this.canvasTool;
        canvasTool.setView(view);
    }

    setHighView() {
        var view = { center: { x: 0, y: 0.8 }, width: 10.0 };
        this.canvasTool.setView(view);
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
        this.setLeapView();
    }

    initLeapWatcher() {
        this.leapWatcher = new CanvasLeapWatcher({
            canvasTool: this.canvasTool,
            portal: this.portal
        })
    }

    initSkelWatcher() {
        this.skelWatcher = new CanvasSkelWatcher({ canvasTool: this.canvasTool });
    }

    setupDATGUI() {
        var gui = new dat.GUI();
        this.gui = gui;
        var state = this.state;
        //gui.add(state, 'speed', -10,10);
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
        rigCollapsableDiv("#showAudioControls", "#audioControls", "hide");
        rigCollapsableDiv("#showProgramControls", "#programControls");
        rigCollapsableDiv("#showTrackingCanvas", "#trackingCanvas");
        rigCollapsableDiv("#showTrackingCanvas", "#canvasDiv", "hide");
        //rigCollapsableDiv("#showMessage", "#messageDiv", "hide");

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
        this.toneTool = new ToneTool(this.audioContext);
        this.audioEffects = new AudioEffectsTool(this.audioContext);
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
            program.init();
            program.start();
        }
    }

    static findClass(name) {
        try {
            return eval(name);
        }
        catch (e) { return null; };
    }

    static async getClass(name) {
        var class_ = KinAudioApp.findClass(name);
        if (class_)
            return class_;
        await KinAudioApp.loadScript(sprintf("Programs/%s.js", name));
        return KinAudioApp.findClass(name);
    }

    static async loadProgramXXX(name, divId) {
        console.log("loadProgram", name);
        app = await KinAudioApp.getApp();
        if (app.program) {
            app.program.finish();
            app.program = null;
        }
        var url = "Programs/" + name + ".html";
        await app.loadProgramURL(url, divId);
        console.log("********* finished loading program");
        if (app.program == null) {
            var class_ = await KinAudioApp.getClass(name);
            console.log("class_", class_);
            //alert("Program "+name+" not loaded");
            app.setProgram(new class_(app));
        }
        app.program.init();
        app.program.start();
    }

    static async loadProgram(name, divId) {
        console.log("loadProgram", name);
        app = await KinAudioApp.getApp();
        if (app.program) {
            app.program.finish();
            app.program = null;
        }
        var class_ = await KinAudioApp.getClass(name);
        console.log("class_", class_);
        if (!class_) {
            alert("Cannot load class for " + name);
        }
        /*
        if (!class_.noHTML) {
            var url = "Programs/" + name + ".html";
            await app.loadProgramURL(url, divId);
            console.log("********* finished loading program");
        }
        */
        var url = "Programs/" + name + ".html";
        await app.loadProgramURL(url, divId);
        console.log("********* finished loading program");
        app.setProgram(new class_(app));
        app.program.init();
        app.program.start();
    }

    async loadProgramURL(url, divId) {
        divId = divId || "programControls";
        console.log("loadProgramURL", divId, url);
        this.initAudio();
        console.log("toneTool", this.toneTool);
        return new Promise((resolve, reject) => {
            $("#" + divId).load(url, () => {
                resolve();
            });
        })
    }

    static async loadScript(url) {
        console.log("loadScript", url);
        return new Promise((resolve, reject) => {
            $.getScript(url, () => {
                resolve();
            });
        })
    }

    static async getApp() {
        if (app)
            return app;
        return new Promise((resolve, reject) => {
            $("#museDiv").load("museDiv.html", () => {
                app = new KinAudioApp();
                resolve(app);
            });
        });
    }

    static async runApp(opts) {
        console.log("starting...");
        app = await KinAudioApp.getApp();
        app.setProgramClass(opts.program);
    }

    static async startUp(progNames) {
        progNames = progNames || DEFAULT_PROGRAMS;
        var progName = getParameterByName("prog");
        if (progName)
            progNames = [progName];
        console.log("starting...", progNames);
        for (var i = 0; i < progNames.length; i++) {
            let progName = progNames[i];
            let text = progName;
            let id = "btn_" + progName;
            //$("#appControls").appen
            $('<button/>', {
                id, text,
                style: 'margin: 5px',
                click: async () => KinAudioApp.loadProgram(progName)
            }).appendTo("#appControls");
        }
    }
}



