from typing import Dict, Any, Optional, List

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

def validate_bike_data(bikes: List[Dict[str, Any]]) -> ValidationResult:
    """
    Валидация данных велосипеда - проверка диапазонов значений
    
    Фронтенд проверяет:
    - Наличие модели
    - Наличие размеров
    - Заполнение всех обязательных полей
    - Уникальность размеров
    
    Бекенд проверяет:
    - Корректность числовых значений (диапазоны)
    - Логические связи между параметрами
    """
    result = ValidationResult(True)
    
    if not bikes or not isinstance(bikes, list):
        result.add_error("data", "Отсутствуют данные велосипеда")
        return result
    
    if len(bikes) == 0:
        result.add_error("data", "Необходимо указать модель и размер велосипеда")
        return result
    
    # Диапазоны для параметров геометрии рамы
    param_ranges = {
        "stack": {"min": 400, "max": 700, "name": "Стэк"},
        "reach": {"min": 300, "max": 500, "name": "Рич"},
        "seatTube": {"min": 300, "max": 700, "name": "Длина подседельной трубы"},
        "seatAngle": {"min": 65, "max": 80, "name": "Угол подседельной трубы"},
        "headTube": {"min": 80, "max": 300, "name": "Длина рулевого стакана"},
        "headAngle": {"min": 65, "max": 75, "name": "Угол рулевого стакана"},
        "chainstay": {"min": 350, "max": 500, "name": "Длина нижних перьев"},
        "wheelbase": {"min": 900, "max": 1300, "name": "Колёсная база"},
        "bbdrop": {"min": 50, "max": 100, "name": "Провис каретки"},
        "crankLen": {"min": 160, "max": 180, "name": "Длина шатунов"},
        "stemLen": {"min": 60, "max": 150, "name": "Длина выноса"},
        "rimD": {"min": 500, "max": 650, "name": "Диаметр обода"},
        "tyreW": {"min": 20, "max": 60, "name": "Ширина покрышек"},
        "stemAngle": {"min": -20, "max": 20, "name": "Угол выноса"},
        "barReach": {"min": 60, "max": 120, "name": "Рич руля"},
        "barDrop": {"min": 100, "max": 150, "name": "Дроп руля"},
        "saddleLen": {"min": 240, "max": 300, "name": "Длина седла"},
        "minStemHight": {"min": 0, "max": 100, "name": "Мин. высота установки выноса"},
        "maxStemHight": {"min": 0, "max": 200, "name": "Макс. высота установки выноса"},
        "shifterReach": {"min": 60, "max": 100, "name": "Рич тормозных рукояток"},
        "saddleRailLen": {"min": 30, "max": 60, "name": "Длина рейлов седла"},
        "saddleHeight": {"min": 20, "max": 50, "name": "Высота седла"},
        "minseatpostLen": {"min": 0, "max": 200, "name": "Мин. высота установки подседельного штыря"},
        "maxseatpostLen": {"min": 100, "max": 250, "name": "Макс. высота установки подседельного штыря"}
    }
    
    # Опциональные параметры с значениями по умолчанию
    optional_defaults = {
        "minStemHight": 30,
        "maxStemHight": 70,
        "shifterReach": 50,
        "saddleRailLen": 60,
        "saddleHeight": 50,
        "minseatpostLen": 50,
        "maxseatpostLen": 250
    }
    
    # Валидация каждого размера
    for idx, bike in enumerate(bikes):
        size = bike.get("size", "").strip()
        size_label = f"размер '{size}'" if size else f"размер #{idx + 1}"
        
        # Проверка всех параметров на соответствие диапазонам
        for param, limits in param_ranges.items():
            value = bike.get(param)
            
            # Если параметр отсутствует и он опциональный, устанавливаем значение по умолчанию
            if (value is None or value == "") and param in optional_defaults:
                bike[param] = optional_defaults[param]
                continue
            
            # Если параметр присутствует, проверяем его значение
            if value is not None and value != "":
                try:
                    value = float(value)
                    bike[param] = value  # Сохраняем преобразованное значение
                    
                    if value < limits["min"]:
                        # Добавляем индекс к имени поля для точной идентификации
                        field_name = f"{param}_{idx}" if idx > 0 else param
                        result.add_error(
                            field_name,
                            f"{limits['name']} для {size_label} слишком мало (минимум {limits['min']})"
                        )
                    elif value > limits["max"]:
                        # Добавляем индекс к имени поля для точной идентификации
                        field_name = f"{param}_{idx}" if idx > 0 else param
                        result.add_error(
                            field_name,
                            f"{limits['name']} для {size_label} слишком велико (максимум {limits['max']})"
                        )
                except (ValueError, TypeError):
                    # Добавляем индекс к имени поля для точной идентификации
                    field_name = f"{param}_{idx}" if idx > 0 else param
                    result.add_error(
                        field_name,
                        f"{limits['name']} для {size_label} должно быть числом"
                    )
        
        # Проверка логических связей между параметрами
        if bike.get("minStemHight") is not None and bike.get("maxStemHight") is not None:
            try:
                min_stem = float(bike.get("minStemHight"))
                max_stem = float(bike.get("maxStemHight"))
                if min_stem > max_stem:
                    # Для shared параметров индекс не добавляем
                    result.add_error(
                        "minStemHight",
                        f"Для {size_label} минимальная высота выноса не может быть больше максимальной"
                    )
            except (ValueError, TypeError):
                pass
        
        if bike.get("minseatpostLen") is not None and bike.get("maxseatpostLen") is not None:
            try:
                min_post = float(bike.get("minseatpostLen"))
                max_post = float(bike.get("maxseatpostLen"))
                if min_post > max_post:
                    # Для shared параметров индекс не добавляем
                    result.add_error(
                        "minseatpostLen",
                        f"Для {size_label} минимальная высота подседельного штыря не может быть больше максимальной"
                    )
            except (ValueError, TypeError):
                pass
    
    if result.is_valid:
        result.data = bikes
    
    return result

def validate_bike_model(model: str) -> ValidationResult:
    """Валидация названия модели велосипеда"""
    result = ValidationResult(True)
    
    if not model or not model.strip():
        result.add_error("model", "Введите модель велосипеда")
        return result
    
    model = model.strip()
    
    if len(model) < 2:
        result.add_error("model", "Название модели должно содержать не менее 2 символов")
    elif len(model) > 100:
        result.add_error("model", "Название модели должно содержать не более 100 символов")
    
    if result.is_valid:
        result.data = {"model": model}
    
    return result