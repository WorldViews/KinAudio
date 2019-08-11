
//
function dist2(v1, v2) {
    var d2 = 0;
    for (var i=0; i<v1.length; i++) {
        var d = v1[i]-v2[i];
        d2 += d*d;
    }
    return d2;
}

function vecStr(vec, fmt) {
    //console.log("vec", vec);
    fmt = fmt || "%5.2f %5.2f %5.2f"
    return sprintf(fmt, vec[0], vec[1], vec[2])
}

function getWPos(jrec) {
    return [jrec.cameraX, jrec.cameraY, jrec.cameraZ];
}

/*
This helper class is for 'debouncing'.  It watches discrete
states being tracked, and keeps track of how long a new state
has been in.  After an observed state change, the actual state
is considered to be transient (represented by null value)
until a given time duration passes in which only one value of
state is observed.
*/
class State {
    constructor(name) {
        console.log("State " + name);
        this.name = name;
        this.state = null;
        this.lastObservedState = null;
        this.lastChangeTime = getClockTime();
        this.minChangeTime = 0.2;
    }

    observe(state) {
        this.state = state;
    }

    noticeNewState(state) {
        console.log(sprintf("******* %s: %s", this.name, state));
    }

    hasState() {
        return self.state != null;
    }

    getState() {
        return this.state;
    }

    get() { return this.state; }
}

class BooleanState extends State {
    constructor(name) {
        super(name);
        console.log("BooleanState " + name);
    }

    observe(state) {
        if (state == this.state) {
            return state;
        }
        this.state = null;
        var t = getClockTime();
        if (state == this.lastObservedState) {
            var dt = t - this.lastChangeTime;
            if (dt >= this.minChangeTime) {
                this.state = state;
                this.noticeNewState(state);
            }
        }
        else {
            this.lastObservedState = state;
            this.lastChangeTime = t;
        }
        return this.state;
    }

}

/*
This is a class for keeping track of a body.
*/
JointType = {
    spineBase: 0,
    spineMid: 1,
    neck: 2,
    head: 3,
    shoulderLeft: 4,
    elbowLeft: 5,
    wristLeft: 6,
    handLeft: 7,
    shoulderRight: 8,
    elbowRight: 9,
    wristRight: 10,
    handRight: 11,
    hipLeft: 12,
    kneeLeft: 13,
    ankleLeft: 14,
    footLeft: 15,
    hipRight: 16,
    kneeRight: 17,
    ankleRight: 18,
    footRight: 19,
    spineShoulder: 20,
    handTipLeft: 21,
    thumbLeft: 22,
    handTipRight: 23,
    thumbRight: 24
}

/*
This class is for keeping track of information about a particular
tracked body.   At a given time if there are n skeletons being
tracked there should b n Body objects.
*/

class Body {
    constructor(id, bodyRec) {
        Body.numBodies++;
        this.bodyNum = Body.numBodies;
        this.id = id;
        this.lastBodyRec = bodyRec;
        this.lastTimeSeen = getClockTime();
    }

    handleRec(bodyRec, t, frame) {
        this.lastBodyRec = bodyRec;
        this.lastTimeSeen = t;
    }

    destroy() {
        console.log("Body "+this.id+" dying");
    }
}

Body.numBodies = 2;

/*
This is a subclass of Body where particular things are
being kept track of, that may be application specific.
*/
class RiggedBody extends Body {
    constructor(id, bodyRec) {
        super(id, bodyRec);
        this.DLR =              new State("DLR"); // dist Left to Right
        this.LEFT_UP =          new BooleanState("LEFT_UP");
        this.RIGHT_UP =         new BooleanState("RIGHT_UP");
        this.HANDS_TOGETHER =   new BooleanState("HANDS_TOGETHER");
        this.TRIGGER =          new BooleanState("TRIGGER");
    }

    handleRec(bodyRec, t, frame) {
        super.handleRec(bodyRec, t, frame);
        var J = JointType;
        //
        this.DLR.observe(this.wdist(J.handLeft, J.handRight));
        var lup = this.above(J.handLeft, J.head);
        var rup = this.above(J.handRight, J.head);
        var tog = this.together(J.handLeft, J.handRight);
        this.LEFT_UP.observe(lup);
        this.RIGHT_UP.observe(rup);
        this.HANDS_TOGETHER.observe(tog);
        this.TRIGGER.observe(lup && rup && tog);
    }

    above(j1, j2) {
        //console.log(sprintf("above %s %s", j1, j2));
        var pos1 = this.lastBodyRec.joints[j1];
        var pos2 = this.lastBodyRec.joints[j2];
        //console.log(" pos1:", pos1);
        //console.log(" pos2:", pos2);
        var y1 = 1.0 - pos1.colorY;
        var y2 = 1.0 - pos2.colorY;
        //console.log(sprintf("y1: %6.1f  y2: %6.1f", y1, y2))
        return y1 > y2;
    }

