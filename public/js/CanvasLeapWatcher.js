
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
    }

    handleFrame(frame) {
        this.lastFrame = frame;
        //console.log(frame);
    }
}


