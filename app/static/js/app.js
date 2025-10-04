import {
    inf,
    CANVAS_ID
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
    middle,
    distance,
} from './geometry-helpers.js';

class Drawer {
    constructor(GEOMETRY, ANTROPOMETRICS, FIT) {
        this.INIT_GEOMETRY = GEOMETRY;
        this.INIT_ANTROPOMETRICS = ANTROPOMETRICS;
        this.INIT_FIT = FIT;

        this.canvas = document.getElementById(CANVAS_ID);
        this.initializePaper();

        this.bike = {}
        this.rider = {}
        this.angles = {}
    }

    initializePaper() {
        paper.setup(CANVAS_ID);
    }

    blur() {
        this.canvas.style.filter = "blur(2.5px)"
    }

    unblur() {
        this.canvas.style.filter = "none";
    }

    draw() {
        this.clearCanvas();
        this.calculateScale();
        this.scaleData();
        this.drawBikeGeometry();
        this.drawRider();
        this.drawAngles();
        this.unblur();
    }

    calculateScale() {
        const canvas = document.getElementById(CANVAS_ID);
        const rect = canvas.getBoundingClientRect();
        this.width = rect.width;
        this.height = rect.height;
        this.scale = Math.min(this.width / 2000, this.height / 1750);
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

        //console.log(this)
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
        this.angles.ElbowAngle = new Angle({ p1: this.rider.Shoulder, p2: this.rider.Elbow, p3: this.rider.Hands, draw_segments: false, valid_range: [150, 160] })
        let line0 = h_line(this.rider.HipJoint, false)
        let point0 = new Point({ x: this.rider.Shoulder.x, y: this.rider.Shoulder.y, dependencies: [line0], visible: false })
        this.angles.TorsoAngle = new Angle({ p1: this.rider.Shoulder, p2: this.rider.HipJoint, p3: point0, valid_range: [38, 44], draw_segments: false })
        this.angles.ShoulderAngle = new Angle({ p1: this.rider.Hands, p2: this.rider.Shoulder, p3: this.rider.HipJoint, draw_segments: true, valid_range: [88, 92] })


        point0 = new Point({ x: this.bike.ShifterAxle.x + this.GEOMETRY['shifterReach'], y: this.bike.ShifterAxle.y, dependencies: [this.bike.ShifterAxle], visible: false })
        this.angles.ShifterAngle = new Angle({ p1: point0, p2: this.bike.ShifterAxle, p3: this.rider.Hands, draw_segments: false, visible: false })
    }

    clearCanvas() {
        paper.project.activeLayer.removeChildren();
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
        this.clearCanvas();
        this.draw();
    }

