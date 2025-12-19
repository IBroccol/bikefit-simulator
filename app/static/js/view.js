import { InterfacePreview } from './preview_interface.js';

document.addEventListener("DOMContentLoaded", async() => {
    const ui = new InterfacePreview(window.element_ids);
    const bikesContainer = document.getElementById("pending-bikes");
    const sizeButtonsContainer = document.getElementById("size-buttons");

    // === Получение списка велосипедов ===
    async function fetchBikes() {
        try {
            const response = await fetch("/bikes/user_bikes");
            if (!response.ok) {
                bikesContainer.innerHTML = `<p style="color:red;">Ошибка загрузки данных (${response.status})</p>`;
                return;
            }

            const result = await response.json();
            const bikes = result.success ? result.data : [];
            bikesContainer.innerHTML = "";

            if (bikes.length === 0) {
                bikesContainer.innerHTML = "<p class='empty-message'>Нет добавленных моделей велосипедов</p>";
                return;
            }

            bikes.forEach(bike => {
                const item = document.createElement("div");
                item.className = "bike-item";
                item.dataset.id = bike.id;

                const ru_status = {
                    'private': 'Приватный',
                    'public': 'Публичный',
                    'pending': 'На рассмотрении'
                }

                if (bike.status == 'private') {
                    item.innerHTML = `
                    <div class="bike-info">
                        <h3>${bike.model}</h3>
                        <p><b>Статус:</b> ${ru_status[bike.status]}</p>
                        <p><b>Дата добавления:</b> ${new Date(bike.created_at).toLocaleString('ru-RU')}</p>
                    </div>
                    <div class="actions">
                        <button class="approve-btn" data-id="${bike.id}">Сделать публичной</button>
                        <button class="delete-btn" data-id="${bike.id}">Удалить</button>
                    </div>
                `;
                } else {
                    item.innerHTML = `
                    <div class="bike-info">
                        <h3>${bike.model}</h3>
                        <p><b>Статус:</b> ${ru_status[bike.status]}</p>
                        <p><b>Дата добавления:</b> ${new Date(bike.created_at).toLocaleString('ru-RU')}</p>
                    </div>
                    <div class="actions">
                        <button class="delete-btn" data-id="${bike.id}">Удалить</button>
                    </div>
                `;
                }

                // кнопки одобрения/отклонения
                item.querySelectorAll("button").forEach(btn => {
                    btn.addEventListener("click", async(e) => {
                        e.stopPropagation();
                        if (btn.classList.contains("approve-btn")) {
                            await sendOnModeration(bike.id);
                        } else {
                            await deleteBike(bike.id);
                        }
                    });
                });

                // выбор велосипеда
                item.addEventListener("click", () => onBikeSelect(item, bike));

                bikesContainer.appendChild(item);
            });
        } catch (err) {
            bikesContainer.innerHTML = `<p style="color:red;">Ошибка при получении данных</p>`;
        }
    }

    // === Обновление статуса велосипеда ===
    async function sendOnModeration(bike_id) {
        try {
            const response = await fetch("/bikes/set_pending", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ bike_id })
            });

            if (response.ok) {
                await fetchBikes();
            } else {
                alert("Ошибка при отправке на модерацию");
            }
        } catch (err) {
            alert("Ошибка при отправке запроса");
        }
    }

    async function deleteBike(bike_id) {
        try {
            const response = await fetch("/bikes/delete", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ bike_id })
            });

            if (response.ok) {
                await fetchBikes();
            } else {
                alert("Ошибка при обновлении статуса");
            }
        } catch (err) {
            alert("Ошибка при отправке запроса");
        }
    }

    // === Обработка выбора велосипеда ===
    async function onBikeSelect(item, bike) {
        ui.cur_bike_model = bike.model
        ui.drawer.clearCanvas();
        document.querySelectorAll(".bike-item").forEach(b => b.classList.remove("active"));
        item.classList.add("active");

        // удаляем старые кнопки размеров
        sizeButtonsContainer.innerHTML = "";

        // получаем размеры для выбранной модели
        try {
            const response = await fetch("/bikes/sizes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ bike_model_id: bike.id })
            });
            if (!response.ok) throw new Error("Ошибка при получении размеров");
            const result = await response.json();
            const sizes = result.success ? result.data : [];

            sizes.forEach(sizeObj => {
                const btn = document.createElement("button");
                btn.className = "size-btn";
                btn.textContent = sizeObj.size;
                btn.addEventListener("click", async() => {
                    // снимаем активность со всех кнопок
                    sizeButtonsContainer.querySelectorAll(".size-btn").forEach(b => b.classList.remove("active"));
                    btn.classList.add("active");
                    // вызываем preview для выбранного размера
                    await ui.onSizeChoice(sizeObj.size);
                });
                sizeButtonsContainer.appendChild(btn);
            });
        } catch (err) {
            // Silently handle error
        }
    }

    // === Инициализация ===
    await fetchBikes();
});