import {
    inf,
    MAXSTEP
} from './constants.js';

import {
    Figure,
    Point,
    Circle,
    Line,
    Segment,
    Arc,
    ArcThrough3Points,
    Angle,
} from './geometry-classes.js';

import {
    v_line,
    h_line,
    perpendicular,
    parallel,
    angled_line,
    middle_perpendicular,
    middle,
    distance,
} from './geometry-helpers.js';

export class Drawer {
    constructor(CANVAS_ID, GEOMETRY, ANTROPOMETRICS, FIT) {
        this.CANVAS_ID = CANVAS_ID
        this.INIT_GEOMETRY = GEOMETRY;
        this.INIT_ANTROPOMETRICS = ANTROPOMETRICS;
        this.INIT_FIT = FIT;

        this.canvas = document.getElementById(this.CANVAS_ID);
        this.initializePaper();

        this.bike = {}
        this.rider = {}
        this.angles = {}
    }

    initializePaper() {
        this.scope = new paper.PaperScope();
        this.scope.setup(this.canvas);
        this.project = this.scope.project;
    }

    blur() {
        this.canvas.style.filter = "blur(2.5px)"
    }

    unblur() {
        this.canvas.style.filter = "none";
    }

    draw() {
        this.scope.setup(this.canvas);
        this.clearCanvas();
        this.calculateScale();
        this.scaleData();
        this.drawBikeGeometry();
        this.drawRider();
        this.drawAngles();
        this.unblur();
    }

    draw_preview() {
        this.scope.setup(this.canvas);
        this.clearCanvas();
        this.calculateScale();
        this.scaleData();
        this.FIT = {
            'seatHight': this.GEOMETRY['seatTube'] + (this.GEOMETRY['minseatpostLen'] + this.GEOMETRY['maxseatpostLen']) / 2,
            'stemHight': this.GEOMETRY['maxStemHight'],
            'shifterAngle': 45,
            'saddleOffset': 0,
        }
        this.drawBikeGeometry();
        this.unblur();
    }

    calculateScale() {
        const rect = this.canvas.getBoundingClientRect();
        this.width = rect.width;
        this.height = rect.height;
        this.scale = Math.min(this.width / 2000, this.height / 1750);
        Figure.MAXSTEP = MAXSTEP * this.scale
    }

    scaleData() {
        this.GEOMETRY = structuredClone(this.INIT_GEOMETRY)
        this.ANTROPOMETRICS = structuredClone(this.INIT_ANTROPOMETRICS)
        this.FIT = structuredClone(this.INIT_FIT)

        for (let DATA of[this.GEOMETRY, this.ANTROPOMETRICS, this.FIT]) {
            for (var key in DATA) {
                if (!(key.endsWith('Angle'))) {
                    DATA[key] *= this.scale;
                }

            }
        }
    }

    drawBikeGeometry() {
        this.drawFrame();
        this.drawSeatpost();
        this.drawWheels();
        this.drawStem();
        this.drawHandlebars();
        this.drawKinematics();
    }

    drawRider() {
        this.drawLegs();
        this.drawTorso();
        this.drawArms();
        this.drawHead();
    }

    drawAngles() {
        this.angles.ElbowAngle = new Angle({ scope: this.scope, p1: this.rider.Shoulder, p2: this.rider.Elbow, p3: this.rider.Hands, draw_segments: false, valid_range: [145, 165] })
        let line0 = h_line(this.scope, this.rider.HipJoint, false)
        let point0 = new Point({ scope: this.scope, x: this.rider.Shoulder.x, y: this.rider.Shoulder.y, dependencies: [line0], visible: false })
        this.angles.TorsoAngle = new Angle({ scope: this.scope, p1: this.rider.Shoulder, p2: this.rider.HipJoint, p3: point0, valid_range: [35, 47.5], draw_segments: false })
        this.angles.ShoulderAngle = new Angle({ scope: this.scope, p1: this.rider.Hands, p2: this.rider.Shoulder, p3: this.rider.HipJoint, draw_segments: true, valid_range: [87.5, 92.5] })


        point0 = new Point({ scope: this.scope, x: this.bike.ShifterAxle.x + this.GEOMETRY['shifterReach'], y: this.bike.ShifterAxle.y, dependencies: [this.bike.ShifterAxle], visible: false })
        this.angles.ShifterAngle = new Angle({ scope: this.scope, p1: point0, p2: this.bike.ShifterAxle, p3: this.rider.Hands, draw_segments: false, visible: false })
    }

