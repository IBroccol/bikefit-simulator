const scale = 1

import { MAXSTEP } from './constants.js';

export class Figure {
    static allFigures = [];
    MAXSTEP = MAXSTEP

    constructor(id, color = null, visible = true, moveable = false, dependencies = [], hidden = false) {
        this.id = id;
        this.color = color ? color : (moveable ? 'blue' : 'grey');
        this.visible = visible;
        this.hidden = hidden;
        this.moveable = moveable;
        this.dependencies = dependencies;
        this.dependents = [];

        let any_dep_hidden = false
        for (let dep of this.dependencies) {
            dep.dependents.push(this);
            any_dep_hidden = any_dep_hidden || dep.hidden
        }
        this.hide(this.hidden || any_dep_hidden)

        // this.shape создаётся только в наследниках, если реально нужен графический объект
        this.shape = null;
        Figure.allFigures.push(this)
    }

    update_dependents() {
        for (let dep of this.dependents) {
            dep.update();
        }
    }

    hide(hidden) {
        if (hidden === null) return;

        let changed = false;
        if (!hidden) {
            let anyDependencyHidden = false;
            for (let dep of this.dependencies) {
                if (dep.hidden) {
                    anyDependencyHidden = true;
                    break;
                }
            }
            changed = this.hidden !== (this.hidden = anyDependencyHidden || hidden);
        } else {
            changed = this.hidden !== hidden;
            this.hidden = hidden;
        }

        if (this.shape) {
            this.shape.visible = this.visible && !this.hidden;
        }


        if (changed) {
            for (let dep of this.dependents) {
                dep.hide(this.hidden);
            }
        }
    }

    update() {
        if (this.shape) {
            this.shape.visible = this.visible && !this.hidden;
        }
    }

    set_color(color) {
        this.color = color
        if (this.shape) {
            this.shape.strokeColor = this.color;
        }
    }

    move(_targetPoint) {}

    closest_valid(point) {
        return point;
    }

    static intersection(f1, f2, lastPos) {
        const EPS = 1e-9;
        const isCircle = f => (f instanceof Circle) || (f instanceof CircleByCenterEdge);
        const isLine = f => (f instanceof Line);
        const isSeg = f => (f instanceof Segment);

        function circleGeom(fig) {
            if (fig instanceof Circle) {
                return { cx: fig.center.x, cy: fig.center.y, r: fig.radius };
            }
            if (fig instanceof CircleByCenterEdge) {
                const cx = fig.center.x,
                    cy = fig.center.y;
                const r = Math.hypot(fig.edge.x - cx, fig.edge.y - cy);
                return { cx, cy, r };
            }
            return null;
        }

        function lineGeom(fig) {
            return {
                x1: fig.p1.x,
                y1: fig.p1.y,
                x2: fig.p2.x,
                y2: fig.p2.y,
                isSegment: isSeg(fig)
            };
        }

        // ---- Circle ⨯ Circle ----
        if (isCircle(f1) && isCircle(f2)) {
            const C1 = circleGeom(f1),
                C2 = circleGeom(f2);
            if (!C1 || !C2) return [];
            const dx = C2.cx - C1.cx,
                dy = C2.cy - C1.cy;
            const d = Math.hypot(dx, dy);
            const r1 = C1.r,
                r2 = C2.r;

            // нет пересечений или совпадающие центры
            if (d < EPS || d > r1 + r2 + EPS || d < Math.abs(r1 - r2) - EPS) return [];

            // точка(и) пересечения
            const a = (r1 * r1 - r2 * r2 + d * d) / (2 * d);
            const h2 = Math.max(0, r1 * r1 - a * a);
            const h = Math.sqrt(h2);

            const px = C1.cx + (a * dx) / d;
            const py = C1.cy + (a * dy) / d;

            if (h < EPS) {
                return [new paper.Point(px, py)]; // касание
            }
            return [
                new paper.Point(px + h * (-dy) / d, py + h * (dx) / d),
                new paper.Point(px - h * (-dy) / d, py - h * (dx) / d),
            ];
        }

        // ---- Line/Segment ⨯ Line/Segment ----
        if (isLine(f1) && isLine(f2)) {
            const L1 = lineGeom(f1),
                L2 = lineGeom(f2);

            const r1x = L1.x2 - L1.x1,
                r1y = L1.y2 - L1.y1;
            const r2x = L2.x2 - L2.x1,
                r2y = L2.y2 - L2.y1;

            const denom = r1x * r2y - r1y * r2x; // 2D cross
            if (Math.abs(denom) < EPS) return []; // параллельны или совпадают

            const qpx = L2.x1 - L1.x1;
            const qpy = L2.y1 - L1.y1;

            const t = (qpx * r2y - qpy * r2x) / denom;
            const u = (qpx * r1y - qpy * r1x) / denom;

            if (L1.isSegment && (t < -EPS || t > 1 + EPS)) return [];
            if (L2.isSegment && (u < -EPS || u > 1 + EPS)) return [];

            return [new paper.Point(L1.x1 + t * r1x, L1.y1 + t * r1y)];
        }

        // ---- Line/Segment ⨯ Circle ----
        if ((isLine(f1) && isCircle(f2)) || (isCircle(f1) && isLine(f2))) {
            const L = isLine(f1) ? lineGeom(f1) : lineGeom(f2);
            const C = isCircle(f1) ? circleGeom(f1) : circleGeom(f2);

            const dx = L.x2 - L.x1,
                dy = L.y2 - L.y1;
            const fx = L.x1 - C.cx,
                fy = L.y1 - C.cy;

            const a = dx * dx + dy * dy;
            const b = 2 * (fx * dx + fy * dy);
            const c = fx * fx + fy * fy - C.r * C.r;

            const disc = b * b - 4 * a * c;
            if (disc < 0) return [];

            const s = Math.sqrt(disc);
            const t1 = (-b - s) / (2 * a);
            const t2 = (-b + s) / (2 * a);

            const out = [];

            function pushIfValid(t) {
                if (L.isSegment && (t < -EPS || t > 1 + EPS)) return;
                out.push(new paper.Point(L.x1 + t * dx, L.y1 + t * dy));
            }
            pushIfValid(t1);
            if (Math.abs(t2 - t1) > EPS) pushIfValid(t2);

            return out;
        }

        return [];
    }

}

