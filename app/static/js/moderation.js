document.addEventListener("DOMContentLoaded", async() => {
    const container = document.getElementById("pending-bikes");

    async function fetchBikes() {
        try {
            const response = await fetch("/bikes/pending");
            if (!response.ok) {
                container.innerHTML = `<p style="color:red;">Ошибка загрузки данных (${response.status})</p>`;
                return;
            }

            const bikes = await response.json();
            container.innerHTML = "";

            if (bikes.length === 0) {
                container.innerHTML = "<p class='empty-message'>Нет моделей, ожидающих модерации.</p>";
                return;
            }

            bikes.forEach(bike => {
                const card = document.createElement("div");
                card.className = "bike-card";

                card.innerHTML = `
                    <h3>${bike.model} (${bike.size})</h3>
                    <p><b>ID:</b> ${bike.id}</p>
                    <p><b>Дата добавления:</b> ${bike.created_at}</p>
                    <div class="geometry">
                        <span><b>Stack:</b> ${bike.stack}</span>
                        <span><b>Reach:</b> ${bike.reach}</span>
                        <span><b>Wheelbase:</b> ${bike.wheelbase}</span>
                        <span><b>Head Angle:</b> ${bike.headAngle}°</span>
                        <span><b>Seat Angle:</b> ${bike.seatAngle}°</span>
                        <span><b>Chainstay:</b> ${bike.chainstay} мм</span>
                        <span><b>Crank Len:</b> ${bike.crankLen} мм</span>
                        <span><b>Stem Len:</b> ${bike.stemLen} мм</span>
                        <span><b>Tyre W:</b> ${bike.tyreW} мм</span>
                    </div>
                    <div class="actions">
                        <button class="approve-btn" data-id="${bike.id}">Сделать публичной</button>
                        <button class="reject-btn" data-id="${bike.id}">Отклонить</button>
                    </div>
                `;

                container.appendChild(card);
            });

            attachButtonHandlers();
        } catch (err) {
            console.error(err);
            container.innerHTML = `<p style="color:red;">Ошибка при получении данных</p>`;
        }
    }

    function attachButtonHandlers() {
        document.querySelectorAll(".approve-btn").forEach(btn => {
            btn.addEventListener("click", async() => {
                const bike_id = btn.dataset.id;
                await updatePrivacy(bike_id, true);
            });
        });

        document.querySelectorAll(".reject-btn").forEach(btn => {
            btn.addEventListener("click", async() => {
                const bike_id = btn.dataset.id;
                await updatePrivacy(bike_id, false);
            });
        });
    }

    async function updatePrivacy(bike_id, is_public) {
        try {
            const response = await fetch("/bikes/set_privacy", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ bike_id, is_public })
            });

            if (response.ok) {
                await fetchBikes(); // обновляем список после изменения
            } else {
                alert("Ошибка при обновлении статуса");
            }
        } catch (err) {
            console.error(err);
            alert("Ошибка при отправке запроса");
        }
    }

    fetchBikes();
});