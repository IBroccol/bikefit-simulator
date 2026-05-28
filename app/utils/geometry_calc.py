from math import sin, cos, radians, degrees, atan2, sqrt, acos
from decimal import Decimal
import logging

logger = logging.getLogger(__name__)


def _cos_th(a, b, alpha_deg):
    """Длина третьей стороны треугольника по теореме косинусов."""
    return sqrt(a**2 + b**2 - 2*a*b*cos(radians(alpha_deg)))


def _angle_by_sides(a, b, c):
    """Угол (в градусах) напротив стороны c. Возвращает None при вырожденном треугольнике."""
    denom = 2 * a * b
    if denom == 0:
        return None
    # Зажимаем в [-1, 1] на случай погрешностей вычислений
    cos_val = max(-1.0, min(1.0, (a**2 + b**2 - c**2) / denom))
    return degrees(acos(cos_val))


def _dist(p1, p2):
    return sqrt((p1[0]-p2[0])**2 + (p1[1]-p2[1])**2)


def basic_fit(geometry, anthropometry):
    """Рассчитывает базовую посадку по геометрии велосипеда и антропометрии.

    Возвращает словарь с параметрами посадки или {"error": "..."} если расчёт невозможен.
    """
    if not anthropometry:
        return {"error": "Антропометрические данные не найдены. Заполните антропометрию перед расчётом посадки."}

    try:
        _numeric = (int, float, str, Decimal)
        g = {k: float(v) for k, v in geometry.items() if isinstance(v, _numeric)}
        a = {k: float(v) for k, v in anthropometry.items() if isinstance(v, _numeric)}

        seat_hight = a['hip'] + a['lowerLeg'] + a['heelToAnkle'] - g['crankLen']
        stem_hight = g['maxStemHight']

        saddle_offset = g['crankLen'] + seat_hight * cos(radians(g['seatAngle'])) - a['hip'] * cos(radians(35))

        seat = [
            -seat_hight * cos(radians(g['seatAngle'])) + saddle_offset,
            seat_hight * sin(radians(g['seatAngle'])),
        ]
        hands = [
            g['reach'] + g['stemLen'] + g['barReach'] + g['shifterReach'] - stem_hight * cos(radians(g['headAngle'])),
            g['stack'] + stem_hight * sin(radians(g['headAngle'])) + g['stemLen'] * sin(radians(90 + g['stemAngle'] - g['headAngle'])) + 10,
        ]

        arms_len = _cos_th(a['upperarm'], a['forearm'], 155)
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
            'shifterAngle': 30,
        }

    except (KeyError, TypeError, ValueError) as e:
        logger.error(f"basic_fit: {e}", exc_info=True)
        return {"error": "Ошибка при расчёте посадки: недостаточно данных геометрии или антропометрии."}