    clearCanvas() {
        this.scope.setup(this.canvas);
        this.project.activeLayer.removeChildren();
        this.scope.view.update();

        Figure.allFigures = [];

        // Сброс счетчиков
        Point._id_counter = 0;
        Circle._id_counter = 0;
        Line._id_counter = 0;
        Arc._id_counter = 0;
        ArcThrough3Points._id_counter = 0;
        Angle._id_counter = 0;
    }

    reset() {
        this.draw();
    }

    drawFrame() {
        const Rearx = (this.width - this.GEOMETRY['wheelbase']) / 2
        const BBx = Rearx + Math.sqrt((this.GEOMETRY['chainstay'] ** 2 - this.GEOMETRY['bbdrop'] ** 2))

        //---------Cranks--------
        this.bike.BottomBracket = new Point({ scope: this.scope, x: BBx, y: 1400 * this.scale, moveable: false })
        let circle0 = new Circle({ scope: this.scope, center: this.bike.BottomBracket, radius: this.GEOMETRY['crankLen'], visible: false })
        this.bike.PedalSpindel_1 = new Point({ scope: this.scope, x: inf, y: this.bike.BottomBracket.y, dependencies: [circle0], moveable: true })
        this.bike.crankLine = new Line({ scope: this.scope, p1: this.bike.BottomBracket, p2: this.bike.PedalSpindel_1, visible: false })
        this.bike.PedalSpindel_2 = new Point({ scope: this.scope, x: 0, y: this.bike.BottomBracket.y, dependencies: [this.bike.crankLine, circle0] })
        this.bike.Cranks = new Segment({ scope: this.scope, p1: this.bike.PedalSpindel_1, p2: this.bike.PedalSpindel_2 })

        //---------WheelAxes--------
        circle0 = new Circle({ scope: this.scope, center: this.bike.BottomBracket, radius: this.GEOMETRY['chainstay'], visible: false });
        let point0 = new Point({ scope: this.scope, x: this.bike.BottomBracket.x, y: this.bike.BottomBracket.y - this.GEOMETRY['bbdrop'], dependencies: [this.bike.BottomBracket], visible: false });
        let line0 = h_line(this.scope, point0, false);
        this.bike.RearAxis = new Point({ scope: this.scope, x: 0, y: 0, dependencies: [circle0, line0], visible: false })
        circle0 = new Circle({ scope: this.scope, center: this.bike.RearAxis, radius: this.GEOMETRY['wheelbase'], visible: false });
        this.bike.FrontAxis = new Point({ scope: this.scope, x: inf, y: 0, dependencies: [circle0, line0], visible: false })

        //----------RearTubes----------
        point0 = new Point({ scope: this.scope, x: this.bike.BottomBracket.x - 100, y: this.bike.BottomBracket.y, dependencies: [this.bike.BottomBracket], visible: false })
        this.bike.SeatTubeLine = angled_line(this.scope, point0, this.bike.BottomBracket, this.GEOMETRY['seatAngle'], false)

        circle0 = new Circle({ scope: this.scope, center: this.bike.BottomBracket, radius: this.GEOMETRY['seatTube'] * 0.8, visible: false })
        point0 = new Point({ scope: this.scope, x: 0, y: 0, dependencies: [circle0, this.bike.SeatTubeLine], visible: false })
        this.bike.SeatStay = new Segment({ scope: this.scope, p1: this.bike.RearAxis, p2: point0 })
        this.bike.Chainstay = new Segment({ scope: this.scope, p1: this.bike.BottomBracket, p2: this.bike.RearAxis })

        circle0 = new Circle({ scope: this.scope, center: this.bike.BottomBracket, radius: this.GEOMETRY['seatTube'], visible: false })
        this.bike.SeatTubeClamp = new Point({ scope: this.scope, x: 0, y: 0, dependencies: [this.bike.SeatTubeLine, circle0], visible: false })
        this.bike.SeatTube = new Segment({ scope: this.scope, p1: this.bike.BottomBracket, p2: this.bike.SeatTubeClamp })

        //-----FrontTubes-----
        line0 = v_line(this.scope, this.bike.BottomBracket, false);
        circle0 = new Circle({ scope: this.scope, center: this.bike.BottomBracket, radius: this.GEOMETRY['stack'], visible: false });
        point0 = new Point({ scope: this.scope, x: 0, y: 0, dependencies: [line0, circle0], visible: false });

        line0 = perpendicular(this.scope, line0, point0, false);
        circle0 = new Circle({ scope: this.scope, center: point0, radius: this.GEOMETRY['reach'], visible: false })
        let point1 = new Point({ scope: this.scope, x: inf, y: 0, dependencies: [line0, circle0], visible: false })

        this.bike.TopTube = new Segment({ scope: this.scope, p1: point1, p2: this.bike.SeatTube.p2 })
        this.bike.HeadTubeLine = angled_line(this.scope, point0, point1, this.GEOMETRY['headAngle'], false)
        circle0 = new Circle({ scope: this.scope, center: point1, radius: this.GEOMETRY['headTube'], visible: false })
        point0 = new Point({ scope: this.scope, x: inf, y: inf, dependencies: [this.bike.HeadTubeLine, circle0], visible: false })
        this.bike.HeadTube = new Segment({ scope: this.scope, p1: point0, p2: point1 })
        this.bike.Fork = new Segment({ scope: this.scope, p1: point0, p2: this.bike.FrontAxis })
        this.bike.DownTube = new Segment({ scope: this.scope, p1: point0, p2: this.bike.BottomBracket })
    }

