from math import sin, cos, radians, degrees
import math

def cos_th(a, b, alpha_deg):
    return math.sqrt(a**2 + b**2 - 2*a*b*cos(radians(alpha_deg)))

def angle_by_sides(a,b,c):
    return degrees(math.acos((a**2 + b**2 - c**2)/(2*a*b)))

def dist(p1, p2):
    return math.sqrt((p1[0]-p2[0])**2 + (p1[1]-p2[1])**2)

def basic_fit(geometry, anthropometry):
    seatHight = anthropometry['hip'] + anthropometry['lowerLeg'] + anthropometry['heelToAnkle'] - geometry['crankLen']
    stemHight = geometry['maxStemHight']
    
    seat = [-seatHight * cos(radians(geometry['seatAngle'])), seatHight * sin(radians(geometry['seatAngle']))]
    hands = [geometry['reach'] + geometry['stemLen'] + geometry['barReach'] + geometry['shifterReach'],
             geometry['stack'] + stemHight]
    armsLen = cos_th(anthropometry['upperarm'], anthropometry['forearm'] * 1.2, 155)
    torsoLen = anthropometry['torsoMid']

    torsoAngle = angle_by_sides(dist(seat, hands), torsoLen, armsLen) + degrees(math.atan((hands[1]-seat[1])/(hands[0]-seat[0])))
    # shifterAngle = 40
    return {
        'seatHight': seatHight,
        'stemHight': stemHight,
        'saddleOffset': 0,
        'torsoAngle': torsoAngle,
        'shifterAngle': 40
    }
