import { Drawer } from './canvas_drawer.js'
import { distance } from './geometry-helpers.js'

export class Interface {
    constructor(element_ids) {
        console.log(element_ids)
        this.cur_bike_model_id = null;
        this.cur_fit_name = null;

        this.drawer = new Drawer(element_ids.canvas)

        this.bikeSearch = document.getElementById(element_ids.bikeSearch);
        this.bikeList = document.getElementById(element_ids.bikeList);
        this.sizeSelect = document.getElementById(element_ids.sizeSelect);

        this.fitSearch = document.getElementById(element_ids.fitSearch);
        this.fitList = document.getElementById(element_ids.fitList);

        this.fitInput = document.getElementById(element_ids.fitInput);
        this.saveButton = document.getElementById(element_ids.saveButton);

        this.resetButton = document.getElementById(element_ids.resetButton);

        console.log(this)

        this.setupEventListeners()
        this.getAnthro()
        this.fetchBikes()
    }

    setupEventListeners() {
        this.saveButton.addEventListener("click", () => this.saveFit());
        this.resetButton.addEventListener("click", () => this.drawer.reset());

        this.bikeSearch.addEventListener("focus", async() => {
            // const savedBikes = await this.fetchBikes();
            console.log(this.savedBikes)
            this.renderAutocompleteList(this.bikeList, this.savedBikes, this.bikeSearch, this.onBikeChoise.bind(this));
        });
        this.setupAutocompleteHide(this.bikeList, this.bikeSearch);

        this.sizeSelect.addEventListener("change", () => {
            const size = this.sizeSelect.value;
            if (size !== "Select size") {
                this.onSizeChoise(size);
            } else {
                this.drawer.clearCanvas()
                this.fitSearch.value = ""
            }
        });

        this.fitSearch.addEventListener("focus", async() => {
            const savedFits = await this.fetchFits();
            this.renderAutocompleteList(this.fitList, savedFits, this.fitSearch, this.onFitChoise.bind(this));
        });
        this.setupAutocompleteHide(this.fitList, this.fitSearch);
    }

    async fetchSizes(bike_model_id) {
        try {
            const response = await fetch('/bikes/sizes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bike_model_id })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Ошибка при получении размеров");
            }

            const result = await response.json();
            if (!result.success) {
                throw new Error(result.error || "Ошибка при получении размеров");
            }

            // Сохраняем размеры с их ID
            this.savedSizes = {};
            const sizes = [];
            result.data.forEach(item => {
                this.savedSizes[item.size] = item.id;
                sizes.push(item.size);
            });
            return sizes;
        } catch (error) {
            console.error("Ошибка:", error);
            this.showError("Не удалось загрузить размеры велосипеда: " + error.message);
            return [];
        }
    }

    renderSizeOptions(sizes) {
        this.sizeSelect.innerHTML = '<option>Select size</option>';
        sizes.forEach(size => {
            const opt = document.createElement("option");
            opt.value = size;
            opt.textContent = size;
            this.sizeSelect.appendChild(opt);
        });
    }

    async onSizeChoise(size) {
        if (size != this.cur_size) {
            this.fitSearch.value = ""
            this.fitInput.value = ""
        }
        this.cur_size = size

        this.cur_size_id = this.savedSizes[size];
        this.drawer.blur()

        const bike_geo = await this.getBikeGeo(this.cur_size_id)
        this.drawer.INIT_GEOMETRY = bike_geo

        this.drawer.INIT_FIT = await this.getBasicFitData(this.cur_size_id)
        console.log(this.drawer)
        this.drawer.draw()
    }