    // get world distance between j1 and j2
    wdist(j1, j2) {
        var wpos1 = getWPos(this.lastBodyRec.joints[j1]);
        var wpos2 = getWPos(this.lastBodyRec.joints[j2]);
        //console.log(" wpos1:", wpos1);
        //console.log(" wpos2:", wpos2);
        var d2 = dist2(wpos1, wpos2);
        return Math.sqrt(d2);
    }

    together(j1, j2) {
        //console.log(sprintf("above %s %s", j1, j2));
        //console.log(sprintf("y1: %6.1f  y2: %6.1f", y1, y2))
        //console.log("d2: ", d2);
        return (this.wdist(j1,j2) < 0.1);
    }

    getWPos(j) {
        return getWPos(this.lastBodyRec.joints[j]);
    }
    
    static statusHeader() {
        return "Num    LEFTUP RIGHTUP TOGETHER TRIGGER  DLR\n" +          
               "      LHAND               RHAND                  HEAD\n" +
               "------------------------------------------------------------\n";
    }

    statusStr() {
        var J = JointType;
        var line1 = sprintf("%3d   %7s %7s %7s %7s %7.2f\n",
            this.bodyNum,
            this.LEFT_UP.get(),
            this.RIGHT_UP.get(),
            this.HANDS_TOGETHER.get(),
            this.TRIGGER.get(),
            this.DLR.get()
        );
        var line2 = sprintf("  %10s   %10s   %10s\n",
            vecStr(getWPos(this.lastBodyRec.joints[J.handLeft])),
            vecStr(getWPos(this.lastBodyRec.joints[J.handRight])),
            vecStr(getWPos(this.lastBodyRec.joints[J.head])),
        );
        return line1 + line2;
    }
}

class SkelWatcher
{
    constructor(opts) {
        opts = opts || {};
        this.bodies = {};
        this.numRecs = 0;
        this.startTime = getClockTime();
        this.sioServerURL = null;
        this.socket = opts.socket;
        if (!this.socket) {
            this.sioServerURL = opts.sioServerURL || getParameterByName("sioServerURL") || '/';
            console.log("connecting to socket.io server", this.sioServerURL);
            this.socket = io.connect(this.sioServerURL);
        }
        this.socket.on('bodyFrame', this.handleBodyFrame.bind(this));
        this.socket.on('MUSE', this.handleMUSEMessage.bind(this));
    }

    sendMessage(msg, channel) {
        channel = channel || "MUSE";
        this.socket.emit(channel, msg);
    }

    handleMUSEMessage(msg) {
        //console.log("SkelWatcher.handleMUSEMessage", msg);
    }

    handleBodyFrame(frame) {
        //console.log("frame", frame);
        this.numRecs++;
        var t = getClockTime();
        var frameNum = frame.frameNum;
        var bodyRecs = frame.bodies;
        bodyRecs.forEach(bodyRec => {
            if (!bodyRec.tracked)
                return;
            var bid = bodyRec.trackingId;
            //console.log("bid", bid);
            var body = this.bodies[bid];
            if (!body) {
                body = this.makeNewBody(bid, bodyRec);
                this.bodies[bid] = body;
                this.handleNewBody(body);
            }
            body.handleRec(bodyRec, t, frame);
        });
        this.pruneZombies();
        this.showStatus();
    }

    pruneZombies() {
        var t = getClockTime();
        var deadIds = [];
        for (var id in this.bodies) {
            var body = this.bodies[id];
            if (t - body.lastTimeSeen > 2)
                deadIds.push(id);
        }
        deadIds.forEach(id => {
            this.handleRemovedBody(this.bodies[id]);
            delete this.bodies[id];
        })
    }

    makeNewBody(bid, bodyRec) {
        return new RiggedBody(bid, bodyRec);
    }
    
    handleNewBody(body) {
        console.log("New Body", body);
    }

    handleRemovedBody(body) {
        console.log("removing", body.id);
        body.destroy();
    }

    showStatus() {
        if (0) {
            console.log(RiggedBody.statusHeader());
            for (var bid in this.bodies) {
                console.log(this.bodies[bid].statusStr());
            }
        }
        var t = getClockTime();
        var dt = t - this.startTime;
        var nrecs = this.numRecs;
        var fps = nrecs / (dt + 1.0E-6);
        var statStr = sprintf("Running %6.1f  NRecs: %5d  FPS: %4.1f", dt, nrecs, fps);
        $("#bodyStatus").html(statStr+"\n\n");
        $("#bodyStatus").append(RiggedBody.statusHeader() + "<br>\n");
        for (var bid in this.bodies) {
            var body = this.bodies[bid];
            $("#bodyStatus").append(body.statusStr());
        }
    }
}

