
class KinectCameraGraphic extends CanvasTool.Graphic {
    constructor(id, x, y) {
        super(id, x, y);
        this.radius = 20;
    }
}

class PanoPortalGraphic extends CanvasTool.Graphic {
    constructor(id, x, y) {
        super(id, x, y);
        this.radius = 50;
        this.fillStyle = "#FEE"
    }
}

class BodyGraphic extends CanvasTool.Graphic {
    constructor(body) {
        var id = "body"+body.id;
        super(id, 48, 52);
        this.body = body;
    }

    draw(canvas, ctx) {
        var J = JointType;
        var hpt = this.body.getFloorXY(J.head);
        var npt = this.body.getFloorXY(J.neck);
        var lspt = this.body.getFloorXY(J.shoulderLeft);
        var lept = this.body.getFloorXY(J.elbowLeft);
        var lhpt = this.body.getFloorXY(J.handLeft);
        var rspt = this.body.getFloorXY(J.shoulderRight);
        var rept = this.body.getFloorXY(J.elbowRight);
        var rhpt = this.body.getFloorXY(J.handRight);
        this.drawCircle(canvas, ctx, 4, hpt.x, hpt.y);
        this.drawCircle(canvas, ctx, 2, lhpt.x, lhpt.y);
        this.drawCircle(canvas, ctx, 2, rhpt.x, rhpt.y);
        this.drawPolyLine(canvas, ctx, [rhpt, rept, rspt, npt, hpt, npt, lspt, lept, lhpt])
        //this.drawPolyLine(canvas, ctx, [rhpt, rept, rspt, lspt, lept, lhpt])
    }
}

class CanvBody extends RiggedBody {
    constructor(bid, bodyRec) {
        super(bid, bodyRec);
    }

    getFloorXY(j) {
        var wp = this.getWPos(j);
        var x = 100.0*wp[0];
        var y = 100.0*wp[2];
        return {x,y};
    }

    handleRec(bodyRec, t, frame) {
        super.handleRec(bodyRec, t, frame);
        var J = JointType;
        var fp = this.getFloorXY(J.head);
        this.graphic.x = fp.x;
        this.graphic.y = fp.y;
        this.watcher.canvasTool.draw();
        //console.log("fp", fp);
    }
}

class CanvasSkelWatcher extends SkelWatcher {

    constructor(opts) {
        super(opts);
        this.canvasTool = opts.canvasTool;
        this.canvasTool.addGraphic(new PanoPortalGraphic('panoPortal1', 10, 100));
        this.canvasTool.addGraphic(new KinectCameraGraphic('kin1', 0, 0));
    }

    makeNewBody(bid, bodyRec) {
        var cb = new CanvBody(bid, bodyRec);
        cb.watcher = this;
        return cb;
    }

    handleNewBody(body) {
        super.handleNewBody();
        console.log("********** new Body !!! *******", body);
        var g = new BodyGraphic(body, 48, 49);
        g.radius = 10;
        g.fillStyle = "#98A"
        this.canvasTool.addGraphic(g);
        body.graphic = g;
    }
}