    drawSeatpost() {
        let circle0 = new Circle({ scope: this.scope, center: this.bike.SeatTubeClamp, radius: this.GEOMETRY['maxseatpostLen'], visible: false })
        let circle1 = new Circle({ scope: this.scope, center: this.bike.SeatTubeClamp, radius: this.GEOMETRY['minseatpostLen'], visible: false })
        this.bike.MaxSeat = new Point({ scope: this.scope, x: 0, y: 0, dependencies: [this.bike.SeatTubeLine, circle0], visible: false })
        this.bike.MinSeat = new Point({ scope: this.scope, x: 0, y: 0, dependencies: [this.bike.SeatTubeLine, circle1], visible: false })
        this.bike.SeatpostRange = new Segment({ scope: this.scope, p1: this.bike.MinSeat, p2: this.bike.MaxSeat, visible: false })
        this.bike.SeatpostTop = new Point({ scope: this.scope, x: this.bike.BottomBracket.x - (this.FIT['seatHight'] - this.GEOMETRY['saddleHeight']) * Math.cos(this.GEOMETRY['seatAngle'] / 180 * Math.PI), y: this.bike.BottomBracket.y - (this.FIT['seatHight'] - this.GEOMETRY['saddleHeight']) * Math.sin(this.GEOMETRY['seatAngle'] / 180 * Math.PI), dependencies: [this.bike.SeatpostRange], moveable: true })
        this.bike.Setpost = new Segment({ scope: this.scope, p1: this.bike.SeatTubeClamp, p2: this.bike.SeatpostTop })

        let point2 = new Point({ scope: this.scope, x: this.bike.SeatpostTop.x, y: this.bike.SeatpostTop.y - this.GEOMETRY['saddleHeight'], dependencies: [this.bike.SeatpostTop], visible: false })

        let point0 = new Point({ scope: this.scope, x: point2.x - this.GEOMETRY['saddleRailLen'] / 2, y: point2.y, dependencies: [point2], visible: false })
        let point1 = new Point({ scope: this.scope, x: point2.x + this.GEOMETRY['saddleRailLen'] / 2, y: point2.y, dependencies: [point2], visible: false })
        this.bike.SaddleRange = new Segment({ scope: this.scope, p1: point0, p2: point1, visible: false })
        this.bike.Saddle = new Point({ scope: this.scope, x: point2.x + this.FIT['saddleOffset'], y: point2.y, dependencies: [this.bike.SaddleRange], moveable: true })

        circle0 = new Circle({ scope: this.scope, center: this.bike.Saddle, radius: this.GEOMETRY['saddleLen'] / 2, visible: false })
            // point0 = new Point({ scope: this.scope,  x: 0, y: 0, dependencies: [circle0], visible: false })
            // arc0 = new Arc({ scope: this.scope,  center: Saddle, point: point0, fromAngle: 10, toAngle: -10, visible: false })
            // let SaddleNose = new Point({ scope: this.scope,  x: Saddle.x + Math.cos(FIT['saddleAngle'] / 180 * Math.PI), y: Saddle.y - Math.sin(FIT['saddleAngle'] / 180 * Math.PI), dependencies: [circle0], moveable: true })
            // let SaddleLine = new Line({ scope: this.scope,  p1: SaddleNose, p2: Saddle, visible: false })
        this.bike.SaddleLine = h_line(this.scope, this.bike.Saddle, false)
        this.bike.SaddleNose = new Point({ scope: this.scope, x: inf, y: 0, dependencies: [circle0, this.bike.SaddleLine], visible: false })
        this.bike.SaddleBack = new Point({ scope: this.scope, x: 0, y: 0, dependencies: [circle0, this.bike.SaddleLine], visible: false })
        this.bike.SaddleTop = new Segment({ scope: this.scope, p1: this.bike.SaddleBack, p2: this.bike.SaddleNose })
        circle0 = new Circle({ scope: this.scope, center: this.bike.SaddleBack, radius: this.GEOMETRY['saddleLen'] * 0.35, visible: false })
        circle1 = new Circle({ scope: this.scope, center: this.bike.SaddleNose, radius: this.GEOMETRY['saddleLen'] * 0.7, visible: false })
        point0 = new Point({ scope: this.scope, x: 0, y: inf, dependencies: [circle0, circle1], visible: false })
        new Segment({ scope: this.scope, p1: this.bike.SaddleBack, p2: point0 })
        new Segment({ scope: this.scope, p1: this.bike.SaddleNose, p2: point0 })
    }

