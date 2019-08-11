
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
        this.skelWatcher = this.makeSkelWatcher();
        this.playerView = new AppProxy("playerView", portal);
    }

    makeSkelWatcher() {
        return new SkelWatcher();
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

