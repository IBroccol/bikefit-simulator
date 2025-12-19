from math import sin, cos, radians, degrees
import math

def cos_th(a, b, alpha_deg):
    return math.sqrt(a**2 + b**2 - 2*a*b*cos(radians(alpha_deg)))

def angle_by_sides(a,b,c):
    return degrees(math.acos((a**2 + b**2 - c**2)/(2*a*b)))

def dist(p1, p2):
    return math.sqrt((p1[0]-p2[0])**2 + (p1[1]-p2[1])**2)

def basic_fit(geometry, anthropometry):
    # Приводим все значения из БД к float для корректных математических операций
    seatHight = float(anthropometry['hip']) + float(anthropometry['lowerLeg']) + float(anthropometry['heelToAnkle']) - float(geometry['crankLen'])
    stemHight = float(geometry['maxStemHight'])
    
    saddleOffset = float(geometry['crankLen']) + seatHight * cos(radians(float(geometry['seatAngle']))) - float(anthropometry['hip']) * cos(radians(35))

    seat = [-seatHight * cos(radians(float(geometry['seatAngle']))) + saddleOffset, seatHight * sin(radians(float(geometry['seatAngle'])))]
    hands = [float(geometry['reach']) + float(geometry['stemLen']) + float(geometry['barReach']) + float(geometry['shifterReach']) - stemHight * cos(radians(float(geometry['headAngle']))),
             float(geometry['stack']) + stemHight * sin(radians(float(geometry['headAngle']))) + float(geometry['stemLen']) * sin(radians(90 + float(geometry['stemAngle']) - float(geometry['headAngle'])))+10]
    armsLen = cos_th(float(anthropometry['upperarm']), float(anthropometry['forearm']), 155)
    torsoLen = float(anthropometry['torsoMid'])

    torsoAngle = angle_by_sides(dist(seat, hands), torsoLen, armsLen) + degrees(math.atan((hands[1]-seat[1])/(hands[0]-seat[0])))

    # shifterAngle = 40
    return {
        'seatHight': seatHight,
        'stemHight': stemHight,
        'saddleOffset': min(saddleOffset, float(geometry['saddleRailLen']) / 2),
        'torsoAngle': torsoAngle,
        'shifterAngle': 30
    }
