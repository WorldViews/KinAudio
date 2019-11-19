class NoteGraphic extends CanvasTool.Graphic {
    draw(canvas, ctx) {
        var w = 0.5;
        var h = w/3.0;
        this.drawRect(canvas, ctx, this.x, this.y, w, h);
    }
};

class TimeGraphic extends CanvasTool.Graphic {
    constructor(opts) {
        super(opts);
        this.t = opts.t || 0;
    }

    draw(canvas, ctx) {
        var t = this.t;
        this.drawPolyLine(canvas, ctx, [{x: t, y:-100}, {x:t, y:100}]);
    }
};

class RhythmCanvas extends CanvasTool {
    super() {
        this.super("Rhythm");
    }
}

class RhythmCanvasGUI extends RhythmGUI {
    constructor(tool) {
        super(tool);
        this.canvas = new RhythmCanvas("canvas", {timerDelay:10});
        this.canvas.init();
        this.notes = {};
    }

    setupGUI() {
        super.setupGUI();
        this.setupButtonGUI();
        this.setupCanvas();
        this.canvas.start();
        var inst = this;
        setTimeout(e => inst.canvas.setViewRange(-1, 9, -1, 2), 100);
    }

    setupCanvas() {
        var inst = this;
        var tool = this.tool;
        var div = $("#beatsDiv");
        var nwd = 0.5;
        var nht = 0.2;
        for (let r = 0; r < tool.slength; r++) {
            var soundname = tool.sounds[r].split('.')[0];
            var id = soundname;
            for (let c = 0; c < tool.TICKS; c++) {
                let id = sprintf("b_%s_%s", r, c);
                var y = nht * r;
                var x = nwd * c;
                console.log("x", x, "y", y);
                var ng = new NoteGraphic({ x, y });
                this.canvas.addGraphic(ng);
                this.notes[r + "_" + c] = ng;
            }
        }
        this.timeGraphic = new TimeGraphic({x: 0, y: 1, t: 0});
        this.canvas.addGraphic(this.timeGraphic);
    }

    setupButtonGUI() {
        this.beats = {};
        var inst = this;
        var tool = this.tool;
        var div = $("#beatsDiv");
        for (let r = 0; r < tool.slength; r++) {
            var beatDiv = div.append("<div class='beats'></div>");
            var soundname = tool.sounds[r].split('.')[0];
            var id = soundname;
            beatDiv.append(sprintf("<input id='%s' type='button' value=' ' style='width:30px;height:30px;margin:4px'></input>", id));
            beatDiv.append(sprintf("%s", soundname));
            beatDiv.append("<br>");
            $("#" + id).click(e => tool.hitBeat(r));
            for (let c = 0; c < tool.TICKS; c++) {
                let id = sprintf("b_%s_%s", r, c);
                let beat = $(sprintf("<input type='button' class='beatsbutton' id='%s' value=''></input>", id));
                beatDiv.append(beat);
                beat.click((e) => tool.clickedOn(r, c));
                this.beats[r + "_" + c] = beat;
            }
            beatDiv.append("<p>");
        }
    }

    noticeState(r, c, v) {
        var bt = this.tool.getBeat(r, c);
        var color = v ? 'blue' : 'white';
        bt.css('background-color', color);
        var id = r + "_" + c;
        var ng = this.notes[id];
        if (!ng) {
            console.log("no note", id);
            return;
        }
        ng.fillStyle = color;
    }
    
    noticeTime(t) {
        this.timeGraphic.t = t*0.5;
    }
}

