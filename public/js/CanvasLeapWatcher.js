
class HandsGraphic extends CanvasTool.Graphic {
    constructor(watcher, x, y) {
        super('hands', x, y);
        this.watcher = watcher;
        this.leap = watcher.leapClient;
        this.canvas = watcher.canvasTool.canvas;
        this.leapRenderer = new LeapRenderer(this.canvas);
    }

    draw(canvas, ctx) {
        super.draw(canvas, ctx);
        var frame = this.watcher.lastFrame;
        if (frame) {
            var s = 0.001;
            ctx.lineWidth = 5;
            ctx.save();
            ctx.scale(-s,s);
            this.leapRenderer.draw(frame);
            ctx.restore();
        }
    }
}

class CanvasLeapWatcher {
    constructor(opts) {
        var inst = this;
        this.canvasTool = opts.canvasTool;
        this.leapClient = new LeapClient();
        this.leapClient.poseWatcher = (frame) => inst.handleFrame(frame);
        this.handsGraphic = new HandsGraphic(this, -1, 2)
        this.canvasTool.addGraphic(this.handsGraphic);

        this.RHAND =            new V3State("RHAND");
        //this.LHAND =            new KinematicState("LHAND");
        this.LHAND =            new V3State("LHAND");
        this.DLR =              new State("DLR"); // dist Left to Right

    }

    handleFrame(frame) {
        this.lastFrame = frame;
        //console.log(frame);
        var saw = {};
        frame.hands.forEach(hand => {
            if (hand.type == "left") {
                //console.log("left hand", hand.palmPosition);
                this.LHAND.observe(hand.palmPosition);
            }
            if (hand.type == "right") {
                //console.log("right hand", hand.palmPosition);
                this.RHAND.observe(hand.palmPosition);
            }
            saw[hand.type] = true;
        });
        if (saw.left && saw.right) {
            var dlr = dist(this.LHAND.get(), this.RHAND.get());
            //console.log("dlr", dlr);
            this.DLR.observe(dlr/1000.0);
        }

        $("#handsStatus").html(this.statusStr());
    }

    statusStr() {
        var l = this.LHAND.get();
        var r = this.RHAND.get();
        if (!l || !r) {
            return "hands not tracked";
        }
        return "       LHAND                  RHAND               DLR\n" +
               sprintf(" %6.1f %6.1f %6.1f   %6.1f %6.1f %6.1f    %6.3f",
                        l[0], l[1], l[2],
                        r[0], r[1], r[2],
                        this.DLR.get());
    }

}


