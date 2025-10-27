import { InterfacePreview } from './preview_interface.js';

document.addEventListener("DOMContentLoaded", async() => {
    const ui = new InterfacePreview(window.element_ids);
    const bikesContainer = document.getElementById("pending-bikes");
    const sizeButtonsContainer = document.getElementById("size-buttons");

    // === Получение списка велосипедов ===
    async function fetchBikes() {
        try {
            const response = await fetch("/bikes/pending");
            if (!response.ok) {
                bikesContainer.innerHTML = `<p style="color:red;">Ошибка загрузки данных (${response.status})</p>`;
                return;
            }

            const result = await response.json();
            const bikes = result.success ? result.data : [];
            bikesContainer.innerHTML = "";

            if (bikes.length === 0) {
                bikesContainer.innerHTML = "<p class='empty-message'>Нет моделей, ожидающих модерации.</p>";
                return;
            }

            bikes.forEach(bike => {
                const item = document.createElement("div");
                item.className = "bike-item";
                item.dataset.id = bike.id;

                item.innerHTML = `
                    <div class="bike-info">
                        <h3>${bike.model}</h3>
                        <p><b>ID:</b> ${bike.id}</p>
                        <p><b>Дата добавления:</b> ${new Date(bike.created_at).toLocaleString('ru-RU')}</p>
                    </div>
                    <div class="actions">
                        <button class="approve-btn" data-id="${bike.id}">Сделать публичной</button>
                        <button class="reject-btn" data-id="${bike.id}">Отклонить</button>
                    </div>
                `;

                // кнопки одобрения/отклонения
                item.querySelectorAll("button").forEach(btn => {
                    btn.addEventListener("click", async(e) => {
                        e.stopPropagation();
                        const is_public = btn.classList.contains("approve-btn");
                        await updatePrivacy(bike.id, is_public);
                    });
                });

                // выбор велосипеда
                item.addEventListener("click", () => onBikeSelect(item, bike));

                bikesContainer.appendChild(item);
            });
        } catch (err) {
            console.error(err);
            bikesContainer.innerHTML = `<p style="color:red;">Ошибка при получении данных</p>`;
        }
    }

    // === Обновление статуса велосипеда ===
    async function updatePrivacy(bike_id, is_public) {
        try {
            const response = await fetch("/bikes/set_visibility", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ bike_id, is_public })
            });

            if (response.ok) {
                await fetchBikes();
            } else {
                alert("Ошибка при обновлении статуса");
            }
        } catch (err) {
            console.error(err);
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
            console.error(err);
        }
    }

    // === Инициализация ===
    await fetchBikes();
});