export class Point extends Figure {
    static _id_counter = 0;

    constructor({ x, y, radius = 5, hitbox_radius = 15, color = null, visible = true, moveable = false, dependencies = [] }) {
        super(`Point${Point._id_counter}`, color, visible, moveable, dependencies);
        Point._id_counter++;
        this.x = x;
        this.y = y;

        this.init_x = x;
        this.init_y = y;

        this.radius = radius;
        this.hitbox_radius = hitbox_radius;

        // Рисуем основную точку только если visible === true
        if (visible) {
            this.shape = new paper.Path.Circle({
                center: [x, y],
                radius: radius,
                fillColor: this.color,
                visible: true
            });
        }

        // Hitbox нужен только если точка moveable
        this.hitbox = null;
        if (this.moveable) {
            this.hitbox = new paper.Path.Circle({
                center: [x, y],
                radius: this.radius + this.hitbox_radius,
                fillColor: new paper.Color(0, 0, 0, 0.025),
                visible: true
            });

            this.hitbox.bringToFront();
            this.hitbox.data.isHitbox = true;

            this.hitbox.onMouseDrag = (event) => this.move(event.point);
        }

        this.update();
    }

    set_color(color) {
        this.color = color
        if (this.shape) {
            this.shape.fillColor = this.color;
        }
    }

