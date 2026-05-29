from math import sin, cos, radians, degrees, atan2, sqrt, acos
from decimal import Decimal
import logging

logger = logging.getLogger(__name__)


def _cos_th(a, b, alpha_deg):
    return sqrt(a**2 + b**2 - 2*a*b*cos(radians(alpha_deg)))


def _angle_by_sides(a, b, c):
    denom = 2 * a * b
    if denom == 0:
        return None
    cos_val = max(-1.0, min(1.0, (a**2 + b**2 - c**2) / denom))
    return degrees(acos(cos_val))


def _dist(p1, p2):
    return sqrt((p1[0]-p2[0])**2 + (p1[1]-p2[1])**2)


def basic_fit(geometry, anthropometry):
    if not anthropometry:
        return {"error": "Антропометрические данные не найдены. Заполните антропометрию перед расчётом посадки."}

    try:
        _numeric = (int, float, Decimal)
        g = {k: float(v) for k, v in geometry.items() if isinstance(v, _numeric)}
        a = {k: float(v) for k, v in anthropometry.items() if isinstance(v, _numeric)}

        seat_hight = a['hip'] + a['lowerLeg'] + a['heelToAnkle'] - g['crankLen']
        stem_hight = g['maxStemHight']

        saddle_offset = g['crankLen'] + seat_hight * cos(radians(g['seatAngle'])) - a['hip'] * cos(radians(35))

        seat_a = radians(g['seatAngle'])
        saddle_x = -(seat_hight - g['saddleHeight']) * cos(seat_a) + saddle_offset
        saddle_y = (seat_hight - g['saddleHeight']) * sin(seat_a) + g['saddleHeight']

        seat = [
            saddle_x - g['saddleLen'] / 8,
            saddle_y + a['hipJointOffset'],
        ]

        shifter_angle = 30
        curve_r1 = g['barDrop'] * 0.25
        arc_r = curve_r1 + g['shifterReach']
        ha = radians(g['headAngle'])
        sa = radians(g['stemAngle'])
        stem_tip_x = g['reach'] - stem_hight * cos(ha) + g['stemLen'] * sin(ha - sa)
        stem_tip_y = g['stack'] + stem_hight * sin(ha) + g['stemLen'] * cos(ha - sa)
        hands = [
            stem_tip_x + g['barReach'] - curve_r1 + arc_r * cos(radians(shifter_angle)),
            stem_tip_y - curve_r1 + arc_r * sin(radians(shifter_angle)),
        ]

        arms_len = _cos_th(a['upperarm'], a['forearm'] * 1.2, 155)
        torso_len = a['torsoMid']
        d = _dist(seat, hands)

        base_angle = degrees(atan2(hands[1] - seat[1], hands[0] - seat[0]))
        angle = _angle_by_sides(d, torso_len, arms_len)

        if angle is None:
            return {"error": "Не удалось рассчитать угол посадки: вырожденная геометрия."}

        return {
            'seatHight':    seat_hight,
            'stemHight':    stem_hight,
            'saddleOffset': min(saddle_offset, g['saddleRailLen'] / 2),
            'torsoAngle':   angle + base_angle,
            'shifterAngle': shifter_angle,
        }

    except (KeyError, TypeError, ValueError) as e:
        logger.error(f"basic_fit: {e}", exc_info=True)
        return {"error": "Ошибка при расчёте посадки: недостаточно данных геометрии или антропометрии."}