    async fetchBikes() {
        try {
            const response = await fetch('/bikes/list', {
                method: 'GET',
                credentials: "include",
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Ошибка при получении данных");
            }

            const data = await response.json();
            // Создаем словарь с ключом bike.model и значением bike.id
            this.savedBikes = {};
            data.data.forEach(bike => {
                this.savedBikes[bike.model] = bike.id;
            });
        } catch (error) {
            console.error("Ошибка:", error);
            this.savedBikes = {};
            this.showError("Не удалось загрузить список велосипедов: " + error.message);
        }
    }

    async fetchFits() {
        if (this.cur_bike_model_id === null) {
            console.error("Ошибка: не выбран велосипед");
            return [];
        }
        try {
            const response = await fetch('/fits/list', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: "include",
                body: JSON.stringify({ bike_id: this.cur_bike_model_id, size_id: this.cur_size_id })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Ошибка при получении данных');
            }

            const result = await response.json();
            if (!result.success) {
                throw new Error(result.error || 'Ошибка при получении данных');
            }

            return result.data;
        } catch (error) {
            console.error('Ошибка:', error);
            this.showError('Не удалось загрузить посадки: ' + error.message);
            return [];
        }
    }

    renderAutocompleteList(list, items, input, click_fun) {
        list.innerHTML = "";
        // Если items - это словарь, получаем ключи для отображения
        const itemKeys = Array.isArray(items) ? items : Object.keys(items);
        itemKeys.forEach(item => {
            const listItem = document.createElement("div");
            listItem.textContent = item;
            listItem.classList.add("autocomplete-item");

            listItem.addEventListener("mousedown", async(event) => {
                input.value = item;
                list.style.display = "none";
                await click_fun(item)
            });

            list.appendChild(listItem);
        });
        list.style.display = itemKeys.length ? "block" : "none";
    }

    setupAutocompleteHide(list, input) {
        document.addEventListener("mousedown", (e) => {
            if (!input.contains(e.target) && !list.contains(e.target)) {
                list.style.display = "none";
            }
        });
    }

    async saveFit() {
        const name = this.fitInput.value.trim();

        if (!name) {
            this.showError("Введите название посадки перед сохранением!");
            document.getElementById("fitInput").focus();
            return;
        }

        const fitSettings = this.getFitSettings();
        fitSettings.name = name;

        //console.log(fitSettings)

        try {
            const response = await fetch("/fits/save", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(fitSettings)
            });

            const result = await response.json();

            if (result.success) {
                this.showSuccess("Настройки успешно сохранены!");
                this.fitInput.value = "";
            } else {
                if (result.errors) {
                    const errorMsg = result.errors.map(e => e.message).join(", ");
                    this.showError("Ошибка валидации: " + errorMsg);
                } else {
                    this.showError(result.error || "Ошибка при сохранении!");
                }
            }
        } catch (error) {
            console.error("Ошибка:", error);
            this.showError("Ошибка сети при сохранении: " + error.message);
        }
    }

    async getBikeGeo(size_id) {
        try {
            const response = await fetch('/bikes/geometry', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ size_id: size_id })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Ошибка при получении данных');
            }

            const result = await response.json();
            if (!result.success) {
                throw new Error(result.error || 'Ошибка при получении данных');
            }