    drawWheels() {
        this.bike.RearRim = new Circle({ scope: this.scope, center: this.bike.RearAxis, radius: this.GEOMETRY['rimD'] / 2 })
        this.bike.RearTyre = new Circle({ scope: this.scope, center: this.bike.RearAxis, radius: this.GEOMETRY['rimD'] / 2 + this.GEOMETRY['tyreW'] })

        this.bike.FrontRim = new Circle({ scope: this.scope, center: this.bike.FrontAxis, radius: this.GEOMETRY['rimD'] / 2 })
        this.bike.FrontTyre = new Circle({ scope: this.scope, center: this.bike.FrontAxis, radius: this.GEOMETRY['rimD'] / 2 + this.GEOMETRY['tyreW'] })
    }

    drawStem() {
        let circle0 = new Circle({ scope: this.scope, center: this.bike.TopTube.p1, radius: this.GEOMETRY['maxStemHight'], visible: false })
        let point0 = new Point({ scope: this.scope, x: 0, y: 0, dependencies: [this.bike.HeadTubeLine, circle0], visible: false })
        circle0 = new Circle({ scope: this.scope, center: this.bike.TopTube.p1, radius: this.GEOMETRY['minStemHight'], visible: false })
        let point1 = new Point({ scope: this.scope, x: 0, y: 0, dependencies: [this.bike.HeadTubeLine, circle0], visible: false })

        this.bike.SteererRange = new Segment({ scope: this.scope, p1: point1, p2: point0, visible: false })
        point0 = new Point({ scope: this.scope, x: this.bike.TopTube.p1.x - this.FIT['stemHight'] * Math.cos(this.GEOMETRY['headAngle'] / 180 * Math.PI), y: this.bike.TopTube.p1.y - this.FIT['stemHight'] * Math.sin(this.GEOMETRY['headAngle'] / 180 * Math.PI), dependencies: [this.bike.SteererRange], moveable: true })
        this.bike.StemLine = angled_line(this.scope, this.bike.TopTube.p1, point0, 90 - this.GEOMETRY['stemAngle'], false)
        console.log(90 - this.GEOMETRY['stemAngle'])
        circle0 = new Circle({ scope: this.scope, center: point0, radius: this.GEOMETRY['stemLen'], visible: false })
        point1 = new Point({ scope: this.scope, x: inf, y: 0, dependencies: [this.bike.StemLine, circle0], visible: false })
        this.bike.Stem = new Segment({ scope: this.scope, p1: point0, p2: point1 })
        this.bike.Steerer = new Segment({ scope: this.scope, p1: this.bike.TopTube.p1, p2: this.bike.Stem.p1 })

    }

