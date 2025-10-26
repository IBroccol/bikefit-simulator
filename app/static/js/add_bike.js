const SHARED_PARAMS = [
    "rimD", "tyreW", "stemAngle", "minStemHight", "maxStemHight",
    "barReach", "barDrop", "shifterReach", "saddleLen",
    "saddleRailLen", "saddleHeight", "minseatpostLen", "maxseatpostLen"
];

// Удаление столбца
function removeColumn(btn) {
    const th = btn.closest("th");
    const table = document.getElementById("geometryTable");
    const colIndex = th.cellIndex;

    th.remove();

    // Удаляем td в каждой строке, кроме общих
    for (let row of table.tBodies[0].rows) {
        if (row.classList.contains("shared-param")) continue;
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
            <button type="button" class="remove-col-btn" title="Удалить столбец">×</button>
        </div>`;
    headerRow.appendChild(newTh);

    const removeBtn = newTh.querySelector(".remove-col-btn");
    removeBtn.addEventListener("click", () => removeColumn(removeBtn));

    // Добавляем ячейки параметров
    const newIndex = headerRow.cells.length - 1;
    for (let row of table.tBodies[0].rows) {
        const firstCell = row.cells[0];
        if (!firstCell) continue;
        const cellClass = firstCell.className;
        if (cellClass.includes("shared-param") || cellClass.includes("section-title")) continue;

        const param = firstCell.innerText.trim();
        const newTd = document.createElement("td");
        newTd.innerHTML = `<input type="number" step="0.1" name="${param}_${newIndex - 1}">`;
        row.appendChild(newTd);
    }


    updateSharedColspan();
    updateRemoveButtons();
}

// Обновление colspan для общих параметров
function updateSharedColspan() {
    const table = document.getElementById("geometryTable");
    const totalCols = table.tHead.rows[0].cells.length;
    for (let row of table.tBodies[0].rows) {
        if (row.classList.contains("shared-param")) {
            const inputCell = row.cells[1];
            inputCell.colSpan = totalCols - 1;
        }
    }
}

// Отображение / скрытие кнопок удаления
function updateRemoveButtons() {
    const removeButtons = document.querySelectorAll(".remove-col-btn");
    const show = removeButtons.length > 1;
    removeButtons.forEach(btn => btn.style.display = show ? "inline-block" : "none");
}

// Отправка данных
async function sendBikes() {
    const table = document.getElementById("geometryTable");
    const model = document.querySelector('input[name="model"]').value.trim();
    if (!model) {
        alert("Введите модель велосипеда");
        return;
    }

    const headerCells = table.tHead.rows[0].cells;
    const sizes = [];
    for (let i = 1; i < headerCells.length; i++) {
        const sizeInput = headerCells[i].querySelector('input[type="text"]');
        sizes.push(sizeInput ? sizeInput.value.trim() : `size${i}`);
    }

    const sharedValues = {};
    for (let row of table.tBodies[0].rows) {
        const param = row.cells[0].innerText.trim();
        if (SHARED_PARAMS.includes(param)) {
            const input = row.querySelector("input");
            if (input && input.value !== "")
                sharedValues[param] = parseFloat(input.value);
        }
    }

    const bikes = sizes.map((size, col) => {
        const bike = { model, size };
        for (let row of table.tBodies[0].rows) {
            let param = "";
            const firstCell = row.cells[0];
            if (!firstCell) continue;

            // Игнорируем строки-заголовки и shared, если нужно
            if (firstCell.classList.contains("section-title")) continue;

            // Берём текстовый узел после tooltip
            for (let node of firstCell.childNodes) {
                if (node.nodeType === Node.TEXT_NODE) {
                    const txt = node.textContent.trim();
                    if (txt) {
                        param = txt;
                        break;
                    }
                }
            }
            console.log(row, param)
            if (!param) continue; // если не нашли текст, пропускаем


            console.log(sharedValues)
            if (SHARED_PARAMS.includes(param)) {
                const sharedInput = row.querySelector("input");
                bike[param] = sharedInput && sharedInput.value !== "" ? parseFloat(sharedInput.value) : null;
            } else {
                let input = null;
                if (row.cells[col + 1]) {
                    input = row.cells[col + 1].querySelector("input");
                }
                bike[param] = input && input.value !== "" ? parseFloat(input.value) : null;
            }

        }
        return bike;
    });

    try {
        const res = await fetch("/bikes/add", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(bikes)
        });
        const result = await res.json();
        alert(result.success ? "✅ Успешно сохранено!" : "❌ Ошибка при сохранении");
    } catch (err) {
        console.error(err);
        alert("Ошибка сети");
    }
}

// Привязка событий
document.querySelector(".add-col-btn").addEventListener("click", addColumn);
document.querySelector(".submit-btn").addEventListener("click", sendBikes);
document.querySelectorAll(".remove-col-btn").forEach(btn =>
    btn.addEventListener("click", () => removeColumn(btn))
);

updateSharedColspan();
updateRemoveButtons();