    update(delta_x = 0, delta_y = 0) {
        // --- 1. запоминаем старые координаты
        const prevX = this.x,
            prevY = this.y;

        this.x += delta_x
        this.y += delta_y

        // --- 2. вычисляем новые координаты (НЕ зависит от this.shape)
        let newPos = new paper.Point(this.x, this.y);

        if (this.dependencies.length === 1) {
            newPos = this.dependencies[0].closest_valid(newPos);
        } else if (this.dependencies.length >= 2) {
            let allIntersections = new Set();
            let first_iter = true;
            const dist_th = 1;

            for (let i = 0; i < this.dependencies.length; i++) {
                for (let j = i + 1; j < this.dependencies.length; j++) {
                    const inters = Figure.intersection(this.dependencies[i], this.dependencies[j]);
                    if (!inters || inters.length === 0) continue;

                    if (first_iter) {
                        allIntersections = new Set(inters);
                        first_iter = false;
                    } else {
                        const tmp = [];
                        for (let inter1 of allIntersections) {
                            let min_dist = Infinity;
                            for (let inter2 of inters) {
                                min_dist = Math.min(min_dist, inter1.getDistance(inter2));
                            }
                            if (min_dist < dist_th) tmp.push(inter1);
                        }
                        allIntersections = new Set(tmp);
                    }
                }
            }

            if (allIntersections.size > 0) {
                const pos = new paper.Point(this.x, this.y);
                const inters = [...allIntersections];
                inters.sort((a, b) => a.getDistance(pos) - b.getDistance(pos));
                newPos = inters[0];
                if (this.hidden) this.hide(false);
            } else {
                if (!this.hidden) {
                    newPos = new paper.Point(this.init_x, this.init_y)
                    this.hide(true);
                }
            }
        }

        // --- 3. обновляем внутренние координаты
        this.x = newPos.x;
        this.y = newPos.y;

        // --- 4. если есть графика — синхронизируем
        if (this.shape) {
            this.shape.position = newPos;
            this.shape.visible = this.visible && !this.hidden;
        }
        if (this.hitbox) {
            this.hitbox.position = newPos;
        }

        // --- 5. дельта для зависимых
        const dep_delta_x = this.x - prevX;
        const dep_delta_y = this.y - prevY;

        for (let dep of this.dependents) {
            if (dep instanceof Point) {
                dep.update(dep_delta_x, dep_delta_y);
            }
        }

        this.update_dependents();
    }


    move(targetPoint) {
        if (!this.moveable || !this.shape) return;

        const initialPosition = new paper.Point(this.x, this.y)
        const targetstep = Math.sqrt((this.x - targetPoint.x) ** 2 + (this.y - targetPoint.y) ** 2);
        const step = Math.min(Figure.MAXSTEP, targetstep);

        if (targetstep > 0)
            this.update((targetPoint.x - this.x) * step / targetstep, (targetPoint.y - this.y) * step / targetstep);
        else
            this.update()

    }
}

export class Circle extends Figure {
    static _id_counter = 0;

    constructor({ center, radius, color = null, visible = true, moveable = false, dependencies = [] }) {
        super(`Circle${Circle._id_counter}`, color, visible, moveable, [center, ...dependencies]);
        Circle._id_counter++;

        this.center = center; // объект Point
        this.radius = radius;

        // Создаём Path только если реально нужно отрисовывать
        this.shape = null;
        if (visible) {
            this.shape = new paper.Path.Circle({
                center: [this.center.x, this.center.y],
                radius: radius,
                strokeColor: this.color,
                visible: true
            });
        }

        this.update();
    }

    update() {
        if (this.shape) {
            this.shape.position = new paper.Point(this.center.x, this.center.y);
            this.shape.visible = this.visible && !this.hidden;
        }
        this.update_dependents();
    }

    move(targetPoint) {
        if (!this.moveable) return;
        this.center.x = targetPoint.x;
        this.center.y = targetPoint.y;

        if (this.shape) {
            this.shape.position = new paper.Point(this.center.x, this.center.y);
        }

        this.update(this.hidden);
    }

    closest_valid(point) {
        // используем только математику, не shape
        const centerPt = new paper.Point(this.center.x, this.center.y);
        const vec = point.subtract(centerPt);

        if (vec.length === 0) {
            return centerPt.add(new paper.Point(this.radius, 0));
        } else {
            return centerPt.add(vec.normalize().multiply(this.radius));
        }
    }
}

export class CircleByCenterEdge extends Figure {
    static _id_counter = 0;

    constructor({ center, edge, color = null, visible = true, moveable = false, dependencies = [] }) {
        super(`CircleByCenterEdge${CircleByCenterEdge._id_counter}`, color, visible, moveable, [center, edge, ...dependencies]);
        CircleByCenterEdge._id_counter++;

        this.center = center;
        this.edge = edge;

        this.radius = center.x !== undefined && edge.x !== undefined ?
            new paper.Point(center.x, center.y).getDistance(new paper.Point(edge.x, edge.y)) :
            0;

        this.shape = null;
        if (visible) {
            this.shape = new paper.Path.Circle({
                center: [this.center.x, this.center.y],
                radius: this.radius,
                strokeColor: this.color,
                visible: true
            });
        }

        this.update();
    }

    update() {
        const centerPos = new paper.Point(this.center.x, this.center.y);
        const edgePos = new paper.Point(this.edge.x, this.edge.y);

        this.radius = centerPos.getDistance(edgePos);

        if (this.shape) {
            this.shape.position = centerPos;

            this.shape.bounds = new paper.Rectangle(
                centerPos.subtract([this.radius, this.radius]),
                new paper.Size(this.radius * 2, this.radius * 2)
            );

            this.shape.strokeColor = this.color;
            this.shape.visible = this.visible && !this.hidden;
        }


        this.update_dependents();
    }
}

