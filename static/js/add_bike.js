let colIndex = 1;

// Показываем/скрываем кнопки удаления
function updateRemoveButtons() {
    const table = document.getElementById('geometryTable');
    const headerCells = table.tHead.rows[0].cells;
    const totalCols = headerCells.length - 1; // без колонки "Параметр"

    for (let i = 1; i < headerCells.length; i++) {
        const btn = headerCells[i].querySelector('.remove-col-btn');
        if (btn) {
            btn.style.display = totalCols <= 1 ? 'none' : 'inline-block';
        }
    }
}

export function addColumn() {
    const table = document.getElementById('geometryTable');
    const headerRow = table.tHead.rows[0];

    // создаём новый заголовок
    const newTh = document.createElement('th');
    newTh.innerHTML = `
        <div class="header-cell">
            <input type="text" name="size" placeholder="Размер">
            <button type="button" class="remove-col-btn" title="Удалить столбец">×</button>
        </div>
    `;
    headerRow.appendChild(newTh);

    // навешиваем обработчик на кнопку удаления
    const removeBtn = newTh.querySelector('.remove-col-btn');
    removeBtn.addEventListener('click', () => removeColumn(removeBtn));

    // добавляем пустые ячейки для каждой строки
    for (let row of table.tBodies[0].rows) {
        if (row.cells.length === 1) continue; // пропускаем заголовки секций
        const param = row.cells[0].innerText;
        const newTd = document.createElement('td');
        newTd.innerHTML = `<input type="number" step="0.1" name="${param}_${colIndex}">`;
        row.appendChild(newTd);
    }

    colIndex++;
    updateRemoveButtons();
}

export function removeColumn(button) {
    const th = button.closest('th'); // находим th с кнопкой
    const table = th.closest('table');
    const colIndex = Array.from(th.parentNode.children).indexOf(th); // реальный индекс столбца

    // не удаляем единственный столбец
    if (table.tHead.rows[0].cells.length <= 2) return;

    for (let row of table.rows) {
        if (row.cells.length > colIndex) {
            row.deleteCell(colIndex);
        }
    }

    updateRemoveButtons();
}

export async function sendBikes() {
    const table = document.getElementById('geometryTable');
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

    const bikes = sizes.map((size, col) => {
        const bike = { model, size };
        for (let row of table.tBodies[0].rows) {
            if (row.cells.length <= col + 1) continue; // пропускаем заголовки
            const param = row.cells[0].innerText.trim();
            const valInput = row.cells[col + 1].querySelector('input');
            const val = valInput && valInput.value !== "" ? parseFloat(valInput.value) : null;
            bike[param] = val;
        }
        return bike;
    });

    try {
        const res = await fetch("/add_bike", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(bikes)
        });

        const result = await res.json();
        alert(result.status === "ok" ? "Успешно сохранено!" : "Ошибка при сохранении");
    } catch (err) {
        console.error(err);
        alert("Ошибка сети");
    }
}

// инициализация
document.addEventListener('DOMContentLoaded', () => {
    updateRemoveButtons();

    document.querySelector('.add-col-btn').addEventListener('click', addColumn);
    document.querySelector('.submit-btn').addEventListener('click', sendBikes);

    // навесим обработчики на существующие кнопки удаления
    document.querySelectorAll('.remove-col-btn').forEach(btn => {
        btn.addEventListener('click', () => removeColumn(btn));
    });
});