    drawFrame() {
        //console.log(this.GEOMETRY)
        const Rearx = (this.width - this.GEOMETRY['wheelbase']) / 2
        const BBx = Rearx + Math.sqrt((this.GEOMETRY['chainstay'] ** 2 - this.GEOMETRY['bbdrop'] ** 2))

        //---------Cranks--------
        this.bike.BottomBracket = new Point({ x: BBx, y: 1400 * this.scale, moveable: false })
        let circle0 = new Circle({ center: this.bike.BottomBracket, radius: this.GEOMETRY['crankLen'], visible: false })
        this.bike.PedalSpindel_1 = new Point({ x: inf, y: this.bike.BottomBracket.y, dependencies: [circle0], moveable: true })
        this.bike.crankLine = new Line({ p1: this.bike.BottomBracket, p2: this.bike.PedalSpindel_1, visible: false })
        this.bike.PedalSpindel_2 = new Point({ x: 0, y: this.bike.BottomBracket.y, dependencies: [this.bike.crankLine, circle0] })
        this.bike.Cranks = new Segment({ p1: this.bike.PedalSpindel_1, p2: this.bike.PedalSpindel_2 })

        //---------WheelAxes--------
        circle0 = new Circle({ center: this.bike.BottomBracket, radius: this.GEOMETRY['chainstay'], visible: false });
        let point0 = new Point({ x: this.bike.BottomBracket.x, y: this.bike.BottomBracket.y - this.GEOMETRY['bbdrop'], dependencies: [this.bike.BottomBracket], visible: false });
        let line0 = h_line(point0, false);
        this.bike.RearAxis = new Point({ x: 0, y: 0, dependencies: [circle0, line0], visible: false })
        circle0 = new Circle({ center: this.bike.RearAxis, radius: this.GEOMETRY['wheelbase'], visible: false });
        this.bike.FrontAxis = new Point({ x: inf, y: 0, dependencies: [circle0, line0], visible: false })

        //----------RearTubes----------
        point0 = new Point({ x: this.bike.BottomBracket.x - 100, y: this.bike.BottomBracket.y, dependencies: [this.bike.BottomBracket], visible: false })
        this.bike.SeatTubeLine = angled_line(point0, this.bike.BottomBracket, this.GEOMETRY['seatAngle'], false)

        circle0 = new Circle({ center: this.bike.BottomBracket, radius: this.GEOMETRY['chainstay'], visible: false })
        point0 = new Point({ x: 0, y: 0, dependencies: [circle0, this.bike.SeatTubeLine], visible: false })
        this.bike.SeatStay = new Segment({ p1: this.bike.RearAxis, p2: point0 })
        this.bike.Chainstay = new Segment({ p1: this.bike.BottomBracket, p2: this.bike.RearAxis })

        circle0 = new Circle({ center: this.bike.BottomBracket, radius: this.GEOMETRY['seatTube'], visible: false })
        this.bike.SeatTubeClamp = new Point({ x: 0, y: 0, dependencies: [this.bike.SeatTubeLine, circle0], visible: false })
        this.bike.SeatTube = new Segment({ p1: this.bike.BottomBracket, p2: this.bike.SeatTubeClamp })

        //-----FrontTubes-----
        line0 = v_line(this.bike.BottomBracket, false);
        circle0 = new Circle({ center: this.bike.BottomBracket, radius: this.GEOMETRY['stack'], visible: false });
        point0 = new Point({ x: 0, y: 0, dependencies: [line0, circle0], visible: false });

        line0 = perpendicular(line0, point0, false);
        circle0 = new Circle({ center: point0, radius: this.GEOMETRY['reach'], visible: false })
        let point1 = new Point({ x: inf, y: 0, dependencies: [line0, circle0], visible: false })

        this.bike.TopTube = new Segment({ p1: point1, p2: this.bike.SeatTube.p2 })
        this.bike.HeadTubeLine = angled_line(point0, point1, this.GEOMETRY['headAngle'], false)
        circle0 = new Circle({ center: point1, radius: this.GEOMETRY['headTube'], visible: false })
        point0 = new Point({ x: inf, y: inf, dependencies: [this.bike.HeadTubeLine, circle0], visible: false })
        this.bike.HeadTube = new Segment({ p1: point0, p2: point1 })
        this.bike.Fork = new Segment({ p1: point0, p2: this.bike.FrontAxis })
        this.bike.DownTube = new Segment({ p1: point0, p2: this.bike.BottomBracket })
    }