export class Line extends Figure {
    static _id_counter = 0;

    constructor({ p1, p2, width = 1, color = null, visible = true, dash = false, moveable = false, dependencies = [] }) {
        super(`Line${Line._id_counter}`, color, visible, moveable, [p1, p2, ...dependencies]);
        Line._id_counter++;

        this.p1 = p1;
        this.p2 = p2;
        this.width = width;



        this.shape = null;
        if (visible) {
            const dir = new paper.Point(this.p2.x - this.p1.x, this.p2.y - this.p1.y).normalize();
            const big = 2000;
            const from = new paper.Point(this.p1.x, this.p1.y).subtract(dir.multiply(big));
            const to = new paper.Point(this.p2.x, this.p2.y).add(dir.multiply(big));

            this.shape = new paper.Path.Line({
                from: from,
                to: to,
                strokeColor: this.color,
                strokeWidth: this.width,
                visible: true,
                dashArray: dash ? [15 * scale, 15 * scale] : [1000 * scale, 0]
            });
        }

        this.update();
    }

    update() {
        const dir = new paper.Point(this.p2.x - this.p1.x, this.p2.y - this.p1.y).normalize();
        const big = 2000;
        const from = new paper.Point(this.p1.x, this.p1.y).subtract(dir.multiply(big));
        const to = new paper.Point(this.p2.x, this.p2.y).add(dir.multiply(big));

        if (this.shape) {
            this.shape.firstSegment.point = from;
            this.shape.lastSegment.point = to;
            this.shape.visible = this.visible && !this.hidden;
        }

        this.update_dependents();
    }

    closest_valid(point) {
        const a = new paper.Point(this.p1.x, this.p1.y);
        const b = new paper.Point(this.p2.x, this.p2.y);
        const ab = b.subtract(a);

        const ap = point.subtract(a);
        const t = ap.dot(ab) / ab.dot(ab);

        return a.add(ab.multiply(t)); // проекция на прямую
    }
}

export class Segment extends Line {
    constructor({ p1, p2, width = 1, color = null, visible = true, dash = false, moveable = false, dependencies = [] }) {
        super({ p1, p2, width, color, visible, dash, moveable, dependencies });

        // для сегмента сразу обрезаем линию до p1–p2
        if (this.shape) {
            this.shape.firstSegment.point = new paper.Point(this.p1.x, this.p1.y);
            this.shape.lastSegment.point = new paper.Point(this.p2.x, this.p2.y);
        }

        this.update();
    }

    update() {
        const from = new paper.Point(this.p1.x, this.p1.y);
        const to = new paper.Point(this.p2.x, this.p2.y);

        if (this.shape) {
            this.shape.firstSegment.point = from;
            this.shape.lastSegment.point = to;
            this.shape.visible = this.visible && !this.hidden;
        }

        this.update_dependents();
    }

    closest_valid(point) {
        const a = new paper.Point(this.p1.x, this.p1.y);
        const b = new paper.Point(this.p2.x, this.p2.y);
        const ab = b.subtract(a);

        const ap = point.subtract(a);
        let t = ap.dot(ab) / ab.dot(ab);

        // clamp [0,1]
        t = Math.max(0, Math.min(1, t));

        return a.add(ab.multiply(t));
    }
}

export class Arc extends Figure {
    static _id_counter = 0;

    constructor({ center, point, fromAngle = 0, toAngle = 90, color = null, visible = true, moveable = false, dependencies = [] }) {
        super(`Arc${Arc._id_counter}`, color, visible, moveable, [center, point, ...dependencies]);
        Arc._id_counter++;

        this.center = center;
        this.point = point;
        this.fromAngle = fromAngle;
        this.toAngle = toAngle;

        this.radius = this._radius();

        this.shape = null;
        if (visible) {
            this.shape = new paper.Path();
            this.shape.strokeColor = this.color;
        }

        this.update();
    }

    _point_on_circle(angleDeg, radius) {
        const rad = angleDeg * Math.PI / 180;
        return new paper.Point(
            this.center.x + radius * Math.cos(rad),
            this.center.y + radius * Math.sin(rad)
        );
    }

    _radius() {
        return Math.hypot(this.point.x - this.center.x, this.point.y - this.center.y);
    }