    drawHandlebars() {
        this.bike.CurveStart = null
        const curveratio = 0.25
        var curve_r1 = null
        var curve_r2 = null
        if (this.GEOMETRY['barReach'] > this.GEOMETRY['barDrop'] * curveratio) {
            let line0 = h_line(this.scope, this.bike.Stem.p2, false)
            let circle0 = new Circle({ scope: this.scope, center: this.bike.Stem.p2, radius: this.GEOMETRY['barReach'] - this.GEOMETRY['barDrop'] * curveratio, visible: false })
            this.bike.CurveStart = new Point({ scope: this.scope, x: inf, y: 0, dependencies: [line0, circle0], visible: false })
            this.bike.FlatBar = new Segment({ scope: this.scope, p1: this.bike.Stem.p2, p2: this.bike.CurveStart })
            curve_r1 = this.GEOMETRY['barDrop'] * curveratio
        } else {
            this.bike.CurveStart = this.bike.Stem.p2
            curve_r1 = this.GEOMETRY['barReach']
        }
        curve_r2 = this.GEOMETRY['barDrop'] - curve_r1

        this.bike.ShifterAxle = new Point({ scope: this.scope, x: this.bike.CurveStart.x, y: this.bike.CurveStart.y + curve_r1, dependencies: [this.bike.CurveStart], visible: false })
        let circle0 = new Circle({ scope: this.scope, center: this.bike.ShifterAxle, radius: curve_r1, visible: false })
        let r1 = circle0
        let line0 = h_line(this.scope, this.bike.ShifterAxle, false)
        let point1 = new Point({ scope: this.scope, x: inf, y: 0, dependencies: [circle0, line0], visible: false })
        let arc0 = new Arc({ scope: this.scope, center: this.bike.ShifterAxle, point: point1, fromAngle: -90, toAngle: 0 })

        let point2 = new Point({ scope: this.scope, x: this.bike.CurveStart.x + curve_r1 - curve_r2, y: this.bike.CurveStart.y + curve_r1, dependencies: [this.bike.CurveStart], visible: false })
        let circle1 = new Circle({ scope: this.scope, center: point2, radius: curve_r2, visible: false })
        let line1 = v_line(this.scope, point2, false)
        point1 = new Point({ scope: this.scope, x: inf, y: inf, dependencies: [circle1, line1], visible: false })
        let arc1 = new Arc({ scope: this.scope, center: point2, point: point1, fromAngle: 0, toAngle: 90 })

        line0 = h_line(this.scope, point1, false)
        point2 = new Point({ scope: this.scope, x: 0, y: 0, dependencies: [line0, this.bike.HeadTubeLine], visible: false })
        var extra_l = distance(point1, point2) - 30 * this.scale

        if (extra_l > 0) {
            circle0 = new Circle({ scope: this.scope, center: point1, radius: extra_l, visible: false })
            point2 = new Point({ scope: this.scope, x: 0, y: 0, dependencies: [circle0, line0], visible: false })
            new Segment({ scope: this.scope, p1: point1, p2: point2 })
        }


        point2 = new Point({ scope: this.scope, x: this.bike.ShifterAxle.x + curve_r1 + this.GEOMETRY['shifterReach'], y: this.bike.ShifterAxle.y, dependencies: [this.bike.ShifterAxle], visible: false })
        arc1 = new Arc({ scope: this.scope, center: this.bike.ShifterAxle, point: point2, fromAngle: -45, toAngle: -10, visible: false })
        this.rider.Hands = new Point({ scope: this.scope, x: this.bike.ShifterAxle.x + curve_r1 * Math.cos(this.FIT['shifterAngle'] / 180 * Math.PI), y: this.bike.ShifterAxle.y - curve_r1 * Math.sin(this.FIT['shifterAngle'] / 180 * Math.PI), dependencies: [arc1], moveable: true })

        line0 = new Line({ scope: this.scope, p1: this.rider.Hands, p2: this.bike.ShifterAxle, visible: false })
        this.bike.ShifterClamp = new Point({ scope: this.scope, x: inf, y: 0, dependencies: [line0, r1], visible: false })
        this.bike.Shifter = new Segment({ scope: this.scope, p1: this.bike.ShifterClamp, p2: this.rider.Hands })
    }