    drawSeatpost() {
        let circle0 = new Circle({ center: this.bike.SeatTubeClamp, radius: this.GEOMETRY['maxseatpostLen'], visible: false })
        let circle1 = new Circle({ center: this.bike.SeatTubeClamp, radius: this.GEOMETRY['minseatpostLen'], visible: false })
        this.bike.MaxSeat = new Point({ x: 0, y: 0, dependencies: [this.bike.SeatTubeLine, circle0], visible: false })
        this.bike.MinSeat = new Point({ x: 0, y: 0, dependencies: [this.bike.SeatTubeLine, circle1], visible: false })
        this.bike.SeatpostRange = new Segment({ p1: this.bike.MinSeat, p2: this.bike.MaxSeat, visible: false })
        this.bike.SeatpostTop = new Point({ x: this.bike.BottomBracket.x - (this.FIT['seatHight'] - this.GEOMETRY['saddleHeight']) * Math.cos(this.GEOMETRY['seatAngle'] / 180 * Math.PI), y: this.bike.BottomBracket.y - (this.FIT['seatHight'] - this.GEOMETRY['saddleHeight']) * Math.sin(this.GEOMETRY['seatAngle'] / 180 * Math.PI), dependencies: [this.bike.SeatpostRange], moveable: true })
        this.bike.Setpost = new Segment({ p1: this.bike.SeatTubeClamp, p2: this.bike.SeatpostTop })

        let point2 = new Point({ x: this.bike.SeatpostTop.x, y: this.bike.SeatpostTop.y - this.GEOMETRY['saddleHeight'], dependencies: [this.bike.SeatpostTop], visible: false })

        let point0 = new Point({ x: point2.x - this.GEOMETRY['saddleRailLen'] / 2, y: point2.y, dependencies: [point2], visible: false })
        let point1 = new Point({ x: point2.x + this.GEOMETRY['saddleRailLen'] / 2, y: point2.y, dependencies: [point2], visible: false })
        this.bike.SaddleRange = new Segment({ p1: point0, p2: point1, visible: false })
        this.bike.Saddle = new Point({ x: point2.x + this.FIT['saddleOffset'], y: point2.y, dependencies: [this.bike.SaddleRange], moveable: true })

        circle0 = new Circle({ center: this.bike.Saddle, radius: this.GEOMETRY['saddleLen'] / 2, visible: false })
            // point0 = new Point({ x: 0, y: 0, dependencies: [circle0], visible: false })
            // arc0 = new Arc({ center: Saddle, point: point0, fromAngle: 10, toAngle: -10, visible: false })
            // let SaddleNose = new Point({ x: Saddle.x + Math.cos(FIT['saddleAngle'] / 180 * Math.PI), y: Saddle.y - Math.sin(FIT['saddleAngle'] / 180 * Math.PI), dependencies: [circle0], moveable: true })
            // let SaddleLine = new Line({ p1: SaddleNose, p2: Saddle, visible: false })
        this.bike.SaddleLine = h_line(this.bike.Saddle, false)
        this.bike.SaddleNose = new Point({ x: inf, y: 0, dependencies: [circle0, this.bike.SaddleLine], visible: false })
        this.bike.SaddleBack = new Point({ x: 0, y: 0, dependencies: [circle0, this.bike.SaddleLine], visible: false })
        this.bike.SaddleTop = new Segment({ p1: this.bike.SaddleBack, p2: this.bike.SaddleNose })
        circle0 = new Circle({ center: this.bike.SaddleBack, radius: this.GEOMETRY['saddleLen'] * 0.35, visible: false })
        circle1 = new Circle({ center: this.bike.SaddleNose, radius: this.GEOMETRY['saddleLen'] * 0.7, visible: false })
        point0 = new Point({ x: 0, y: inf, dependencies: [circle0, circle1], visible: false })
        new Segment({ p1: this.bike.SaddleBack, p2: point0 })
        new Segment({ p1: this.bike.SaddleNose, p2: point0 })
    }

    drawWheels() {
        this.bike.RearRim = new Circle({ center: this.bike.RearAxis, radius: this.GEOMETRY['rimD'] / 2 })
        this.bike.RearTyre = new Circle({ center: this.bike.RearAxis, radius: this.GEOMETRY['rimD'] / 2 + this.GEOMETRY['tyreW'] })

        this.bike.FrontRim = new Circle({ center: this.bike.FrontAxis, radius: this.GEOMETRY['rimD'] / 2 })
        this.bike.FrontTyre = new Circle({ center: this.bike.FrontAxis, radius: this.GEOMETRY['rimD'] / 2 + this.GEOMETRY['tyreW'] })
    }

    drawStem() {
        let circle0 = new Circle({ center: this.bike.TopTube.p1, radius: this.GEOMETRY['maxStemHight'], visible: false })
        let point0 = new Point({ x: 0, y: 0, dependencies: [this.bike.HeadTubeLine, circle0], visible: false })
        circle0 = new Circle({ center: this.bike.TopTube.p1, radius: this.GEOMETRY['minStemHight'], visible: false })
        let point1 = new Point({ x: 0, y: 0, dependencies: [this.bike.HeadTubeLine, circle0], visible: false })

        this.bike.SteererRange = new Segment({ p1: point1, p2: point0, visible: false })
        point0 = new Point({ x: this.bike.TopTube.p1.x - this.FIT['stemHight'] * Math.cos(this.GEOMETRY['headAngle'] / 180 * Math.PI), y: this.bike.TopTube.p1.y - this.FIT['stemHight'] * Math.sin(this.GEOMETRY['headAngle'] / 180 * Math.PI), dependencies: [this.bike.SteererRange], moveable: true })
        this.bike.StemLine = angled_line(this.bike.TopTube.p1, point0, -(90 + this.GEOMETRY['stemAngle']), false)
        circle0 = new Circle({ center: point0, radius: this.GEOMETRY['stemLen'], visible: false })
        point1 = new Point({ x: inf, y: 0, dependencies: [this.bike.StemLine, circle0], visible: false })
        this.bike.Stem = new Segment({ p1: point0, p2: point1 })
        this.bike.Steerer = new Segment({ p1: this.bike.TopTube.p1, p2: this.bike.Stem.p1 })

    }