    update() {
        this.radius = this._radius();

        if (this.shape) {
            const from = this._point_on_circle(this.fromAngle, this.radius);
            const through = this._point_on_circle((this.fromAngle + this.toAngle) / 2, this.radius);
            const to = this._point_on_circle(this.toAngle, this.radius);

            this.shape.removeSegments();
            this.shape.add(from);
            this.shape.arcTo(through, to);

            this.shape.visible = this.visible && !this.hidden;
        }

        this.update_dependents();
    }

    move(delta) {
        if (!this.moveable) return;
        this.center.x += delta.x;
        this.center.y += delta.y;
        this.point.x += delta.x;
        this.point.y += delta.y;
        this.update();
    }

    closest_valid(point) {
        const centerPt = new paper.Point(this.center.x, this.center.y);
        const vec = point.subtract(centerPt);

        if (vec.length === 0) {
            return this._point_on_circle(this.fromAngle, this.radius);
        }

        const projected = centerPt.add(vec.normalize().multiply(this.radius));

        // вычисляем угол
        let angProj = Math.atan2(projected.y - this.center.y, projected.x - this.center.x) * 180 / Math.PI;
        let angFrom = ((this.fromAngle % 360) + 360) % 360;
        let angTo = ((this.toAngle % 360) + 360) % 360;
        if (angProj < 0) angProj += 360;

        let inArc = false;
        if (angFrom <= angTo) {
            inArc = angProj >= angFrom && angProj <= angTo;
        } else {
            inArc = angProj >= angFrom || angProj <= angTo;
        }

        if (inArc) {
            return projected;
        } else {
            const fromPt = this._point_on_circle(this.fromAngle, this.radius);
            const toPt = this._point_on_circle(this.toAngle, this.radius);
            return projected.getDistance(fromPt) < projected.getDistance(toPt) ? fromPt : toPt;
        }
    }
}

export class ArcThrough3Points extends Figure {
    static _id_counter = 0;

    constructor({ p1, p2, p3, color = null, visible = true, moveable = false, dependencies = [] }) {
        super(`ArcThrough3Points${ArcThrough3Points._id_counter++}`, color, visible, moveable, [p1, p2, p3, ...dependencies]);

        this.p1 = p1;
        this.p2 = p2;
        this.p3 = p3;

        this.shape = null;
        if (visible) {
            this.shape = new paper.Path({
                strokeColor: this.color,
                visible: true
            });
        }

        this.update();
    }

    update() {
        if (this.shape) {
            this.shape.removeSegments();
            this.shape.add(new paper.Point(this.p1.x, this.p1.y));
            this.shape.arcTo(
                new paper.Point(this.p2.x, this.p2.y),
                new paper.Point(this.p3.x, this.p3.y)
            );
            this.shape.visible = this.visible && !this.hidden;
        }

        this.update_dependents();
    }

    move(delta) {
        if (!this.moveable) return;
        for (const p of[this.p1, this.p2, this.p3]) {
            p.x += delta.x;
            p.y += delta.y;
        }
        this.update();
    }

    closest_valid(point) {
        const center = ArcThrough3Points._circumcenter(this.p1, this.p2, this.p3);
        if (!center) return null;

        const radius = center.getDistance(new paper.Point(this.p1.x, this.p1.y));
        const vec = point.subtract(center);

        if (vec.length === 0) return new paper.Point(this.p1.x, this.p1.y);

        const projected = center.add(vec.normalize(radius));

        // проверяем, попадает ли проекция в дугу
        const ang = (pt) => Math.atan2(pt.y - center.y, pt.x - center.x);
        let a1 = ang(this.p1),
            a2 = ang(this.p2),
            a3 = ang(this.p3),
            ap = ang(projected);

        // нормализация углов
        const norm = (x) => (x < 0 ? x + 2 * Math.PI : x);
        a1 = norm(a1);
        a2 = norm(a2);
        a3 = norm(a3);
        ap = norm(ap);

        // определить порядок обхода через p2
        const between = (start, mid, end) => {
            if (start <= end) return start <= mid && mid <= end;
            return start <= mid || mid <= end;
        };

        let inArc = between(a1, ap, a3) === between(a1, a2, a3);

        if (inArc) {
            return projected;
        } else {
            const p1Pt = new paper.Point(this.p1.x, this.p1.y);
            const p3Pt = new paper.Point(this.p3.x, this.p3.y);
            return projected.getDistance(p1Pt) < projected.getDistance(p3Pt) ? p1Pt : p3Pt;
        }
    }

