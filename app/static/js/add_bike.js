import { errorHandler } from '/static/js/error_handler.js';

const SHARED_PARAMS = [
    "rimD", "tyreW", "stemAngle", "minStemHight", "maxStemHight",
    "barReach", "barDrop", "shifterReach", "saddleLen",
    "saddleRailLen", "saddleHeight", "minseatpostLen", "maxseatpostLen"
];

// Функция для показа ошибки под полем
function showFieldError(input, message) {
    if (!input) return;
    
    // Добавляем класс ошибки
    input.classList.add('error');
    
    // Проверяем, есть ли уже сообщение об ошибке
    let errorMsg = input.parentElement.querySelector('.field-error-message');
    
    if (!errorMsg) {
        errorMsg = document.createElement('span');
        errorMsg.className = 'field-error-message';
        input.parentElement.appendChild(errorMsg);
    }
    
    errorMsg.textContent = message;
}

// Функция для очистки ошибки под полем
function clearFieldError(input) {
    if (!input) return;
    
    input.classList.remove('error');
    
    const errorMsg = input.parentElement.querySelector('.field-error-message');
    if (errorMsg) {
        errorMsg.remove();
    }
}

// Функция для очистки всех ошибок
function clearAllFieldErrors() {
    document.querySelectorAll('input.error').forEach(input => {
        clearFieldError(input);
    });
}

// Удаление столбца
function removeColumn(btn) {
    const th = btn.closest("th");
    const table = document.getElementById("geometryTable");
    const colIndex = th.cellIndex;

    th.remove();

    // Удаляем td в каждой строке, кроме общих
    for (let row of table.tBodies[0].rows) {
        if (row.cells[0].classList.contains("shared-param")) continue;
        if (row.cells[0].classList.contains("section-title")) continue;
        if (row.cells[colIndex]) row.deleteCell(colIndex);
    }

    updateSharedColspan();
    updateRemoveButtons();
}

// Добавление нового размера (столбца)
function addColumn() {
    const table = document.getElementById("geometryTable");
    const headerRow = table.tHead.rows[0];

    const newTh = document.createElement("th");
    newTh.innerHTML = `
        <div class="header-cell">
            <input type="text" name="size" placeholder="Размер">
            <button type="button" class="btn btn-danger" title="Удалить столбец">×</button>
        </div>`;
    headerRow.appendChild(newTh);

    const removeBtn = newTh.querySelector(".btn-danger");
    removeBtn.addEventListener("click", () => removeColumn(removeBtn));

    // Добавляем ячейки параметров
    const newIndex = headerRow.cells.length - 1;
    for (let row of table.tBodies[0].rows) {
        const firstCell = row.cells[0];
        if (!firstCell) continue;

        // Пропускаем общие параметры и заголовки
        if (firstCell.classList.contains("shared-param") ||
            firstCell.classList.contains("section-title")) continue;

        // Получаем имя параметра из первого input в строке (из первого столбца с данными)
        const firstInput = row.cells[1]?.querySelector("input");
        if (!firstInput) continue;
        
        const param = firstInput.name;
        if (!param) continue;

        const newTd = document.createElement("td");
        newTd.innerHTML = `<input type="number" step="0.1" name="${param}_${newIndex - 1}">`;
        row.appendChild(newTd);
    }

    updateSharedColspan();
    updateRemoveButtons();
}

// Извлечение имени параметра из ячейки
function extractParamName(cell) {
    // Ищем input в следующей ячейке (второй столбец)
    const row = cell.parentElement;
    const secondCell = row.cells[1];
    if (secondCell) {
        const input = secondCell.querySelector("input");
        if (input && input.name) {
            return input.name;
        }
    }
    return null;
}

// Обновление colspan для общих параметров
function updateSharedColspan() {
    const table = document.getElementById("geometryTable");
    const totalCols = table.tHead.rows[0].cells.length;
    for (let row of table.tBodies[0].rows) {
        if (row.cells[0].classList.contains("shared-param")) {
            const inputCell = row.cells[1];
            inputCell.colSpan = totalCols - 1;
        }
    }
}

// Отображение / скрытие кнопок удаления
function updateRemoveButtons() {
    const removeButtons = document.querySelectorAll(".btn-danger[title='Удалить столбец']");
    const show = removeButtons.length > 1;
    removeButtons.forEach(btn => btn.style.display = show ? "inline-block" : "none");
}