    drawKinematics() {
        let KinematicScale = this.GEOMETRY['crankLen'] / 170

        let point0 = new Point({ scope: this.scope, x: this.bike.BottomBracket.x + 1215 * KinematicScale, y: this.bike.BottomBracket.y - 435 * KinematicScale, dependencies: [this.bike.BottomBracket], visible: false })
        let circle0 = new Circle({ scope: this.scope, center: point0, radius: 245 * KinematicScale, visible: false })
        let anchor = new Point({ scope: this.scope, x: point0.x - 490 * KinematicScale * Math.cos(45 / 180 * Math.PI), y: point0.y + 490 * KinematicScale * Math.sin(45 / 180 * Math.PI), dependencies: [point0], visible: false })
        let line0 = parallel(this.scope, this.bike.crankLine, point0, false)

        let point1 = new Point({ scope: this.scope, x: inf, y: 0, dependencies: [line0, circle0], visible: false })
        let line1 = angled_line(this.scope, point1, point0, 45, false)


        point1 = new Point({ scope: this.scope, x: inf, y: inf, dependencies: [line1, circle0], visible: false })
        let point2 = new Point({ scope: this.scope, x: 0, y: 0, dependencies: [line1, circle0], visible: false })
        line1 = v_line(this.scope, point1, false)

        let line2 = h_line(this.scope, point2, false)

        let line3 = h_line(this.scope, point1, false)

        let line4 = v_line(this.scope, point2, false)

        point1 = new Point({ scope: this.scope, x: 0, y: 0, dependencies: [line1, line2], visible: false })
        point2 = new Point({ scope: this.scope, x: 0, y: 0, dependencies: [line3, line4], visible: false })

        line1 = new Line({ scope: this.scope, p1: point1, p2: anchor, visible: false })
        line2 = new Line({ scope: this.scope, p1: point2, p2: anchor, visible: false })

        let circle1 = new Circle({ scope: this.scope, center: point1, radius: 980 * KinematicScale, visible: false })
        var circle2 = new Circle({ scope: this.scope, center: point2, radius: 980 * KinematicScale, visible: false })

        this.bike.KinematicPoint1 = new Point({ scope: this.scope, x: 0, y: inf, dependencies: [circle1, line1], visible: false })
        this.bike.KinematicPoint2 = new Point({ scope: this.scope, x: 0, y: inf, dependencies: [circle2, line2], visible: false })

    }

