from typing import Dict, Any, Optional, List


class ValidationResult:
    def __init__(self, is_valid: bool, errors: Optional[list] = None, data: Optional[Dict[str, Any]] = None):
        self.is_valid = is_valid
        self.errors = errors or []
        self.data = data or {}

    def add_error(self, field: str, message: str):
        self.errors.append({"field": field, "message": message})
        self.is_valid = False


# Допустимые диапазоны параметров геометрии
_PARAM_RANGES = {
    "stack":          {"min": 400,  "max": 700,  "name": "Стэк"},
    "reach":          {"min": 300,  "max": 500,  "name": "Рич"},
    "seatTube":       {"min": 300,  "max": 700,  "name": "Длина подседельной трубы"},
    "seatAngle":      {"min": 65,   "max": 80,   "name": "Угол подседельной трубы"},
    "headTube":       {"min": 80,   "max": 300,  "name": "Длина рулевого стакана"},
    "headAngle":      {"min": 65,   "max": 75,   "name": "Угол рулевого стакана"},
    "chainstay":      {"min": 350,  "max": 500,  "name": "Длина нижних перьев"},
    "wheelbase":      {"min": 900,  "max": 1300, "name": "Колёсная база"},
    "bbdrop":         {"min": 50,   "max": 100,  "name": "Провис каретки"},
    "crankLen":       {"min": 160,  "max": 180,  "name": "Длина шатунов"},
    "stemLen":        {"min": 60,   "max": 150,  "name": "Длина выноса"},
    "rimD":           {"min": 500,  "max": 650,  "name": "Диаметр обода"},
    "tyreW":          {"min": 20,   "max": 60,   "name": "Ширина покрышек"},
    "stemAngle":      {"min": -20,  "max": 20,   "name": "Угол выноса"},
    "barReach":       {"min": 60,   "max": 120,  "name": "Рич руля"},
    "barDrop":        {"min": 100,  "max": 150,  "name": "Дроп руля"},
    "saddleLen":      {"min": 240,  "max": 300,  "name": "Длина седла"},
    "minStemHight":   {"min": 0,    "max": 100,  "name": "Мин. высота установки выноса"},
    "maxStemHight":   {"min": 0,    "max": 200,  "name": "Макс. высота установки выноса"},
    "shifterReach":   {"min": 60,   "max": 100,  "name": "Рич тормозных рукояток"},
    "saddleRailLen":  {"min": 30,   "max": 60,   "name": "Длина рейлов седла"},
    "saddleHeight":   {"min": 20,   "max": 50,   "name": "Высота седла"},
    "minseatpostLen": {"min": 0,    "max": 200,  "name": "Мин. высота установки подседельного штыря"},
    "maxseatpostLen": {"min": 100,  "max": 250,  "name": "Макс. высота установки подседельного штыря"},
}

# Параметры с дефолтными значениями (не обязательны к заполнению)
_OPTIONAL_DEFAULTS = {
    "minStemHight":   30,
    "maxStemHight":   70,
    "shifterReach":   70,
    "saddleRailLen":  60,
    "saddleHeight":   50,
    "minseatpostLen": 50,
    "maxseatpostLen": 250,
}

# Параметры, общие для всех размеров одной модели
_SHARED_PARAMS = {
    "rimD", "tyreW", "stemAngle", "minStemHight", "maxStemHight",
    "barReach", "barDrop", "shifterReach", "saddleLen",
    "saddleRailLen", "saddleHeight", "minseatpostLen", "maxseatpostLen",
}


def validate_bike_data(bikes: List[Dict[str, Any]]) -> ValidationResult:
    result = ValidationResult(True)

    if not bikes or not isinstance(bikes, list):
        result.add_error("data", "Отсутствуют данные велосипеда")
        return result

    for idx, bike in enumerate(bikes):
        size = bike.get("size", "").strip()
        size_label = f"размер '{size}'" if size else f"размер #{idx + 1}"

        for param, limits in _PARAM_RANGES.items():
            value = bike.get(param)

            if (value is None or value == "") and param in _OPTIONAL_DEFAULTS:
                bike[param] = _OPTIONAL_DEFAULTS[param]
                continue

            if value is None or value == "":
                continue

            is_shared = param in _SHARED_PARAMS
            field_name = param if is_shared else (f"{param}_{idx}" if idx > 0 else param)
            context = "" if is_shared else f" для {size_label}"

            try:
                value = float(value)
                bike[param] = value
                if value < limits["min"]:
                    result.add_error(field_name, f"{limits['name']}{context} слишком мало (минимум {limits['min']})")
                elif value > limits["max"]:
                    result.add_error(field_name, f"{limits['name']}{context} слишком велико (максимум {limits['max']})")
            except (ValueError, TypeError):
                result.add_error(field_name, f"{limits['name']}{context} должно быть числом")

        # Логические проверки min/max
        try:
            if float(bike.get("minStemHight", 0)) > float(bike.get("maxStemHight", 0)):
                result.add_error("minStemHight", f"Для {size_label} минимальная высота выноса не может быть больше максимальной")
        except (ValueError, TypeError):
            pass

        try:
            if float(bike.get("minseatpostLen", 0)) > float(bike.get("maxseatpostLen", 0)):
                result.add_error("minseatpostLen", f"Для {size_label} минимальная высота подседельного штыря не может быть больше максимальной")
        except (ValueError, TypeError):
            pass

    if result.is_valid:
        result.data = bikes

    return result