// Валидация числового поля
function validateNumberField(value, fieldName, min, max) {
    if (value === null || value === undefined || value === "") {
        return null; // Пустое значение - проверяется отдельно для обязательных полей
    }
    
    const num = parseFloat(value);
    
    if (isNaN(num)) {
        return `${fieldName} должно быть числом`;
    }
    
    if (num < 0) {
        return `${fieldName} не может быть отрицательным`;
    }
    
    if (min !== undefined && num < min) {
        return `${fieldName} должно быть не менее ${min}`;
    }
    
    if (max !== undefined && num > max) {
        return `${fieldName} должно быть не более ${max}`;
    }
    
    return null;
}

// Отправка данных
async function sendBikes() {
    errorHandler.clearErrors();
    clearAllFieldErrors();
    
    const table = document.getElementById("geometryTable");
    const modelInput = document.querySelector('input[name="model"]');
    const model = modelInput.value.trim();
    
    if (!model) {
        modelInput.classList.add('error');
        errorHandler.showGeneralError("Введите модель велосипеда", "warning");
        return;
    }

    const headerCells = table.tHead.rows[0].cells;
    const sizes = [];
    const sizeInputs = [];
    
    for (let i = 1; i < headerCells.length; i++) {
        const sizeInput = headerCells[i].querySelector('input[type="text"]');
        const sizeValue = sizeInput ? sizeInput.value.trim() : "";
        sizes.push(sizeValue);
        sizeInputs.push(sizeInput);
    }
    
    // Проверка наличия хотя бы одного размера
    if (sizes.length === 0 || sizes.every(s => !s)) {
        errorHandler.showGeneralError("Необходимо указать хотя бы один размер велосипеда", "warning");
        return;
    }
    
    // Проверка уникальности размеров
    const uniqueSizes = new Set();
    let hasDuplicates = false;
    sizes.forEach((size, idx) => {
        if (size && uniqueSizes.has(size)) {
            if (sizeInputs[idx]) {
                sizeInputs[idx].classList.add('error');
            }
            hasDuplicates = true;
        }
        if (size) uniqueSizes.add(size);
    });
    
    if (hasDuplicates) {
        errorHandler.showGeneralError("Размеры должны быть уникальными", "warning");
        return;
    }

    // Собираем общие параметры
    const sharedValues = {};
    const sharedRequiredParams = ['rimD', 'tyreW', 'stemAngle', 'barReach', 'barDrop', 'saddleLen'];
    let missingSharedParams = [];
    
    for (let row of table.tBodies[0].rows) {
        if (row.cells[0].classList.contains("shared-param")) {
            const input = row.querySelector("input");
            if (input) {
                const param = input.name;
                const value = input.value.trim();
                
                // Проверка обязательных общих параметров
                if (sharedRequiredParams.includes(param) && value === "") {
                    showFieldError(input, 'Обязательное поле');
                    missingSharedParams.push(param);
                } else if (value !== "") {
                    clearFieldError(input);
                    sharedValues[param] = parseFloat(value);
                }
            }
        }
    }

    // Определение обязательных параметров для каждого размера
    const requiredParams = [
        'stack', 'reach', 'seatTube', 'seatAngle', 'headTube', 'headAngle',
        'chainstay', 'wheelbase', 'bbdrop', 'crankLen', 'stemLen'
    ];
    
    // Валидация и сборка данных
    let hasErrors = false;
    const bikes = [];
    
    for (let colIndex = 0; colIndex < sizes.length; colIndex++) {
        const size = sizes[colIndex];
        if (!size) continue; // Пропускаем пустые размеры
        
        const bike = { model, size };
        const missingParams = [];

        // Добавляем общие параметры
        Object.assign(bike, sharedValues);

        // Проверяем индивидуальные параметры для каждого размера
        for (let row of table.tBodies[0].rows) {
            const firstCell = row.cells[0];
            if (!firstCell) continue;

            // Пропускаем общие параметры и заголовки
            if (firstCell.classList.contains("shared-param") ||
                firstCell.classList.contains("section-title")) continue;

            const param = extractParamName(firstCell);
            if (!param) continue;

            let input = null;
            if (row.cells[colIndex + 1]) {
                input = row.cells[colIndex + 1].querySelector("input");
            }

            if (input) {
                const value = input.value.trim();
                
                // Получаем базовое имя параметра (без суффикса _0, _1, _2)
                const baseParam = param.replace(/_\d+$/, '');
                
                // Проверка обязательных параметров
                if (requiredParams.includes(baseParam)) {
                    if (value === "") {
                        missingParams.push(baseParam);
                        showFieldError(input, 'Обязательное поле');
                        input.setAttribute('data-param-name', baseParam);
                        hasErrors = true;
                    } else {
                        const numValue = parseFloat(value);
                        if (isNaN(numValue)) {
                            showFieldError(input, 'Должно быть числом');
                            input.setAttribute('data-param-name', baseParam);
                            hasErrors = true;
                        } else {
                            clearFieldError(input);
                            bike[baseParam] = numValue;  // Используем базовое имя без суффикса
                            input.setAttribute('data-param-name', baseParam);
                        }
                    }
                } else if (value !== "") {
                    // Опциональные параметры
                    const numValue = parseFloat(value);
                    if (!isNaN(numValue)) {
                        clearFieldError(input);
                        bike[baseParam] = numValue;  // Используем базовое имя без суффикса
                        input.setAttribute('data-param-name', baseParam);
                    } else {
                        showFieldError(input, 'Должно быть числом');
                    }
                }
            }
        }
        
        if (missingParams.length > 0) {
            // Не показываем сообщение сразу, накапливаем ошибки
            hasErrors = true;
        }
        
        bikes.push(bike);
    }
    
    // Показываем все ошибки одним сообщением
    if (missingSharedParams.length > 0 || hasErrors) {
        let errorMessages = [];
        
        if (missingSharedParams.length > 0) {
            errorMessages.push(`Не заполнены обязательные общие параметры: ${missingSharedParams.join(', ')}`);
        }
        
        if (hasErrors) {
            errorMessages.push('Не заполнены обязательные параметры для одного или нескольких размеров');
        }
        
        errorHandler.showGeneralError(errorMessages.join('. '), "warning");
        return;
    }
    
    if (bikes.length === 0) {
        errorHandler.showGeneralError("Необходимо указать хотя бы один размер велосипеда", "warning");
        return;
    }

    // Отправка данных на сервер
    try {
        const response = await fetch("/bikes/add", {
            method: "POST",
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(bikes)
        });

        const result = await response.json();

        if (result.success) {
            errorHandler.showSuccess('Велосипед успешно добавлен!', () => {
                window.location.href = '/dashboard';
            });
        } else if (result.errors && Array.isArray(result.errors)) {
            // Обработка ошибок валидации от бекенда
            let hasGeneralError = false;
            
            result.errors.forEach(error => {
                if (error.field === 'data' || error.field === 'general') {
                    errorHandler.showGeneralError(error.message, 'error');
                    hasGeneralError = true;
                } else if (error.field) {
                    // Находим и подсвечиваем поле с ошибкой
                    // Ищем по точному имени (для общих параметров типа rimD, tyreW)
                    const inputsByExactName = document.querySelectorAll(`input[name="${error.field}"]`);
                    
                    // Ищем по паттерну имени (для индивидуальных параметров типа stack, stack_1, stack_2)
                    const inputsByPattern = document.querySelectorAll(`input[name^="${error.field}"]`);
                    
                    // Ищем по data-param-name
                    const inputsByDataAttr = document.querySelectorAll(`input[data-param-name="${error.field}"]`);
                    
                    // Объединяем все найденные поля, исключая дубликаты
                    const allInputs = new Set([...inputsByExactName, ...inputsByPattern, ...inputsByDataAttr]);
                    
                    if (allInputs.size > 0) {
                        allInputs.forEach(input => {
                            showFieldError(input, error.message);
                        });
                        
                        // Показываем общее сообщение об ошибке
                        if (!hasGeneralError) {
                            errorHandler.showGeneralError('Исправьте ошибки в полях', 'error');
                            hasGeneralError = true;
                        }
                    }
                }
            });
            
            if (!hasGeneralError) {
                errorHandler.showGeneralError('Исправьте ошибки в форме', 'warning');
            }
        } else if (result.error) {
            errorHandler.showGeneralError(result.error, 'error');
        } else {
            errorHandler.showGeneralError('Произошла неизвестная ошибка', 'error');
        }
    } catch (error) {
        errorHandler.showGeneralError('Ошибка сети. Проверьте подключение к интернету и попробуйте снова.', 'error');
    }
}

// Привязка событий
document.addEventListener('DOMContentLoaded', function() {
    // Инициализация errorHandler
    errorHandler.init('error-container', 'success-container');
    
    // Используем правильные селекторы для обновлённых классов
    const addSizeBtn = document.getElementById('addSizeBtn');
    const submitBtn = document.getElementById('submitBtn');

    if (addSizeBtn) {
        addSizeBtn.addEventListener("click", addColumn);
    }

    if (submitBtn) {
        submitBtn.addEventListener("click", sendBikes);
    }

    // Привязываем существующие кнопки удаления
    document.querySelectorAll(".btn-danger[title='Удалить столбец']").forEach(btn =>
        btn.addEventListener("click", () => removeColumn(btn))
    );

    // Инициализация
    updateSharedColspan();
    updateRemoveButtons();
});
` and `