            return result.data;
        } catch (error) {
            console.error('Ошибка:', error);
            this.showError('Не удалось загрузить геометрию велосипеда: ' + error.message);
            throw error;
        }
    }

    async getFitData(fit_name, size_id) {
        try {
            const response = await fetch('/fits/get', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: "include",
                body: JSON.stringify({ fit_name: fit_name, size_id: size_id })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Ошибка при получении данных');
            }

            const result = await response.json();
            if (!result.success) {
                throw new Error(result.error || 'Ошибка при получении данных');
            }

            return result.data;
        } catch (error) {
            console.error('Ошибка:', error);
            this.showError('Не удалось загрузить посадку: ' + error.message);
            throw error;
        }
    }

    async getBasicFitData(size_id) {
        try {
            const response = await fetch('/fits/basic', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: "include",
                body: JSON.stringify({ size_id: size_id })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Ошибка при получении данных');
            }

            const result = await response.json();
            if (!result.success) {
                throw new Error(result.error || 'Ошибка при получении данных');
            }

            return result.data;
        } catch (error) {
            console.error('Ошибка:', error);
            this.showError('Не удалось загрузить базовую посадку: ' + error.message);
            throw error;
        }
    }

    async onBikeChoise(bike_model) {
        if (bike_model != this.cur_bike_model)
            this.drawer.clearCanvas()
        this.fitSearch.value = ""
        this.fitInput.value = ""
        this.cur_bike_model = bike_model
        this.cur_bike_model_id = this.savedBikes[bike_model];

        const sizes = await this.fetchSizes(this.cur_bike_model_id);
        this.renderSizeOptions(sizes);
    }

    async onFitChoise(fit_name) {
        this.drawer.blur()
        const fit_data = await this.getFitData(fit_name, this.cur_size_id)
        this.drawer.INIT_FIT = fit_data
        this.cur_fit_name = fit_name
            //console.log(fit_data)
        this.drawer.draw()
    }

    async getAnthro() {
        try {
            const response = await fetch('/fits/get_anthropometry', {
                method: 'GET',
                credentials: "include",
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Ошибка при получении данных');
            }

            const result = await response.json();
            if (!result.success) {
                throw new Error(result.error || 'Ошибка при получении данных');
            }

            // Проверяем, не вернул ли запрос пустой ответ
            if (!result.data || Object.keys(result.data).length === 0) {
                // Показываем всплывающее окно с просьбой ввести антропометрию
                this.showError("Пожалуйста, введите ваши антропометрические данные перед тем, как строить посадку. Вы будете перенаправлены на страницу настроек.");

                // Перенаправляем на страницу настроек антропометрии
                window.location.href = '/add_anthropometry';
                return;
            }

            this.drawer.INIT_ANTROPOMETRICS = result.data;
            //console.log(this.drawer.INIT_ANTROPOMETRICS)
        } catch (error) {
            console.error('Ошибка:', error);
            // В случае ошибки сети или сервера также перенаправляем на страницу настроек
            this.showError("Произошла ошибка при загрузке антропометрических данных. Вы будете перенаправлены на страницу настроек.");
            window.location.href = '/add_anthropometry';
        }
    }

    getFitSettings() {
        //console.log(this)
        var fitSettings = {
            size_id: this.cur_size_id,
            seatHight: distance(this.drawer.bike.BottomBracket, this.drawer.bike.SeatpostTop) / this.drawer.scale + this.drawer.INIT_GEOMETRY['saddleHeight'],
            stemHight: distance(this.drawer.bike.TopTube.p1, this.drawer.bike.Stem.p1) / this.drawer.scale,
            saddleOffset: (this.drawer.bike.Saddle.x - this.drawer.bike.SeatpostTop.x) / this.drawer.scale,
            torsoAngle: this.drawer.angles.TorsoAngle.value,
            shifterAngle: this.drawer.angles.ShifterAngle.value
        };

        return fitSettings
    }

    showError(message) {
        // Создаем или находим контейнер для ошибок
        let errorContainer = document.getElementById('error-container');
        if (!errorContainer) {
            errorContainer = document.createElement('div');
            errorContainer.id = 'error-container';
            errorContainer.className = 'error-container';
            errorContainer.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: #f8d7da;
                color: #721c24;
                padding: 15px;
                border-radius: 6px;
                border: 1px solid #f5c6cb;
                max-width: 400px;
                z-index: 1000;
                box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            `;
            document.body.appendChild(errorContainer);
        }

        errorContainer.textContent = message;
        errorContainer.style.display = 'block';

        // Автоматически скрываем через 5 секунд
        setTimeout(() => {
            errorContainer.style.display = 'none';
        }, 5000);
    }

    showSuccess(message) {
        // Создаем или находим контейнер для успехов
        let successContainer = document.getElementById('success-container');
        if (!successContainer) {
            successContainer = document.createElement('div');
            successContainer.id = 'success-container';
            successContainer.className = 'success-container';
            successContainer.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: #d4edda;
                color: #155724;
                padding: 15px;
                border-radius: 6px;
                border: 1px solid #c3e6cb;
                max-width: 400px;
                z-index: 1000;
                box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            `;
            document.body.appendChild(successContainer);
        }

        successContainer.textContent = message;
        successContainer.style.display = 'block';

        // Автоматически скрываем через 3 секунды
        setTimeout(() => {
            successContainer.style.display = 'none';
        }, 3000);
    }
}