    drawHandlebars() {
        this.bike.CurveStart = null
        const curveratio = 0.25
        var curve_r1 = null
        var curve_r2 = null
        if (this.GEOMETRY['barReach'] > this.GEOMETRY['barDrop'] * curveratio) {
            let line0 = h_line(this.bike.Stem.p2, false)
            let circle0 = new Circle({ center: this.bike.Stem.p2, radius: this.GEOMETRY['barReach'] - this.GEOMETRY['barDrop'] * curveratio, visible: false })
            this.bike.CurveStart = new Point({ x: inf, y: 0, dependencies: [line0, circle0], visible: false })
            this.bike.FlatBar = new Segment({ p1: this.bike.Stem.p2, p2: this.bike.CurveStart })
            curve_r1 = this.GEOMETRY['barDrop'] * curveratio
        } else {
            this.bike.CurveStart = this.bike.Stem.p2
            curve_r1 = this.GEOMETRY['barReach']
        }
        curve_r2 = this.GEOMETRY['barDrop'] - curve_r1

        this.bike.ShifterAxle = new Point({ x: this.bike.CurveStart.x, y: this.bike.CurveStart.y + curve_r1, dependencies: [this.bike.CurveStart], visible: false })
        let circle0 = new Circle({ center: this.bike.ShifterAxle, radius: curve_r1, visible: false })
        let r1 = circle0
        let line0 = h_line(this.bike.ShifterAxle, false)
        let point1 = new Point({ x: inf, y: 0, dependencies: [circle0, line0], visible: false })
        let arc0 = new Arc({ center: this.bike.ShifterAxle, point: point1, fromAngle: -90, toAngle: 0 })

        let point2 = new Point({ x: this.bike.CurveStart.x + curve_r1 - curve_r2, y: this.bike.CurveStart.y + curve_r1, dependencies: [this.bike.CurveStart], visible: false })
        let circle1 = new Circle({ center: point2, radius: curve_r2, visible: false })
        let line1 = v_line(point2, false)
        point1 = new Point({ x: inf, y: inf, dependencies: [circle1, line1], visible: false })
        let arc1 = new Arc({ center: point2, point: point1, fromAngle: 0, toAngle: 90 })

        line0 = h_line(point1, false)
        point2 = new Point({ x: 0, y: 0, dependencies: [line0, this.bike.HeadTubeLine], visible: false })
        var extra_l = distance(point1, point2) - 30 * this.scale

        if (extra_l > 0) {
            circle0 = new Circle({ center: point1, radius: extra_l, visible: false })
            point2 = new Point({ x: 0, y: 0, dependencies: [circle0, line0], visible: false })
            new Segment({ p1: point1, p2: point2 })
        }


        point2 = new Point({ x: this.bike.ShifterAxle.x + curve_r1 + this.GEOMETRY['shifterReach'], y: this.bike.ShifterAxle.y, dependencies: [this.bike.ShifterAxle], visible: false })
        arc1 = new Arc({ center: this.bike.ShifterAxle, point: point2, fromAngle: -45, toAngle: -10, visible: false })
        this.rider.Hands = new Point({ x: this.bike.ShifterAxle.x + curve_r1 * Math.cos(this.FIT['shifterAngle'] / 180 * Math.PI), y: this.bike.ShifterAxle.y - curve_r1 * Math.sin(this.FIT['shifterAngle'] / 180 * Math.PI), dependencies: [arc1], moveable: true })

        line0 = new Line({ p1: this.rider.Hands, p2: this.bike.ShifterAxle, visible: false })
        this.bike.ShifterClamp = new Point({ x: inf, y: 0, dependencies: [line0, r1], visible: false })
        this.bike.Shifter = new Segment({ p1: this.bike.ShifterClamp, p2: this.rider.Hands })
    }

