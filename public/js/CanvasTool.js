// Class for 2D visualization for Kinect skeletons

/*
function dist(a1,a2) {
    var dx = a2.x - a1.x;
    var dy = a2.y - a1.y;
    return Math.sqrt(dx*dx + dy*dy);
}
*/

class CanvasTool {
    constructor(canvasName) {
        canvasName = canvasName || "canvas";
        console.log('Creating CanvasTool', canvasName);
        this.canvas = document.getElementById(canvasName);
        if (!this.canvas) {
            alert("No canvas named "+canvasName);
            return;
        }
        //this.elements = elements;
        this.mouseDownPt = null;
        this.mouseDownTrans = null;
        this.init();
        this.setupGUIBindings();
    }

    dist(a1,a2) {
        var dx = a2.x - a1.x;
        var dy = a2.y - a1.y;
        return Math.sqrt(dx*dx + dy*dy);    
    }

    setupGUIBindings() {
        var inst = this;

        this.canvas.addEventListener("mousedown", e=> {
            var hit = this.getHit(e);
            if (hit) {
                hit.onClick(e);
            }
            inst.mouseDownPt = {x: e.clientX, y: e.clientY};
            inst.mouseDownTrans = {tx: inst.tx, ty: inst.ty};
            //console.log("down", e, this.mouseDownPt);
        });
        this.canvas.addEventListener("mousemove", e=> {
            inst.mouseMove(e);
            if (inst.mouseDownPt == null) {
                 inst.mouseOver(e);
                return;
            }
            var tr = inst.mouseDownTrans;
            var dx = e.clientX - inst.mouseDownPt.x;
            var dy = e.clientY - inst.mouseDownPt.y;
            inst.tx = tr.tx + dx;
            inst.ty = tr.ty + dy;
            //inst.pan(dx,dy);
            //console.log("move", e);
        });
        this.canvas.addEventListener("mouseup", e=> {
            inst.mouseDownPt = null;
            //console.log("up", e);
        });
        this.canvas.addEventListener("wheel", e => {
            //console.log("mousewheel", e);
            e.preventDefault();
            if (e.deltaY > 0)
                inst.zoom(inst.zf);
            else
                inst.zoom(1/inst.zf);
        });
    }

    mouseMove(e) {
        var pt = this.getMousePos(e);
        var cpt = this.getMousePosCanv(e);
        console.log("mouse pos", pt);
        $("#canvasStat").html(
            sprintf("cx: %5.1f cy: %5.1f   x: %5.1f  y: %5.1f",
                    cpt.x, cpt.y, pt.x, pt.y));
    }

    getMousePosCanv(e) {
        var rect = this.canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }

    getMousePos(e) {
        var pt = this.getMousePosCanv(e);
        return {x: pt.x / this.sx + this.tx,
                y: pt.y / this.sy + this.ty};
    }

    mouseOver(e) {
        var pt = this.getMousePos(e);
        //console.log("mouseOver", pt);
        for (var id in this.graphics) {
            var g = this.graphics[id];
            if (g.contains(pt))
                console.log("Over id", id);
        }    
    }

    getHit(e) {
        var pt = this.getMousePos(e);
        //console.log("mouseOver", pt);
        for (var id in this.graphics) {
            var g = this.graphics[id];
            if (g.contains(pt))
                return g;
        }
        return null;
    }

    init() {
        this.graphics = {};
        this.sx = 1;
        this.sy = 1;
        this.tx = 0;
        this.ty = 0;
        this.zf = .99;
    }

    zoom(zf) {
        zf = zf || .9;
        this.sx *= zf;
        this.sy *= zf;
    }

    pan(dx,dy) {
        this.tx += dx;
        this.ty += dy;
    }

    clearCanvas() {
        var ctx = this.canvas.getContext('2d');
        var canvas = this.canvas;
        ctx.resetTransform();
        ctx.globalAlpha = 1;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.lineWidth = 5;
        ctx.strokeStyle = '#bbb';
        ctx.strokeRect(0, 0, canvas.width, canvas.height);
    }

