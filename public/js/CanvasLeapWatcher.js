
class HandsGraphic extends CanvasTool.Graphic {
    constructor(watcher, x, y) {
        super('hands', x, y);
        this.watcher = watcher;
        this.leap = watcher.leapClient;
        this.canvas = watcher.canvasTool.canvas;
        this.leapRenderer = new LeapRenderer(this.canvas);
        this.width = .1;
        this.height = .05;
        this.strokeStyle = "#CCC";
        this.fillStyle = "#AAA";
    }

    draw(canvas, ctx) {
        super.drawRect(canvas, ctx, this.x, this.y, this.width, this.height);
        var frame = this.watcher.lastFrame;
        if (frame) {
            var s = 0.001;
            ctx.lineWidth = 3;
            ctx.save();
            ctx.translate(this.x, this.y);
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
        this.handsGraphic = new HandsGraphic(this, 0.0, 0.8)
        this.canvasTool.addGraphic(this.handsGraphic);

        this.LWRIST =           new V3State("LWRIST");
        this.RWRIST =           new V3State("RWRIST");
        this.RHAND =            new KinematicState("RHAND");
        this.LHAND =            new KinematicState("LHAND");
        //this.LHAND =            new V3State("LHAND");
        this.DLR =              new State("DLR"); // dist Left to Right
        this.DLRW =             new State("DLRW"); // dist Left to Right

    }

    handleFrame(frame) {
        this.lastFrame = frame;
        //console.log(frame);
        var saw = {};
        frame.hands.forEach(hand => {
            if (hand.type == "left") {
                //console.log("left hand", hand.palmPosition);
                this.LHAND.observe(hand.palmPosition);
                this.LWRIST.observe(hand.wrist);
            }
            if (hand.type == "right") {
                //console.log("right hand", hand.palmPosition);
                this.RHAND.observe(hand.palmPosition);
                this.RWRIST.observe(hand.wrist);
            }
            saw[hand.type] = true;
        });
        if (saw.left && saw.right) {
            var dlrh = dist(this.LHAND.getPos(), this.RHAND.getPos());
            //console.log("dlr", dlr);
            this.DLR.observe(dlrh/1000.0);
            var dlrw = dist(this.LWRIST.get(), this.RWRIST.get());
            this.DLRW.observe(dlrw/1000.0);
        }
        //console.log("RHAND", this.RHAND.get());
        //console.log("LHAND", this.LHAND.get());
        $("#handsStatus").html(this.statusStr());
    }

    statusStr() {
        var l = this.LHAND.get();
        var r = this.RHAND.get();
        var VLR = (Math.abs(l[3]) + Math.abs(r[3]))/2;
        if (!l || !r) {
            return "hands not tracked";
        }
        return "       LHAND                  RHAND              VLR        DLR   DLRW\n" +
               sprintf(" %6.1f %6.1f %6.1f   %6.1f %6.1f %6.1f  %6.3f      %6.3f %6.3f",
                        l[0], l[1], l[2],
                        r[0], r[1], r[2], 
                        VLR, this.DLR.get(), this.DLRW.get());
    }

}