    drawKinematics() {
        let KinematicScale = this.scale * this.GEOMETRY['crankLen'] / 170

        let point0 = new Point({ x: this.bike.BottomBracket.x + 4200 * KinematicScale, y: this.bike.BottomBracket.y - 1500 * KinematicScale, dependencies: [this.bike.BottomBracket], visible: false })
        let circle0 = new Circle({ center: point0, radius: 850 * KinematicScale, visible: false })
        let anchor = new Point({ x: point0.x - 1700 * KinematicScale * Math.cos(45 / 180 * Math.PI), y: point0.y + 1700 * KinematicScale * Math.sin(45 / 180 * Math.PI), dependencies: [point0], visible: false })
        let line0 = parallel(this.bike.crankLine, point0, false)

        let point1 = new Point({ x: inf, y: 0, dependencies: [line0, circle0], visible: false })
        let line1 = angled_line(point1, point0, 45, false)


        point1 = new Point({ x: inf, y: inf, dependencies: [line1, circle0], visible: false })
        let point2 = new Point({ x: 0, y: 0, dependencies: [line1, circle0], visible: false })
        line1 = v_line(point1, false)

        let line2 = h_line(point2, false)

        let line3 = h_line(point1, false)

        let line4 = v_line(point2, false)

        point1 = new Point({ x: 0, y: 0, dependencies: [line1, line2], visible: false })
        point2 = new Point({ x: 0, y: 0, dependencies: [line3, line4], visible: false })

        line1 = new Line({ p1: point1, p2: anchor, visible: false })
        line2 = new Line({ p1: point2, p2: anchor, visible: false })

        let circle1 = new Circle({ center: point1, radius: 3400 * KinematicScale, visible: false })
        var circle2 = new Circle({ center: point2, radius: 3400 * KinematicScale, visible: false })

        this.bike.KinematicPoint1 = new Point({ x: 0, y: inf, dependencies: [circle1, line1], visible: false })
        this.bike.KinematicPoint2 = new Point({ x: 0, y: inf, dependencies: [circle2, line2], visible: false })

    }

    DrawLeg(HipJoint, PedalSpindel, KinematicPoint, draw_angle = false, draw_vline = false) {
        let line0 = new Line({ p1: PedalSpindel, p2: this.bike.SteererRange.p2, visible: false })
        let circle0 = new Circle({ center: PedalSpindel, radius: this.ANTROPOMETRICS['soleHight'], visible: false })
        let Metatarsal = new Point({ x: 0, y: 0, dependencies: [circle0, line0], visible: false })

        // let Metatarsal = new Point({ x: PedalSpindel.x, y: PedalSpindel.y - ANTROPOMETRICS['soleHight'], dependencies: [PedalSpindel], visible: false })

        // let FootLine = new Line({ p1: KinematicPoint, p2: Metatarsal, visible: false })
        // let ToesLine = h_line(Metatarsal, false)
        let ToesLine = new Line({ p1: KinematicPoint, p2: Metatarsal, visible: false })
        let FootLine = angled_line(KinematicPoint, Metatarsal, -(180 - 15), false)

        circle0 = new Circle({ center: Metatarsal, radius: this.ANTROPOMETRICS['toes'], visible: false })
        let ToesEnd = new Point({ x: inf, y: 0, dependencies: [ToesLine, circle0], visible: false })
        new Segment({ p1: Metatarsal, p2: ToesEnd })

        circle0 = new Circle({ center: Metatarsal, radius: this.ANTROPOMETRICS['heelToMetatarsal'], visible: false })
        let Heel = new Point({ x: 0, y: 0, dependencies: [FootLine, circle0], visible: false })

        circle0 = new Circle({ center: Heel, radius: this.ANTROPOMETRICS['heelToAnkle'], visible: false })
        let circle1 = new Circle({ center: Metatarsal, radius: this.ANTROPOMETRICS['ankleToMetatarsal'], visible: false })
        let Ankle = new Point({ x: inf, y: 0, dependencies: [circle0, circle1], visible: false })

        new Segment({ p1: Heel, p2: Ankle })
        new Segment({ p1: Metatarsal, p2: Ankle })
        new Segment({ p1: Heel, p2: Metatarsal })

        let HipCircle = new Circle({ center: HipJoint, radius: this.ANTROPOMETRICS['hip'], visible: false })
        let LowerLegCircle = new Circle({ center: Ankle, radius: this.ANTROPOMETRICS['lowerLeg'], visible: false })
        let Knee = new Point({ x: inf, y: 0, dependencies: [HipCircle, LowerLegCircle], visible: false })

        new Segment({ p1: Ankle, p2: Knee })
        new Segment({ p1: HipJoint, p2: Knee })
        if (draw_angle)
            this.angles.KneeAngle = new Angle({ p1: Ankle, p2: Knee, p3: HipJoint, draw_segments: false })
        if (draw_vline) {
            line0 = v_line(Knee, false)
            let point0 = new Point({ x: 0, y: inf, dependencies: [line0], visible: false })
            new Segment({ p1: Knee, p2: point0, dash: true, color: 'lightgrey' })
        }
    }

    drawLegs() {
        this.rider.HipJoint = new Point({ x: this.bike.Saddle.x - this.GEOMETRY['saddleLen'] / 8, y: this.bike.Saddle.y - this.ANTROPOMETRICS['hipJointOffset'], dependencies: [this.bike.Saddle], visible: false })
        this.DrawLeg(this.rider.HipJoint, this.bike.PedalSpindel_1, this.bike.KinematicPoint1, true, true)
        this.DrawLeg(this.rider.HipJoint, this.bike.PedalSpindel_2, this.bike.KinematicPoint2)
    }

