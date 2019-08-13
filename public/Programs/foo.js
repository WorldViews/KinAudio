
var bar = 25;

if (app.fooLoaded) {
    console.log("foo previously loaded - overwriting...")
}
else {
    app.fooLoaded = true;
}

function fooFun() {
    console.log("****** Hello from Foo *******");
    console.log("app", app);
}

fooFun();


