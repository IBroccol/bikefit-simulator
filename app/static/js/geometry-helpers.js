import {
    Figure,
    Point,
    Circle,
    CircleByCenterEdge,
    Line,
    Segment,
    Arc,
    ArcThrough3Points,
    Angle
} from './geometry-classes.js';

export function v_line(scope, anchor_point, visible = true, dash = false) {

    let p2 = new Point({
        scope: scope,
        x: anchor_point.x,
        y: anchor_point.y + 1,
        dependencies: [anchor_point],
        visible: false
    });

    let line = new Line({
        scope: scope,
        p1: anchor_point,
        p2: p2,
        visible: visible,
        dash: dash
    });
    return line;
}

export function h_line(scope, anchor_point, visible = true, dash = false) {

    let p2 = new Point({
        scope: scope,
        x: anchor_point.x + 1,
        y: anchor_point.y,
        dependencies: [anchor_point],
        visible: false
    });

    let line = new Line({
        scope: scope,
        p1: anchor_point,
        p2: p2,
        visible: visible,
        dash: dash
    });
    return line;
}

export function perpendicular(scope, line, anchor_point, visible = true, dash = false) {
    let circle0 = new Circle({ scope: scope, center: anchor_point, radius: 100, visible: false });
    let new_center1 = new Point({ scope: scope, x: anchor_point.x + 100, y: anchor_point.y + 100, dependencies: [line, circle0], visible: false })
    let circle1 = new Circle({ scope: scope, center: new_center1, radius: 200, visible: false })
    let new_center2 = new Point({ scope: scope, x: anchor_point.x - 100, y: anchor_point.y - 100, dependencies: [line, circle0], visible: false })
    let circle2 = new Circle({ scope: scope, center: new_center2, radius: 200, visible: false })
    let p1 = new Point({ scope: scope, x: 0, y: 0, dependencies: [circle1, circle2], visible: false })
    return new Line({ scope: scope, p1: p1, p2: anchor_point, visible: visible, dash: dash })
}

export function distance(p1, p2) {
    return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2)
}

export function parallel(scope, line, anchor_point, visible = true, dash = false) {
    let p1 = null
    let p2 = null
    if (distance(line.p1, anchor_point) < distance(line.p2, anchor_point)) {
        p1 = line.p1
        p2 = line.p2
    } else {
        p1 = line.p2
        p2 = line.p1
    }

    let circle0 = new CircleByCenterEdge({ scope: scope, center: anchor_point, edge: p2, visible: false })
    let circle1 = new CircleByCenterEdge({ scope: scope, center: p2, edge: anchor_point, visible: false })
    let point0 = new Point({ scope: scope, x: (anchor_point.x + p2.x) / 2 + 0.1 * (p2.y - anchor_point.y), y: (anchor_point.y + p2.y) / 2 - 0.1 * (p2.x - anchor_point.x), dependencies: [circle0, circle1], visible: false })
    let point1 = new Point({ scope: scope, x: (anchor_point.x + p2.x) / 2 - 0.1 * (p2.y - anchor_point.y), y: (anchor_point.y + p2.y) / 2 + 0.1 * (p2.x - anchor_point.x), dependencies: [circle0, circle1], visible: false })

    let line0 = new Line({ scope: scope, p1: point0, p2: point1, visible: false })
    let line1 = new Line({ scope: scope, p1: anchor_point, p2: p2, visible: false })
    point0 = new Point({ scope: scope, x: 0, y: 0, dependencies: [line0, line1], visible: false })
    line0 = new Line({ scope: scope, p1: p1, p2: point0, visible: false })
    circle0 = new CircleByCenterEdge({ scope: scope, center: point0, edge: p1, visible: false })
    point1 = new Point({ scope: scope, x: point0.x + 0.1 * (point0.x - p1.x), y: point0.y + 0.1 * (point0.y - p1.y), dependencies: [line0, circle0], visible: false })
    return new Line({ scope: scope, p1: anchor_point, p2: point1, visible: visible, dash: dash })
}

export function angled_line(scope, p1, p2, angleDeg, visible = true, dash = false) {
    let a = 100;
    let b = Math.sqrt(2 * a * a * (1 - Math.cos(angleDeg * (Math.PI / 180))))

    let circle0 = new Circle({ scope: scope, center: p2, radius: a, visible: false });
    let anchor = new Point({ scope: scope, x: 0, y: 0, dependencies: [circle0, new Line({ scope: scope, p1: p1, p2: p2, visible: false })], visible: false })
    anchor.update();
    let circle1 = new Circle({ scope: scope, center: anchor, radius: b, visible: false });

    let k = 1;
    if (angleDeg - 360 * Math.floor(angleDeg / 360) > 180) {
        k = -1;
    }

    let p3 = new Point({
        scope: scope,
        x: 2 * p2.x - anchor.x + 0.1 * (p2.y - anchor.y) * k,
        y: 2 * p2.y - anchor.y - 0.1 * (p2.x - anchor.x) * k,
        dependencies: [circle0, circle1],
        visible: false
    });

    return new Line({ scope: scope, p1: p2, p2: p3, visible: visible, dash: dash });
}

export function middle_perpendicular(scope, p1, p2) {
    let circle0 = new CircleByCenterEdge({ scope: scope, center: p1, edge: p2, visible: false })
    let circle1 = new CircleByCenterEdge({ scope: scope, center: p2, edge: p1, visible: false })

    let point0 = new Point({ scope: scope, x: (p1.x + p2.x) / 2 + 0.1 * (p2.y - p1.y), y: (p1.y + p2.y) / 2 - 0.1 * (p2.x - p1.x), dependencies: [circle0, circle1], visible: false })
    let point1 = new Point({ scope: scope, x: (p1.x + p2.x) / 2 - 0.1 * (p2.y - p1.y), y: (p1.y + p2.y) / 2 + 0.1 * (p2.x - p1.x), dependencies: [circle0, circle1], visible: false })
    return new Line({ scope: scope, p1: point0, p2: point1, visible: false })
}

export function middle(scope, p1, p2) {
    let line0 = middle_perpendicular(p1, p2)
    let line1 = new Line({ scope: scope, p1: p1, p2: p2, visible: false })
    return new Point({ scope: scope, x: 0, y: 0, dependencies: [line0, line1] })
}