    drawTorso() {
        let TorsoMax = new Point({ x: this.rider.HipJoint.x, y: this.rider.HipJoint.y - this.ANTROPOMETRICS['torsoMax'], dependencies: [this.rider.HipJoint], visible: false })

        let TorsoMid = new Point({ x: this.rider.HipJoint.x + this.ANTROPOMETRICS['torsoMid'] * Math.cos(this.ANTROPOMETRICS['torsoMidAngle'] / 180 * Math.PI), y: this.rider.HipJoint.y - this.ANTROPOMETRICS['torsoMid'] * Math.sin(this.ANTROPOMETRICS['torsoMidAngle'] / 180 * Math.PI), dependencies: [this.rider.HipJoint], visible: false })

        let TorsoMin = new Point({ x: this.rider.HipJoint.x + this.ANTROPOMETRICS['torsoMin'] * Math.cos(this.ANTROPOMETRICS['torsoMinAngle'] / 180 * Math.PI), y: this.rider.HipJoint.y - this.ANTROPOMETRICS['torsoMin'] * Math.sin(this.ANTROPOMETRICS['torsoMinAngle'] / 180 * Math.PI), dependencies: [this.rider.HipJoint], visible: false })

        // let ShoulderRange = new ArcThrough3Points({ p1: TorsoMin, p2: TorsoMid, p3: TorsoMax, visible: false })

        var center_pos = ArcThrough3Points._circumcenter(TorsoMin, TorsoMid, TorsoMax)
        let arc_center = new Point({ x: center_pos.x, y: center_pos.y, dependencies: [this.rider.HipJoint], visible: false })

        function arc_angle(arc_center, point) {
            let Angle = null
            if (point.x != arc_center.x) {
                Angle = Math.atan(Math.abs((point.y - arc_center.y) / (point.x - arc_center.x))) * 180 / Math.PI
            } else
                Angle = 0

            if ((point.x - arc_center.x) > 0) {
                if ((point.y - arc_center.y) <= 0) //I четверть
                    Angle = Angle
                else //IV четверть
                    Angle = -Angle
            } else {
                if ((point.y - arc_center.y) <= 0) //II четверть
                    Angle = 180 - Angle
                else //III четверть
                    Angle = Angle - 180
            }
            return Angle
        }

        this.rider.ShoulderRange = new Arc({ center: arc_center, point: TorsoMid, fromAngle: -arc_angle(arc_center, TorsoMax), toAngle: -arc_angle(arc_center, TorsoMin), visible: false })


        this.rider.Shoulder = new Point({ x: this.rider.HipJoint.x + this.ANTROPOMETRICS['torsoMid'] * Math.cos(this.FIT['torsoAngle'] / 180 * Math.PI), y: this.rider.HipJoint.y - this.ANTROPOMETRICS['torsoMid'] * Math.sin(this.FIT['torsoAngle'] / 180 * Math.PI), dependencies: [this.rider.ShoulderRange], moveable: true })

        let circle0 = new Circle({ center: this.rider.HipJoint, radius: this.ANTROPOMETRICS['torsoMax'] * 0.51, visible: false })
        let circle1 = new Circle({ center: this.rider.Shoulder, radius: this.ANTROPOMETRICS['torsoMax'] * 0.51, visible: false })
        let point0 = new Point({ x: 0, y: 0, dependencies: [circle0, circle1], visible: false })
        this.rider.Back = new ArcThrough3Points({ p1: this.rider.HipJoint, p2: point0, p3: this.rider.Shoulder })

    }

    drawArms() {
        let circle0 = new Circle({ center: this.rider.Shoulder, radius: this.ANTROPOMETRICS['upperarm'], visible: false })
        let circle1 = new Circle({ center: this.rider.Hands, radius: this.ANTROPOMETRICS['forearm'], visible: false })
        this.rider.Elbow = new Point({ x: 0, y: 0, dependencies: [circle0, circle1], visible: false })

        this.rider.Upperarm = new Segment({ p1: this.rider.Shoulder, p2: this.rider.Elbow })
        this.rider.Forearm = new Segment({ p1: this.rider.Elbow, p2: this.rider.Hands })

        // if (this.rider.Elbow.y == 0) {
        //     this.rider.Elbow.hide(true)
        //     console.log(this.rider.Elbow)
        // }
    }

