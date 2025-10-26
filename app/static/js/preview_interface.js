import { Drawer } from './canvas_drawer.js';

export class InterfacePreview {
    constructor(element_ids) {
        this.cur_bike_id = null;
        this.cur_bike_model = null;
        this.cur_size = null;

        this.drawer = new Drawer(element_ids.canvas);
        this.bikeList = document.getElementById(element_ids.bikeList);
        this.sizeButtons = document.getElementById(element_ids.sizeButtons);

        this.setupEventListeners();
    }

    setupEventListeners() {
        // Выбор размера велосипеда
        // this.sizeSelect.addEventListener("change", async() => {
        //     const size = this.sizeSelect.value;
        //     if (!this.cur_bike_id || !size) return;
        //     await this.onSizeChoice(size);
        // });
    }

    async fetchSizes(bike_model) {
        try {
            const response = await fetch('/bikes/sizes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bike_model })
            });
            if (!response.ok) throw new Error("Ошибка при получении размеров");
            return await response.json();
        } catch (error) {
            console.error("Ошибка при загрузке размеров:", error);
            return [];
        }
    }

    async onBikeSelect(bike_model) {
        this.cur_bike_model = bike_model;

        // Очистим canvas при смене модели
        this.drawer.clearCanvas();

        // Очистим старые кнопки размеров
        const sizeContainer = this.sizeButtons
        sizeContainer.innerHTML = "";

        // Получаем размеры для выбранной модели
        const sizes = await this.fetchSizes(bike_model);

        if (sizes.length === 0) {
            sizeContainer.innerHTML = "<p style='color:#777;'>Нет доступных размеров</p>";
            return;
        }

        // Создаём кнопки для каждого размера
        sizes.forEach(size => {
            const btn = document.createElement("button");
            btn.textContent = size;
            btn.className = "size-btn";

            btn.addEventListener("click", async() => {
                // Снятие выделения с других кнопок
                document.querySelectorAll(".size-btn").forEach(b => b.classList.remove("active"));
                btn.classList.add("active");

                this.cur_size = size;
                await this.onSizeChoice(size);
            });

            sizeContainer.appendChild(btn);
        });
    }


    renderSizeOptions(sizes) {
        this.sizeSelect.innerHTML = `<option value="">Выберите размер...</option>`;
        sizes.forEach(size => {
            const opt = document.createElement("option");
            opt.value = size;
            opt.textContent = size;
            this.sizeSelect.appendChild(opt);
        });
    }

    async onSizeChoice(size) {
        this.cur_size = size;
        this.drawer.blur()
        let bike_id = await this.fetchBikeId()
        try {
            const bike_geo = await this.getBikeGeo(bike_id);
            this.drawer.INIT_GEOMETRY = bike_geo;
            this.drawer.draw_preview();
        } catch (err) {
            console.error("Ошибка при получении геометрии:", err);
        }
    }

    async getBikeGeo(bike_id) {
        try {
            const response = await fetch("/bikes/geometry", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ bike_id })
            });
            if (response.ok) return await response.json();
            throw new Error("Ошибка при получении геометрии");
        } catch (error) {
            console.error("Ошибка при запросе /bikes/geometry:", error);
            throw error;
        }
    }

    async fetchBikeId() {
        try {
            const response = await fetch('/bikes/id', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bike_model: this.cur_bike_model, size: this.cur_size })
            });

            if (!response.ok) throw new Error("Ошибка при получении данных");
            return await response.json();
        } catch (error) {
            console.error("Ошибка:", error);
            return [];
        }
    }
}