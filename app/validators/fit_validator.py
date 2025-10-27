import re
from typing import Dict, Any, Optional

class ValidationError:
    def __init__(self, field: str, message: str):
        self.field = field
        self.message = message

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
    
    # Поля антропометрии и их ограничения
    fields = {
        "height": {"min": 100, "max": 250, "name": "Рост"},
        "footLength": {"min": 200, "max": 400, "name": "Длина стопы"},
        "hip": {"min": 300, "max": 800, "name": "Длина бедра"},
        "lowerLeg": {"min": 300, "max": 800, "name": "Длина голени"},
        "torsoMax": {"min": 400, "max": 1000, "name": "Длина туловища"},
        "upperarm": {"min": 200, "max": 500, "name": "Длина плеча"},
        "forearm": {"min": 200, "max": 500, "name": "Длина предплечья"}
    }
    
    # Базовая валидация полей
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
    
    # Если есть ошибки в базовой валидации, не проверяем пропорции
    if not result.is_valid:
        return result
    
    # Валидация пропорций относительно роста
    height = data["height"] * 10
    
    # Длина стопы должна быть ~15% от роста
    foot_ratio = data["footLength"] / height
    if foot_ratio < 0.1:
        result.add_error("footLength", "Длина стопы слишком мала относительно роста")
    elif foot_ratio > 0.2:
        result.add_error("footLength", "Длина стопы слишком велика относительно роста")
    
    # Ширина таза должна быть ~25% от роста
    hip_ratio = data["hip"] / height
    if hip_ratio < 0.2:
        result.add_error("hip", "Длина бедра слишком мала относительно роста")
    elif hip_ratio > 0.3:
        result.add_error("hip", "Длина бедра слишком велика относительно роста")
    
    # Длина голени должна быть ~25% от роста
    lower_leg_ratio = data["lowerLeg"] / height
    if lower_leg_ratio < 0.2:
        result.add_error("lowerLeg", "Длина голени слишком мала относительно роста")
    elif lower_leg_ratio > 0.3:
        result.add_error("lowerLeg", "Длина голени слишком велика относительно роста")
    
    # Длина туловища должна быть ~30% от роста
    torso_ratio = data["torsoMax"] / height
    if torso_ratio < 0.2:
        result.add_error("torsoMax", "Длина туловища слишком мала относительно роста")
    elif torso_ratio > 0.4:
        result.add_error("torsoMax", "Длина туловища слишком велика относительно роста")
    
    # Длина плеча должна быть ~17% от роста
    upperarm_ratio = data["upperarm"] / height
    if upperarm_ratio < 0.15:
        result.add_error("upperarm", "Длина плеча слишком мала относительно роста")
    elif upperarm_ratio > 0.2:
        result.add_error("upperarm", "Длина плеча слишком велика относительно роста")
    
    # Длина предплечья должна быть ~15% от роста
    forearm_ratio = data["forearm"] / height
    if forearm_ratio < 0.1:
        result.add_error("forearm", "Длина предплечья слишком мала относительно роста")
    elif forearm_ratio > 0.2:
        result.add_error("forearm", "Длина предплечья слишком велика относительно роста")
    
    # Валидация пропорций между частями тела
    
    # Голень должна быть длиннее стопы
    if data["lowerLeg"] <= data["footLength"]:
        result.add_error("lowerLeg", "Длина голени должна быть больше длины стопы")
        result.add_error("footLength", "Длина стопы должна быть меньше длины голени")
    
    # Туловище должно быть длиннее голени
    if data["torsoMax"] <= data["lowerLeg"]:
        result.add_error("torsoMax", "Длина туловища должна быть больше длины голени")
        result.add_error("lowerLeg", "Длина голени должна быть меньше длины туловища")
    
    # Плечо и предплечье должны быть примерно одинаковыми (разница не более 20%)
    arm_diff = abs(data["upperarm"] - data["forearm"])
    arm_avg = (data["upperarm"] + data["forearm"]) / 2
    if arm_diff / arm_avg > 0.20:
        result.add_error("upperarm", "Длина плеча и предплечья сильно различаются")
        result.add_error("forearm", "Длина предплечья и плеча сильно различаются")
    
    # Сумма плеча и предплечья должна быть примерно равна длине туловища (разница не более 30%)
    arm_total = data["upperarm"] + data["forearm"]
    arm_torso_diff = abs(arm_total - data["torsoMax"])
    if arm_torso_diff / data["torsoMax"] > 0.30:
        result.add_error("upperarm", "Сумма длин рук несоответствует длине туловища")
        result.add_error("forearm", "Сумма длин рук несоответствует длине туловища")
        result.add_error("torsoMax", "Длина туловища несоответствует сумме длин рук")
    
    # Проверка общей длины ног (бедро + голень) относительно роста
    # Предполагаем, что длина бедра примерно равна длине голени
    estimated_leg_length = data["hip"] + data["lowerLeg"]
    leg_ratio = estimated_leg_length / height
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
    
    # Обязательные поля
    required_fields = {
        "size_id": "ID размера велосипеда",
        "name": "Название посадки",
        "seatHight": "Высота седла",
        "stemHight": "Высота выноса",
        "saddleOffset": "Смещение седла",
        "torsoAngle": "Угол наклона туловища",
        "shifterAngle": "Угол манеток"
    }
    
    for field, name in required_fields.items():
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
        # else:
        #     # Числовые поля с ограничениями
        #     if not isinstance(value, (int, float)):
        #         result.add_error(field, f"{name} должно быть числом")
        #     elif value < 0:
        #         result.add_error(field, f"{name} должно быть положительным числом")
        #     elif field in ["seatHight", "stemHight"] and (value < 50 or value > 150):
        #         result.add_error(field, f"{name} должно быть в диапазоне 50-150 см")
        #     elif field in ["saddleOffset"] and (value < -20 or value > 20):
        #         result.add_error(field, f"{name} должно быть в диапазоне -20 до 20 см")
        #     elif field in ["torsoAngle", "shifterAngle"] and (value < -90 or value > 90):
        #         result.add_error(field, f"{name} должно быть в диапазоне -90 до 90 градусов")
    
    if result.is_valid:
        result.data = {
            "size_id": data["size_id"],
            "name": data["name"].strip(),
            "seatHight": float(data["seatHight"]),
            "stemHight": float(data["stemHight"]),
            "saddleOffset": float(data["saddleOffset"]),
            "torsoAngle": float(data["torsoAngle"]),
            "shifterAngle": float(data["shifterAngle"])
        }
    
    return result

def validate_fit_request_data(data: Dict[str, Any]) -> ValidationResult:
    result = ValidationResult(True)
    
    if not data:
        result.add_error("data", "Отсутствуют данные запроса")
        return result
    
    fit_name = data.get("fit_name")
    size_id = data.get("size_id")
    
    if not fit_name or not isinstance(fit_name, str):
        result.add_error("fit_name", "Название посадки обязательно")
    elif len(fit_name.strip()) == 0:
        result.add_error("fit_name", "Название посадки не может быть пустым")
    
    if size_id is None:
        result.add_error("size_id", "ID размера велосипеда обязателен")
    elif not isinstance(size_id, int) or size_id <= 0:
        result.add_error("size_id", "ID размера велосипеда должен быть положительным числом")
    
    if result.is_valid:
        result.data = {
            "fit_name": fit_name.strip(),
            "size_id": size_id
        }
    
    return result