    static _circumcenter(a, b, c) {
        const x1 = a.x,
            y1 = a.y;
        const x2 = b.x,
            y2 = b.y;
        const x3 = c.x,
            y3 = c.y;

        const D = 2 * (x1 * (y2 - y3) + x2 * (y3 - y1) + x3 * (y1 - y2));
        if (Math.abs(D) < 1e-9) return null;

        const x1s = x1 * x1 + y1 * y1;
        const x2s = x2 * x2 + y2 * y2;
        const x3s = x3 * x3 + y3 * y3;

        const ux = (x1s * (y2 - y3) + x2s * (y3 - y1) + x3s * (y1 - y2)) / D;
        const uy = (x1s * (x3 - x2) + x2s * (x1 - x3) + x3s * (x2 - x1)) / D;

        return new paper.Point(ux, uy);
    }
}

export class Angle extends Figure {
    static _id_counter = 0;

    constructor({ p1, p2, p3, radius = 15, color = 'green', visible = true, draw_segments = true, dependencies = [], valid_range = null }) {
        super(`Angle${Angle._id_counter++}`, color, visible, false, [p1, p2, p3, ...dependencies]);

        this.p1 = p1;
        this.p2 = p2; // вершина угла
        this.p3 = p3;
        this.radius = radius;
        this.validRange = valid_range
        this.value = null;

        for (const p of[p1, p2, p3]) {
            if (p) p.dependents.push(this);
        }

        // графика
        this.arc = null;
        this.label = "";

        if (visible) {
            this.arc = new paper.Path.Arc({
                strokeColor: this.color,
                visible: true
            });
            this.label = new paper.PointText({
                content: '',
                fillColor: this.color,
                fontSize: 14,
                justification: 'center',
                visible: true
            });
        }

        if (draw_segments) {
            new Segment({ p1: p1, p2: p2, dash: true, color: 'lightgrey' })
            new Segment({ p1: p3, p2: p2, dash: true, color: 'lightgrey' })
        }

        this.update();
    }

    set_color(color) {
        this.color = color
        if (this.arc) {
            this.arc.strokeColor = this.color;
        }
        if (this.arc) {
            this.label.fillColor = this.color;
        }
    }

    update() {
        const A = new paper.Point(this.p1.x, this.p1.y);
        const O = new paper.Point(this.p2.x, this.p2.y);
        const B = new paper.Point(this.p3.x, this.p3.y);

        const v1 = A.subtract(O).normalize();
        const v2 = B.subtract(O).normalize();

        let ang1 = Math.atan2(v1.y, v1.x);
        let ang2 = Math.atan2(v2.y, v2.x);

        // нормализация
        let dAng = ang2 - ang1;
        if (dAng <= -Math.PI) dAng += 2 * Math.PI;
        if (dAng > Math.PI) dAng -= 2 * Math.PI;

        const angleDeg = Math.abs(dAng * 180 / Math.PI);
        this.value = angleDeg;

        if (this.validRange) {
            const maxDiverge = (this.validRange[1] - this.validRange[0]) * 0.25;
            if (angleDeg < this.validRange[0] || angleDeg > this.validRange[1])
                this.set_color('red')
            else if (angleDeg < this.validRange[0] + maxDiverge || angleDeg > this.validRange[1] - maxDiverge)
                this.set_color('orange')
            else
                this.set_color('green')
        }

        // точки дуги
        const from = O.add(v1.multiply(this.radius));
        const to = O.add(v2.multiply(this.radius));
        const mid = O.add(
            new paper.Point(
                Math.cos(ang1 + dAng / 2),
                Math.sin(ang1 + dAng / 2)
            ).multiply(this.radius)
        );

        // обновляем дугу
        if (this.arc) {
            this.arc.removeSegments();
            this.arc.add(from);
            this.arc.arcTo(mid, to);
            this.arc.visible = this.visible && !this.hidden;
        }

        // обновляем подпись
        if (this.label) {
            this.label.content = angleDeg.toFixed(1) + "°";
            this.label.position = O.add(
                new paper.Point(
                    Math.cos(ang1 + dAng / 2),
                    Math.sin(ang1 + dAng / 2)
                ).multiply(this.radius + this.label.fontSize * 1.5)
            );
            this.label.visible = this.visible && !this.hidden;
        }

        this.update_dependents();
    }
}