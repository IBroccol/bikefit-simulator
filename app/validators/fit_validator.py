from typing import Dict, Any, Optional


class ValidationResult:
    def __init__(self, is_valid: bool, errors: Optional[list] = None, data: Optional[Dict[str, Any]] = None):
        self.is_valid = is_valid
        self.errors = errors or []
        self.data = data or {}

    def add_error(self, field: str, message: str):
        self.errors.append({"field": field, "message": message})
        self.is_valid = False


def validate_anthropometry_data(data: Dict[str, Any]) -> ValidationResult:
    result = ValidationResult(True)

    if not data:
        result.add_error("data", "Отсутствуют данные запроса")
        return result

    fields = {
        "height":    {"min": 100,  "max": 250,  "name": "Рост"},
        "footLength": {"min": 200, "max": 400,  "name": "Длина стопы"},
        "hip":       {"min": 300,  "max": 800,  "name": "Длина бедра"},
        "lowerLeg":  {"min": 300,  "max": 800,  "name": "Длина голени"},
        "torsoMax":  {"min": 400,  "max": 1000, "name": "Длина туловища"},
        "upperarm":  {"min": 200,  "max": 500,  "name": "Длина плеча"},
        "forearm":   {"min": 200,  "max": 500,  "name": "Длина предплечья"},
    }

    for field, limits in fields.items():
        value = data.get(field)
        if value is None:
            result.add_error(field, f"Поле {limits['name']} обязательно")
        elif not isinstance(value, (int, float)) or value <= 0:
            result.add_error(field, f"{limits['name']} должно быть положительным числом")
        elif value < limits["min"]:
            result.add_error(field, f"{limits['name']} должно быть не менее {limits['min']} мм")
        elif value > limits["max"]:
            result.add_error(field, f"{limits['name']} должно быть не более {limits['max']} мм")

    if not result.is_valid:
        return result

    # Проверка пропорций относительно роста (рост в см → переводим в мм)
    height_mm = data["height"] * 10

    proportions = [
        ("footLength", 0.1,  0.2,  "Длина стопы"),
        ("hip",        0.2,  0.3,  "Длина бедра"),
        ("lowerLeg",   0.2,  0.3,  "Длина голени"),
        ("torsoMax",   0.2,  0.4,  "Длина туловища"),
        ("upperarm",   0.15, 0.2,  "Длина плеча"),
        ("forearm",    0.1,  0.2,  "Длина предплечья"),
    ]
    for field, lo, hi, name in proportions:
        ratio = data[field] / height_mm
        if ratio < lo:
            result.add_error(field, f"{name} слишком мала относительно роста")
        elif ratio > hi:
            result.add_error(field, f"{name} слишком велика относительно роста")

    if data["lowerLeg"] <= data["footLength"]:
        result.add_error("lowerLeg", "Длина голени должна быть больше длины стопы")
        result.add_error("footLength", "Длина стопы должна быть меньше длины голени")

    if data["torsoMax"] <= data["lowerLeg"]:
        result.add_error("torsoMax", "Длина туловища должна быть больше длины голени")
        result.add_error("lowerLeg", "Длина голени должна быть меньше длины туловища")

    arm_diff = abs(data["upperarm"] - data["forearm"])
    arm_avg = (data["upperarm"] + data["forearm"]) / 2
    if arm_diff / arm_avg > 0.20:
        result.add_error("upperarm", "Длина плеча и предплечья сильно различаются")
        result.add_error("forearm", "Длина предплечья и плеча сильно различаются")

    arm_total = data["upperarm"] + data["forearm"]
    if abs(arm_total - data["torsoMax"]) / data["torsoMax"] > 0.30:
        result.add_error("upperarm", "Сумма длин рук не соответствует длине туловища")
        result.add_error("forearm", "Сумма длин рук не соответствует длине туловища")
        result.add_error("torsoMax", "Длина туловища не соответствует сумме длин рук")

    leg_ratio = (data["hip"] + data["lowerLeg"]) / height_mm
    if leg_ratio < 0.45:
        result.add_error("hip", "Общая длина ног слишком мала относительно роста")
        result.add_error("lowerLeg", "Общая длина ног слишком мала относительно роста")
    elif leg_ratio > 0.55:
        result.add_error("hip", "Общая длина ног слишком велика относительно роста")
        result.add_error("lowerLeg", "Общая длина ног слишком велика относительно роста")

    if result.is_valid:
        result.data = data

    return result


def validate_fit_settings_data(data: Dict[str, Any]) -> ValidationResult:
    result = ValidationResult(True)

    if not data:
        result.add_error("data", "Отсутствуют данные запроса")
        return result

    required = {
        "size_id":      "ID размера велосипеда",
        "name":         "Название посадки",
        "seatHight":    "Высота седла",
        "stemHight":    "Высота выноса",
        "saddleOffset": "Смещение седла",
        "torsoAngle":   "Угол наклона туловища",
        "shifterAngle": "Угол манеток",
    }

    for field, name in required.items():
        value = data.get(field)
        if value is None:
            result.add_error(field, f"Поле {name} обязательно")
        elif field == "name":
            if not isinstance(value, str) or not value.strip():
                result.add_error(field, f"{name} не может быть пустым")
            elif len(value.strip()) > 100:
                result.add_error(field, f"{name} должно содержать максимум 100 символов")
        elif field == "size_id":
            if not isinstance(value, int) or value <= 0:
                result.add_error(field, f"{name} должно быть положительным числом")

    if result.is_valid:
        result.data = {
            "size_id":      data["size_id"],
            "name":         data["name"].strip(),
            "seatHight":    float(data["seatHight"]),
            "stemHight":    float(data["stemHight"]),
            "saddleOffset": float(data["saddleOffset"]),
            "torsoAngle":   float(data["torsoAngle"]),
            "shifterAngle": float(data["shifterAngle"]),
        }

    return result


def validate_fit_request_data(data: Dict[str, Any]) -> ValidationResult:
    result = ValidationResult(True)

    if not data:
        result.add_error("data", "Отсутствуют данные запроса")
        return result

    fit_name = data.get("fit_name")
    size_id = data.get("size_id")

    if not fit_name or not isinstance(fit_name, str) or not fit_name.strip():
        result.add_error("fit_name", "Название посадки обязательно")

    if size_id is None:
        result.add_error("size_id", "ID размера велосипеда обязателен")
    elif not isinstance(size_id, int) or size_id <= 0:
        result.add_error("size_id", "ID размера велосипеда должен быть положительным числом")

    if result.is_valid:
        result.data = {"fit_name": fit_name.strip(), "size_id": size_id}

    return result


def validate_size_id(data: Dict[str, Any]) -> ValidationResult:
    result = ValidationResult(True)

    if not data:
        result.add_error("data", "Отсутствуют данные запроса")
        return result

    size_id = data.get("size_id")

    if size_id is None:
        result.add_error("size_id", "ID размера велосипеда обязателен")
    elif not isinstance(size_id, int) or size_id <= 0:
        result.add_error("size_id", "ID размера велосипеда должен быть положительным числом")

    if result.is_valid:
        result.data = {"size_id": size_id}

    return result