    DrawLeg(HipJoint, PedalSpindel, KinematicPoint, draw_angle = false, draw_vline = false) {
        let line0 = new Line({ scope: this.scope, p1: PedalSpindel, p2: this.bike.SteererRange.p2, visible: false })
        let circle0 = new Circle({ scope: this.scope, center: PedalSpindel, radius: this.ANTROPOMETRICS['soleHight'], visible: false })
        let Metatarsal = new Point({ scope: this.scope, x: 0, y: 0, dependencies: [circle0, line0], visible: false })

        // let Metatarsal = new Point({ scope: this.scope,  x: PedalSpindel.x, y: PedalSpindel.y - ANTROPOMETRICS['soleHight'], dependencies: [PedalSpindel], visible: false })

        // let FootLine = new Line({ scope: this.scope,  p1: KinematicPoint, p2: Metatarsal, visible: false })
        // let ToesLine = h_line(this.scope, Metatarsal, false)
        let ToesLine = new Line({ scope: this.scope, p1: KinematicPoint, p2: Metatarsal, visible: false })
        let FootLine = angled_line(this.scope, KinematicPoint, Metatarsal, -(180 - 15), false)

        circle0 = new Circle({ scope: this.scope, center: Metatarsal, radius: this.ANTROPOMETRICS['toes'], visible: false })
        let ToesEnd = new Point({ scope: this.scope, x: inf, y: 0, dependencies: [ToesLine, circle0], visible: false })
        new Segment({ scope: this.scope, p1: Metatarsal, p2: ToesEnd })

        circle0 = new Circle({ scope: this.scope, center: Metatarsal, radius: this.ANTROPOMETRICS['heelToMetatarsal'], visible: false })
        let Heel = new Point({ scope: this.scope, x: 0, y: 0, dependencies: [FootLine, circle0], visible: false })

        circle0 = new Circle({ scope: this.scope, center: Heel, radius: this.ANTROPOMETRICS['heelToAnkle'], visible: false })
        let circle1 = new Circle({ scope: this.scope, center: Metatarsal, radius: this.ANTROPOMETRICS['ankleToMetatarsal'], visible: false })
        let Ankle = new Point({ scope: this.scope, x: inf, y: 0, dependencies: [circle0, circle1], visible: false })

        new Segment({ scope: this.scope, p1: Heel, p2: Ankle })
        new Segment({ scope: this.scope, p1: Metatarsal, p2: Ankle })
        new Segment({ scope: this.scope, p1: Heel, p2: Metatarsal })

        let HipCircle = new Circle({ scope: this.scope, center: HipJoint, radius: this.ANTROPOMETRICS['hip'], visible: false })
        let LowerLegCircle = new Circle({ scope: this.scope, center: Ankle, radius: this.ANTROPOMETRICS['lowerLeg'], visible: false })
        let Knee = new Point({ scope: this.scope, x: inf, y: 0, dependencies: [HipCircle, LowerLegCircle], visible: false })

        new Segment({ scope: this.scope, p1: Ankle, p2: Knee })
        new Segment({ scope: this.scope, p1: HipJoint, p2: Knee })
        if (draw_angle)
            this.angles.KneeAngle = new Angle({ scope: this.scope, p1: Ankle, p2: Knee, p3: HipJoint, draw_segments: false })
        if (draw_vline) {
            line0 = v_line(this.scope, Knee, false)
            let point0 = new Point({ scope: this.scope, x: 0, y: inf, dependencies: [line0], visible: false })
            new Segment({ scope: this.scope, p1: Knee, p2: point0, dash: true, color: 'lightgrey' })
        }
    }

    drawLegs() {
        this.rider.HipJoint = new Point({ scope: this.scope, x: this.bike.Saddle.x - this.GEOMETRY['saddleLen'] / 8, y: this.bike.Saddle.y - this.ANTROPOMETRICS['hipJointOffset'], dependencies: [this.bike.Saddle], visible: false })
        this.DrawLeg(this.rider.HipJoint, this.bike.PedalSpindel_1, this.bike.KinematicPoint1, true, true)
        this.DrawLeg(this.rider.HipJoint, this.bike.PedalSpindel_2, this.bike.KinematicPoint2)
    }

