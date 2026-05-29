import re
import json
from typing import Optional


def _get_val(obj: dict, *keys) -> Optional[float]:
    for k in keys:
        v = obj.get(k)
        if v is not None:
            try:
                return float(v)
            except (TypeError, ValueError):
                pass
    return None


def _parse_objects_by_typename(html: str, typename: str) -> list:
    starts = [m.start() for m in re.finditer(
        r'"__typename"\s*:\s*"' + re.escape(typename) + r'"', html
    )]
    results = []
    for start in starts:
        brace_start = -1
        depth = 0
        i = start - 1
        while i >= 0:
            ch = html[i]
            if ch == '}':
                depth += 1
            elif ch == '{':
                if depth == 0:
                    brace_start = i
                    break
                depth -= 1
            i -= 1
        if brace_start == -1:
            continue
        depth = 0
        i = brace_start
        while i < len(html):
            if html[i] == '{':
                depth += 1
            elif html[i] == '}':
                depth -= 1
                if depth == 0:
                    break
            i += 1
        obj_str = html[brace_start:i + 1]
        try:
            obj = json.loads(obj_str)
            results.append((start, obj))
        except json.JSONDecodeError:
            continue
    return results


def parse_bikeinsights_html(html: str) -> dict:
    model = None
    h1_match = re.search(r'<h1[^>]*class="[^"]*header-title[^"]*"[^>]*>(.*?)</h1>', html, re.DOTALL)
    if h1_match:
        raw = h1_match.group(1)
        model = re.sub(r'<[^>]+>', '', raw).strip()
        model = re.sub(r'\s+', ' ', model)
    if not model:
        title_match = re.search(r'<title>([^<]+)</title>', html)
        if title_match:
            model = title_match.group(1).split(' - ')[0].strip()

    frame_objects = _parse_objects_by_typename(html, 'BikeGeometryFrame')
    if not frame_objects:
        raise ValueError(
            "Не найдены данные геометрии на странице. "
            "Убедитесь, что ссылка ведёт на страницу велосипеда bikeinsights.com."
        )

    build_objects = _parse_objects_by_typename(html, 'BikeGeometryBaseBuild')

    sizes = []
    for idx, (start, geo) in enumerate(frame_objects):
        context = html[max(0, start - 600):start]
        size_match = re.search(r'"size"\s*:\s*"([^"]+)"', context)
        size_label = size_match.group(1) if size_match else None

        build = build_objects[idx][1] if idx < len(build_objects) else {}

        entry = {"label": size_label or ""}

        stack = _get_val(geo, "stack")
        if stack is not None:
            entry["stack"] = stack

        reach = _get_val(geo, "reach")
        if reach is not None:
            entry["reach"] = reach

        seat_tube = _get_val(
            geo,
            "seat_tube_length_center_st_top",
            "seat_tube_length_center_tt_top",
            "seat_tube_length_center_center",
            "seat_tube_length_unknown",
            "effective_seat_tube_length_center_ett_ht_top",
        )
        if seat_tube is not None:
            entry["seatTube"] = seat_tube

        seat_angle = _get_val(geo, "seat_tube_angle")
        if seat_angle is not None:
            entry["seatAngle"] = seat_angle

        head_tube = _get_val(geo, "head_tube_length")
        if head_tube is not None:
            entry["headTube"] = head_tube

        head_angle = _get_val(geo, "head_tube_angle")
        if head_angle is not None:
            entry["headAngle"] = head_angle

        chainstay = _get_val(geo, "chainstay_length")
        if chainstay is not None:
            entry["chainstay"] = chainstay

        wheelbase = _get_val(geo, "wheelbase")
        if wheelbase is not None:
            entry["wheelbase"] = wheelbase

        bbdrop = _get_val(geo, "bottom_bracket_drop")
        if bbdrop is not None:
            entry["bbdrop"] = bbdrop

        crank_len = _get_val(build, "crank_length")
        if crank_len is not None:
            entry["crankLen"] = crank_len

        stem_len = _get_val(build, "stem_length")
        if stem_len is not None:
            entry["stemLen"] = stem_len

        rim_d = _get_val(build, "wheel_bsd")
        if rim_d is not None:
            entry["rimD"] = rim_d

        tyre_w = _get_val(build, "tire_width")
        if tyre_w is not None:
            entry["tyreW"] = tyre_w

        stem_angle = _get_val(build, "stem_angle")
        if stem_angle is not None:
            entry["stemAngle"] = stem_angle

        sizes.append(entry)

    if not sizes:
        raise ValueError("Не найдено ни одного размера на странице.")

    return {
        "model": model or "",
        "sizes": sizes,
    }