    drawHead() {
        let line0 = new Line({ p1: this.rider.HipJoint, p2: this.rider.Shoulder, visible: false })
        let circle0 = new Circle({ center: this.rider.Shoulder, radius: this.ANTROPOMETRICS['neckLen'], visible: false })
        let point0 = new Point({ x: inf, y: 0, dependencies: [line0, circle0], visible: false })
        this.rider.Head = new Circle({ center: point0, radius: this.ANTROPOMETRICS['headR'] })
        point0 = new Point({ x: 0, y: inf, dependencies: [line0, this.rider.Head], visible: false })
        this.rider.Neck = new Segment({ p1: this.rider.Shoulder, p2: point0 })
    }
}

class Interface {
    constructor(user_id) {
        this.user_id = user_id
        this.cur_bike_id = null;
        this.cur_fit_name = null;

        this.drawer = new Drawer()

        this.bikeSearch = document.getElementById("bikeSearch")
        this.bikeList = document.getElementById("bikeList")
        this.sizeSelect = document.querySelector("select")

        this.fitSearch = document.getElementById("fitSearch")
        this.fitList = document.getElementById("fitList")

        this.fitInput = document.getElementById("fitInput")
        this.saveButton = document.getElementById("saveBtn")

        this.resetButton = document.getElementById("resetBtn")

        //console.log(this.resetButton)
        this.setupEventListeners()
        this.getAnthro(this.user_id)
    }

    setupEventListeners() {
        this.saveButton.addEventListener("click", () => this.saveFit());
        this.resetButton.addEventListener("click", () => this.drawer.reset());

        this.bikeSearch.addEventListener("focus", async() => {
            const savedBikes = await this.fetchBikes();
            this.renderAutocompleteList(this.bikeList, savedBikes, this.bikeSearch, this.onBikeChoise.bind(this));
        });
        this.setupAutocompleteHide(this.bikeList, this.bikeSearch);



        this.sizeSelect.addEventListener("change", () => {
            const size = this.sizeSelect.value;
            if (size !== "Select size") {
                this.onSizeChoise(size);
            } else {
                this.drawer.clearCanvas()
                this.fitSearch.value = ""
            }
        });

        this.fitSearch.addEventListener("focus", async() => {
            const savedFits = await this.fetchFits();
            this.renderAutocompleteList(this.fitList, savedFits, this.fitSearch, this.onFitChoise.bind(this));
        });
        this.setupAutocompleteHide(this.fitList, this.fitSearch);
    }

