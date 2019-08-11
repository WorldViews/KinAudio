
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

