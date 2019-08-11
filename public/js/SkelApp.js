
// This is a class for talking to and controlling another App.
class AppProxy {
    constructor(name, portal) {
        this.destName = name;
        this.portal = portal;
    }

    play() { this.setProps({paused: false}) }
    pause() { this.setProps({paused: true}) }

    setProps(props) {
        var msg = cloneObject(props);
        msg.type = 'setProps';
        this.sendMessage(msg);
    }

    sendMessage(msg) {
        msg._dst = this.destName;
        console.log("AppProxy", msg);
        this.portal.sendMessage(msg);
    }
}

var BODY = null;

class CanvBody extends RiggedBody {
    constructor(bid, bodyRec) {
        super(bid, bodyRec);
    }

    getFloorXY(j) {
        var wp = this.getWPos(j);
        var x = 150*wp[0];
        var y = 150*wp[2];
        return {x,y};
    }

    handleRec(bodyRec, t, frame) {
        super.handleRec(bodyRec, t, frame);
        var J = JointType;
        var fp = this.getFloorXY(J.head);
        BODY = this;
        this.graphic.x = fp.x;
        this.graphic.y = fp.y;
        this.watcher.canvasTool.draw();
        //console.log("fp", fp);
    }
}

class SkelWatcherWithCanvas extends SkelWatcher {
    constructor(canvasTool) {
        super();
        this.canvasTool = canvasTool;
    }

    makeNewBody(bid, bodyRec) {
        var cb = new CanvBody(bid, bodyRec);
        cb.watcher = this;
        return cb;
    }

    handleNewBody(body) {
        super.handleNewBody();
        console.log("********** new Body !!! *******", body);
        var id = "body"+body.id;
        var g = new CanvasTool.Graphic(id, 48, 49);
        g.radius = 10;
        g.fillStyle = "#98A"
        this.canvasTool.addGraphic(g);
        body.graphic = g;
    }
}

class SkelApp {
    constructor(opts) {
        opts = opts || {};
        this.userName = opts.userName || getParameterByName("userName") || "guest";
        var inst = this;
        var clientId = "skelApp_"+getClockTime();
        // Note, the portal stuff here is probably not being used by
        // AudioHackApp.  It is getting and sending messages via the
        // SkelWatcher
        this.portal = new MUSEPortal();
        var portal = this.portal;
        this.n = 0;
        portal.addWatcher(this.handleMUSEMessage.bind(this));
        this.sendMessage({ type: 'request.status' });
        setInterval(() => inst.tick(), 100);
        setInterval(() => {
            //console.log("heartbeat...");
            inst.n++;
            inst.sendMessage({ type: 'heartbeat', n: inst.n, client: "SkelApp", clientId });
        }, 5000);
        $("#userName").val(this.userName);
        this.skelWatcher = this.makeSkelWatcher(opts);
        this.playerView = new AppProxy("playerView", portal);
    }

    makeSkelWatcher(opts) {
        return new SkelWatcherWithCanvas(opts.canvasTool);
    }

    tick() {
    }
    

    sendMessage(msg) {
        //console.log("SkelApp.sendMessage", msg);
        msg._clientName = this.clientName;
        this.portal.sendMessage(msg);
    }


    handleMUSEMessage(msg) {
        //console.log("handleMUSEMessage", msg);
        //$("#log").html(JSON.stringify(msg, null, 3));
        if (msg._src != 'playerView') {
            //console.log("rejecting ", msg);
            return;
        }
        if (msg.type == "poseFit") {
        }
    }
}