    drawTorso() {
        let TorsoMax = new Point({ scope: this.scope, x: this.rider.HipJoint.x, y: this.rider.HipJoint.y - this.ANTROPOMETRICS['torsoMax'], dependencies: [this.rider.HipJoint], visible: false })

        let TorsoMid = new Point({ scope: this.scope, x: this.rider.HipJoint.x + this.ANTROPOMETRICS['torsoMid'] * Math.cos(this.ANTROPOMETRICS['torsoMidAngle'] / 180 * Math.PI), y: this.rider.HipJoint.y - this.ANTROPOMETRICS['torsoMid'] * Math.sin(this.ANTROPOMETRICS['torsoMidAngle'] / 180 * Math.PI), dependencies: [this.rider.HipJoint], visible: false })

        let TorsoMin = new Point({ scope: this.scope, x: this.rider.HipJoint.x + this.ANTROPOMETRICS['torsoMin'] * Math.cos(this.ANTROPOMETRICS['torsoMinAngle'] / 180 * Math.PI), y: this.rider.HipJoint.y - this.ANTROPOMETRICS['torsoMin'] * Math.sin(this.ANTROPOMETRICS['torsoMinAngle'] / 180 * Math.PI), dependencies: [this.rider.HipJoint], visible: false })

        // let ShoulderRange = new ArcThrough3Points({ scope: this.scope,  p1: TorsoMin, p2: TorsoMid, p3: TorsoMax, visible: false })

        var center_pos = ArcThrough3Points._circumcenter(this.scope, TorsoMin, TorsoMid, TorsoMax)
        let arc_center = new Point({ scope: this.scope, x: center_pos.x, y: center_pos.y, dependencies: [this.rider.HipJoint], visible: false })

        let shoulderCircle = new Circle({ scope: this.scope, center: arc_center, radius: distance(arc_center, TorsoMid), visible: false })

        let circle0 = new Circle({ scope: this.scope, center: this.rider.Hands, radius: (this.ANTROPOMETRICS['upperarm'] + this.ANTROPOMETRICS['forearm'] * 1.2) * 0.999, visible: false })
        let TorsoMaxValid = new Point({ scope: this.scope, x: 0, y: 0, dependencies: [circle0, shoulderCircle], visible: false })
        let temp = middle_perpendicular(this.scope, TorsoMaxValid, TorsoMin)
        let TorsoMidValid = new Point({ scope: this.scope, x: inf, y: temp.y, dependencies: [shoulderCircle, temp], visible: false })
        this.rider.ShoulderRange = new ArcThrough3Points({ scope: this.scope, p1: TorsoMaxValid, p2: TorsoMidValid, p3: TorsoMin, visible: false })

        this.rider.Shoulder = new Point({ scope: this.scope, x: this.rider.HipJoint.x + this.ANTROPOMETRICS['torsoMid'] * Math.cos(this.FIT['torsoAngle'] / 180 * Math.PI), y: this.rider.HipJoint.y - this.ANTROPOMETRICS['torsoMid'] * Math.sin(this.FIT['torsoAngle'] / 180 * Math.PI), dependencies: [this.rider.ShoulderRange], moveable: true })

        circle0 = new Circle({ scope: this.scope, center: this.rider.HipJoint, radius: this.ANTROPOMETRICS['torsoMax'] * 0.51, visible: false })
        let circle1 = new Circle({ scope: this.scope, center: this.rider.Shoulder, radius: this.ANTROPOMETRICS['torsoMax'] * 0.51, visible: false })
        let point0 = new Point({ scope: this.scope, x: 0, y: 0, dependencies: [circle0, circle1], visible: false })
        this.rider.Back = new ArcThrough3Points({ scope: this.scope, p1: this.rider.HipJoint, p2: point0, p3: this.rider.Shoulder })

    }

    drawArms() {
        let circle0 = new Circle({ scope: this.scope, center: this.rider.Shoulder, radius: this.ANTROPOMETRICS['upperarm'], visible: false })
        let circle1 = new Circle({ scope: this.scope, center: this.rider.Hands, radius: this.ANTROPOMETRICS['forearm'] * 1.2, visible: false })
        this.rider.Elbow = new Point({ scope: this.scope, x: 0, y: 0, dependencies: [circle0, circle1], visible: false })

        this.rider.Upperarm = new Segment({ scope: this.scope, p1: this.rider.Shoulder, p2: this.rider.Elbow })
        this.rider.Forearm = new Segment({ scope: this.scope, p1: this.rider.Elbow, p2: this.rider.Hands })
    }

    drawHead() {
        let line0 = new Line({ scope: this.scope, p1: this.rider.HipJoint, p2: this.rider.Shoulder, visible: false })
        let circle0 = new Circle({ scope: this.scope, center: this.rider.Shoulder, radius: this.ANTROPOMETRICS['neckLen'], visible: false })
        let point0 = new Point({ scope: this.scope, x: inf, y: 0, dependencies: [line0, circle0], visible: false })
        this.rider.Head = new Circle({ scope: this.scope, center: point0, radius: this.ANTROPOMETRICS['headR'] })
        point0 = new Point({ scope: this.scope, x: 0, y: inf, dependencies: [line0, this.rider.Head], visible: false })
        this.rider.Neck = new Segment({ scope: this.scope, p1: this.rider.Shoulder, p2: point0 })
    }
}