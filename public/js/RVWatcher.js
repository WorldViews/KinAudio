var data = {
  speed: [],
  movAve: [],
  exMovAve: [],
  avg: [],
};

// This is a class that should just keep track of things about the ReactiveVideo
// state.   It may also do some smoothing or estimates of things in that state.
// It should not do things to control audio or other media.   It is a proxy for
// the information in the RV system.
//
class RVWatcher {
  constructor() {
    console.log("Creating RVWatcher");
    this.msg = null;
    //this.le = null;
    this.s = null;
    this.driverId = null;
    this.rgb = null;

    this.energySmoo = null;
    this.playSpeedSmoo = null;
    this.speedAvg = null;
    this.playTime = 0;
    this.clockTime = 0;
    this.playSpeed = 0;
    this.prevPlayTime = null;
    this.prevClockTime = null;
    this.prevMsgNum = 0;
    this.prevMsg = null;
    this.rvAppId = null;
  }

  // going away
  handlePoseFitMsg(msg) {
    if (msg.type != "poseFit") {
      console.log("handlePoseFitMsg called with wrong msg type", msg);
      return;
    }
    var msgNum = msg.msgNum;
    if (this.prevMsgNum != null && msgNum != this.prevMsgNum + 1) {
      console.log("**************** inconsecutive messages", msgNum, this.prevMsgNum);
      console.log("msg", JSON.stringify(msg, null, 2));
      console.log("prevMsg", JSON.stringify(this.prevMsg, null, 2));
    }
    if (this.rvAppId && msg._appId != this.rvAppId) {
      alert("New rvAppId - maybe you have multiple or new RV players?");
    }
    this.rvAppId = msg._appId;
    this.prevMsgNum = msgNum;
    this.prevMsg = msg;
    this.playTime = msg.playTime;
    this.clockTime = msg.clockTime;
    if (this.prevPlayTime != null) {
      var dpt = this.playTime - this.prevPlayTime;
      var dct = this.clockTime - this.prevClockTime;
      if (dct < 0) {
        console.log("Bad deltaClockTime", dct);
        alert("Bad deltaClockTime");
        dct = 0.01;
      }
      if (dct == 0) {
        return;
      }
      this.playSpeed = dpt / dct;
      this.smooSpeed = this.speedAvg.mean;
      //console.log("playSpeed is now: ", this.playSpeed, "average is: ", this.smooSpeed);
      //var tempo = app.changePartTempo(this.playSpeed, this.smooSpeed);
      app.noticePoseFit(msg, this)
      //console.log("Changing tempo to: ", tempo);
    }
    this.prevPlayTime = this.playTime;
    this.prevClockTime = this.clockTime;
    this.energy = msg.energy;
    //console.log("energy: ", this.energy);
    // change filter freq with energy
    this.controlPoints = msg.controlPoints;
    if (!this.energySmoo) {
      this.movingAverage(0.99, this.energy, 'energy');
    }
    this.updateMovingAverage(this.energySmoo, this.energySmooExp, this.energyAvg, this.energy);
    if (Math.abs(this.playSpeed) > 10.0) {
      console.log("**** Ignoring large playSpeeds...");
      return;
    }
    if (!this.playSpeedSmoo) {
      this.movingAverage(0.99, this.playSpeed, 'playSpeed');
    }
    this.updateMovingAverage(this.playSpeedSmoo, this.playSpeedSmooExp, this.speedAvg, this.playSpeed);
  }

  handleDriverChange(msg) {
    console.log("handleDriverChange", msg);
    this.driverId = msg.driverId;
    console.log("Driver change, change player driver id", this.driverId);
  }

  handleConnectDrag(msg) {
    console.log("handleConnectDrag", msg);
  }

  handleDisconnectDrag(msg) {
    console.log("handleDisconnectDrag", msg);
  }

  handleReachedEnd(msg) {
    console.log("handleReachedEnd", msg);
  }

  handleMessage(msg) {
    if (msg) {
      this.msg = msg;
      this.type = msg.type;
      this.mode = msg.mode;

      if (msg.type == 'event' && msg.eventType == 'driverChange') {
        this.handleDriverChange(msg);
      }
      if (msg.type == 'event' && msg.eventType == 'connectDrag') {
        this.handleConnectDrag(msg);
      }
      if (msg.type == 'event' && msg.eventType == 'disconnectDrag') {
        this.handleDisconnectDrag(msg);
      }
      if (msg.type == 'event' && msg.eventType == 'reachedEnd') {
        this.handleReachedEnd(msg);
      }
      else if (msg.type == "poseFit") {
        this.handlePoseFitMsg(msg);
      }
    }
    else {
      console.log("No property available");
      return;
    }
  }

  movingAverage(alpha, data, type) {
    switch (type) {
      case 'energy':
        this.energySmoo = new MovingAverageCalculator();
        this.energySmooExp = new ExpMovAve(alpha, data);
        this.energyAvg = new RunningAverageCalculator();
        this.energyMean = this.energySmooExp.mean;
        // or use this.energySmoo.mean
        break;
      case 'playSpeed':
        this.playSpeedSmoo = new MovingAverageCalculator();
        this.playSpeedSmooExp = new ExpMovAve(alpha, data);
        this.speedAvg = new RunningAverageCalculator();
        this.speedMean = this.playSpeedSmooExp.mean;
        break;
    }
  }

  updateMovingAverage(calc, expCalc, avg, data) {
    calc.update(data);
    expCalc.update(data);
    avg.update(data);
  }

}