    setTransform(ctx) {
        ctx.resetTransform();
        ctx.scale(this.sx, this.sy);
        ctx.translate(this.tx, this.ty);
    }

    drawGraphics() {
        var ctx = this.canvas.getContext('2d');
        this.setTransform(ctx);
        var canvas = this.canvas;
        ctx.resetTransform();
        ctx.scale(this.sx, this.sy);
        ctx.translate(this.tx, this.ty);
        for (var id in this.graphics){
            //console.log("draw id", id);
            var graphics = this.graphics[id];
            if (graphics !== undefined)
            {
                graphics.draw(canvas, ctx);
            }
        }
    }

    draw() {
        this.clearCanvas();
        this.drawGraphics();
    }

    resize(){
        console.log("resizing the canvas...");
        let canvasWidth = this.canvas.clientWidth;
        let maxCanvasSize = 800;
        if (canvasWidth > maxCanvasSize) {
            canvasWidth = maxCanvasSize;
        }
        this.canvas.width = canvasWidth;
        this.canvas.height = canvasWidth;
        this.draw();
    }

    setXY(id, x, y){
        this.graphics[id].x = x;
        this.graphics[id].y = y;
        this.draw();
    }

    getGraphic(id) {
        return this.graphics[id];
    }

    getNumGraphics() {
        return Object.keys(this.graphics).length;
    }

    addGraphic(graphic){
        graphic.tool = this;
        this.graphics[graphic.id] = graphic;       
    }

    removeGraphic(id) {
        console.log('removing graphic with id ' + id);
        delete this.graphics[id];
        this.draw();
    }

    tick() {
        //console.log("tick...");
        this.draw();
    }

    start() {
        this.tick();
        let inst = this;
        setInterval(() => inst.tick(), 100);
    }

}

CanvasTool.Graphic = class {
    constructor(id, x, y) {
        this.id = id;
        this.x =x;
        this.y = y;
        this.lineWidth = 1;
        this.strokeStyle = '#000';
        this.fillStyle = '#900';
        this.radius = 5; 
        this.alpha = 0.333;
        this.clickable =  false;
    }

    tick() {
    }
    
    draw(canvas, ctx) {
        this.drawCircle(canvas, ctx, this.radius, this.x, this.y);
    }

    drawCircle(canvas, ctx, r, x, y) {
        ctx.lineWidth = this.lineWidth;
        ctx.strokeStyle = this.strokeStyle;
        ctx.fillStyle = this.fillStyle;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
    }

    drawPolyLine(canvas, ctx, pts) {
        ctx.lineWidth = this.lineWidth;
        ctx.strokeStyle = this.strokeStyle;
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (var i=1; i<pts.length; i++) {
            ctx.lineTo(pts[i].x, pts[i].y);
        }
        ctx.stroke();
    }
    
    contains(pt) {
        var d = this.tool.dist(this, pt);
        //console.log("contains", this.id, d, this.x, this.y, pt, this.radius);
        var v = d <= this.radius;
        //console.log("v", v);
        return v;
    }

    onClick(e) {
        console.log("Graphic.onClick", this.id, e);
    }
}

CanvasTool.IconGraphic = class extends CanvasTool.Graphic {
    constructor(id, iconName, x,y) {
        super(id, x, y);
        this.iconName = iconName;
        this.icon = document.getElementById(iconName);
        if (!this.icon) {
            alert("Unable to get icon " + iconName);
        }
        this.radius = 0.04; 
        this.alpha = 0.333;
    }

    draw(canvas, ctx) {
        let radiusInPixels = this.radius * canvas.width;
        let x = this.x * canvas.width - radiusInPixels;
        let y = this.y * canvas.height - radiusInPixels;
        ctx.drawImage(
            this.icon, x, y, radiusInPixels * 2, radiusInPixels * 2);
    }
}