    async fetchSizes(bike_model) {
        try {
            const response = await fetch('/bikes/sizes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bike_model })
            });

            if (!response.ok) throw new Error("Ошибка при получении размеров");
            return await response.json(); // ожидается массив размеров
        } catch (error) {
            console.error("Ошибка:", error);
            return [];
        }
    }

    renderSizeOptions(sizes) {
        this.sizeSelect.innerHTML = '<option>Select size</option>';
        sizes.forEach(size => {
            const opt = document.createElement("option");
            opt.value = size;
            opt.textContent = size;
            this.sizeSelect.appendChild(opt);
        });
    }

    async onSizeChoise(size) {
        this.cur_size = size
        this.drawer.blur()
            //console.log("Выбран размер:", size);
        let bike_id = await this.fetchBikeId()
            //console.log("bike_id:", bike_id)
        const bike_geo = await this.getBikeGeo(bike_id)
        this.drawer.INIT_GEOMETRY = bike_geo
        if (bike_id != this.cur_bike_id) {
            this.fitSearch.value = ""
            this.fitInput.value = ""
        }
        this.cur_bike_id = bike_id
            //console.log(bike_geo)

        this.drawer.INIT_FIT = await this.getBasicFitData(this.user_id, bike_id)
        this.drawer.draw()
    }

    async fetchBikeId() {
        try {
            const response = await fetch('/bikes/id', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bike_model: this.cur_bike_model, size: this.cur_size })
            });

            if (!response.ok) throw new Error("Ошибка при получении данных");
            return await response.json();
        } catch (error) {
            console.error("Ошибка:", error);
            return [];
        }
    }

    async fetchBikes() {
        try {
            console.log('bikes/list')
            const response = await fetch('/bikes/list', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: this.user_id })
            });

            if (!response.ok) throw new Error("Ошибка при получении данных");
            return await response.json();
        } catch (error) {
            console.error("Ошибка:", error);
            return [];
        }
    }

    async fetchFits() {
        if (this.cur_bike_id === null) {
            console.error("Ошибка: не выбран велосипед");
            return [];
        }
        try {
            const response = await fetch('/fits/list', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: this.user_id, bike_id: this.cur_bike_id })
            });

            if (!response.ok) throw new Error("Ошибка при получении данных");
            return await response.json();
        } catch (error) {
            console.error("Ошибка:", error);
            return [];
        }
    }

    renderAutocompleteList(list, items, input, click_fun) {
        list.innerHTML = "";
        items.forEach(item => {
            const listItem = document.createElement("div");
            listItem.textContent = item;
            listItem.classList.add("autocomplete-item");

            listItem.addEventListener("mousedown", async(event) => {
                input.value = item;
                list.style.display = "none";
                await click_fun(item)
            });

            list.appendChild(listItem);
        });
        list.style.display = items.length ? "block" : "none";
    }

    setupAutocompleteHide(list, input) {
        document.addEventListener("mousedown", (e) => {
            if (!input.contains(e.target) && !list.contains(e.target)) {
                list.style.display = "none";
            }
        });
    }

    async saveFit() {
        const name = this.fitInput.value.trim();

        if (!name) {
            alert("Введите название посадки перед сохранением!");
            document.getElementById("fit-name").focus();
            return;
        }

        const fitSettings = this.getFitSettings();
        fitSettings.name = name;

        //console.log(fitSettings)

        try {
            const response = await fetch("/fits/save", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ user_id: USER_ID, ...fitSettings })
            });

            var data = await response.json()

            if (data.success) {
                alert("Настройки успешно сохранены!");
            } else {
                alert("Ошибка при сохранении!");
            }
        } catch (error) {
            console.error("Ошибка:", error);
        }
        this.fitInput.value = ""
    }

    async getBikeGeo(bike_id) {
        try {
            const response = await fetch('/bikes/geo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bike_id: bike_id })
            });

            if (response.ok) return await response.json();
            throw new Error('Ошибка при получении данных');
        } catch (error) {
            console.error('Ошибка:', error);
            throw error;
        }
    }

    async getFitData(fit_name, bike_id) {
        try {
            const response = await fetch('/fits/get', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fit_name: fit_name, bike_id: bike_id })
            });

            if (response.ok) return await response.json();
            throw new Error('Ошибка при получении данных');
        } catch (error) {
            console.error('Ошибка:', error);
            throw error;
        }
    }

    async getBasicFitData(user_id, bike_id) {
        try {
            const response = await fetch('/fits/basic', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: user_id, bike_id: bike_id })
            });

            if (response.ok) return await response.json();
            throw new Error('Ошибка при получении данных');
        } catch (error) {
            console.error('Ошибка:', error);
            throw error;
        }
    }

    async onBikeChoise(bike_model) {
        //console.log(bike_model)
        const sizes = await this.fetchSizes(bike_model);
        this.renderSizeOptions(sizes);
        if (bike_model != this.cur_bike_model)
            this.drawer.clearCanvas()
        this.cur_bike_model = bike_model

    }

    async onFitChoise(fit_name) {
        this.drawer.blur()
        const fit_data = await this.getFitData(fit_name, this.cur_bike_id)
        this.drawer.INIT_FIT = fit_data
        this.cur_fit_name = fit_name
            //console.log(fit_data)
        this.drawer.draw()
    }

    async getAnthro(user_id) {
        try {
            const response = await fetch('/fits/anthro', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id, user_id })
            });

            if (response.ok) {
                this.drawer.INIT_ANTROPOMETRICS = await response.json();
                //console.log(this.drawer.INIT_ANTROPOMETRICS)
            } else
                throw new Error('Ошибка при получении данных');
        } catch (error) {
            console.error('Ошибка:', error);
            throw error;
        }
    }

    getFitSettings() {
        //console.log(this)
        var fitSettings = {
            bike_id: this.cur_bike_id,
            seatHight: distance(this.drawer.bike.BottomBracket, this.drawer.bike.SeatpostTop) / this.drawer.scale + this.drawer.INIT_GEOMETRY['saddleHeight'],
            stemHight: distance(this.drawer.bike.TopTube.p1, this.drawer.bike.Stem.p1) / this.drawer.scale,
            saddleOffset: (this.drawer.bike.Saddle.x - this.drawer.bike.SeatpostTop.x) / this.drawer.scale,
            torsoAngle: this.drawer.angles.TorsoAngle.value,
            shifterAngle: this.drawer.angles.ShifterAngle.value
        };

        return fitSettings
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const INTERFACE = new Interface(USER_ID);
});