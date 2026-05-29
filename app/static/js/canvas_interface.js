import { Drawer } from './canvas_drawer.js'
import { distance } from './geometry-helpers.js'

export class Interface {
    constructor(element_ids) {
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
        this.deleteButton = document.getElementById(element_ids.deleteButton);

        this.handlebarWidthInput = element_ids.handlebarWidthInput
            ? document.getElementById(element_ids.handlebarWidthInput)
            : null;
        this.exportTxtButton = element_ids.exportTxtButton
            ? document.getElementById(element_ids.exportTxtButton)
            : null;
        this.exportCsvButton = element_ids.exportCsvButton
            ? document.getElementById(element_ids.exportCsvButton)
            : null;

        this.bikesReady = null;

        this.setupEventListeners()
        this.getAnthro()
        this.bikesReady = this.fetchBikes()
    }

    setupEventListeners() {
        this.saveButton.addEventListener("click", () => this.saveFit());
        this.resetButton.addEventListener("click", () => this.drawer.reset());
        this.deleteButton.addEventListener("click", () => this.deleteFit());

        this.bikeSearch.addEventListener("input", async () => {
            await this.bikesReady;
            const query = this.bikeSearch.value.trim().toLowerCase();
            const filtered = this._filterBikes(query);
            this.renderAutocompleteList(this.bikeList, filtered, this.bikeSearch, this.onBikeChoise.bind(this));
        });
        this.bikeSearch.addEventListener("focus", async () => {
            await this.bikesReady;
            const query = this.bikeSearch.value.trim().toLowerCase();
            const filtered = this._filterBikes(query);
            this.renderAutocompleteList(this.bikeList, filtered, this.bikeSearch, this.onBikeChoise.bind(this));
        });
        this.setupAutocompleteHide(this.bikeList, this.bikeSearch);

        this.sizeSelect.addEventListener("change", () => {
            const size = this.sizeSelect.value;
            if (size !== "Выберите размер") {
                this.onSizeChoise(size);
            } else {
                this.drawer.clearCanvas()
                this.fitSearch.value = ""
                this.deleteButton.style.display = "none";
            }
        });

        this.fitSearch.addEventListener("focus", async() => {
            const savedFits = await this.fetchFits();
            this.renderAutocompleteList(this.fitList, savedFits, this.fitSearch, this.onFitChoise.bind(this));
        });
        this.setupAutocompleteHide(this.fitList, this.fitSearch);

        if (this.exportTxtButton) {
            this.exportTxtButton.addEventListener("click", () => this.exportFit('txt'));
        }
        if (this.exportCsvButton) {
            this.exportCsvButton.addEventListener("click", () => this.exportFit('csv'));
        }
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
        this.sizeSelect.innerHTML = '<option>Выберите размер</option>';
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
        this.drawer.draw()
    }

    _filterBikes(query) {
        const keys = Object.keys(this.savedBikes || {});
        if (!query) return keys;
        const q = query.toLowerCase();
        const prefix = keys.filter(k => k.toLowerCase().startsWith(q));
        const rest   = keys.filter(k => !k.toLowerCase().startsWith(q) && k.toLowerCase().includes(q));
        return [...prefix, ...rest];
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
            this.showError("Введите название настройки перед сохранением!");
            document.getElementById("fitInput").focus();
            return;
        }

        const fitSettings = this.getFitSettings();
        fitSettings.name = name;

        try {
            const response = await fetch("/fits/save", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(fitSettings)
            });

            const result = await response.json();

            if (result.success) {
                this.showSuccess("Посадка успешно сохранена!");
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
                console.warn('Базовая посадка недоступна:', error.error || response.status);
                return null;
            }

            const result = await response.json();
            if (!result.success) {
                console.warn('Базовая посадка недоступна:', result.error);
                return null;
            }

            return result.data ?? null;
        } catch (error) {
            console.error('Ошибка при загрузке базовой посадки:', error);
            return null;
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
        this.deleteButton.style.display = "block";
        this.drawer.draw()
    }

    async deleteFit() {
        if (!this.cur_fit_name) {
            this.showError("Не выбрана посадка для удаления");
            return;
        }

        if (!confirm(`Вы уверены, что хотите удалить посадку "${this.cur_fit_name}"?`)) {
            return;
        }

        try {
            const response = await fetch("/fits/delete", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    fit_name: this.cur_fit_name,
                    size_id: this.cur_size_id
                })
            });

            const result = await response.json();

            if (result.success) {
                this.showSuccess("Посадка успешно удалена!");
                this.fitSearch.value = "";
                this.cur_fit_name = null;
                this.deleteButton.style.display = "none";
                this.drawer.INIT_FIT = await this.getBasicFitData(this.cur_size_id);
                this.drawer.draw();
            } else {
                if (result.errors) {
                    const errorMsg = result.errors.map(e => e.message).join(", ");
                    this.showError("Ошибка валидации: " + errorMsg);
                } else {
                    this.showError(result.error || "Ошибка при удалении!");
                }
            }
        } catch (error) {
            console.error("Ошибка:", error);
            this.showError("Ошибка сети при удалении: " + error.message);
        }
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

            if (!result.data || Object.keys(result.data).length === 0) {
                this.showError("Пожалуйста, введите ваши параметры перед настройкой посадки. Вы будете перенаправлены на страницу через 3 секунды.");
                setTimeout(() => {
                    window.location.href = '/anthropometry';
                }, 3000);
                return;
            }

            this.drawer.INIT_ANTROPOMETRICS = result.data;
        } catch {
            this.showError("Произошла ошибка при загрузке ваших параметров. Вы будете перенаправлены на страницу через 3 секунды.");
            setTimeout(() => {
                window.location.href = '/anthropometry';
            }, 3000);
        }
    }

    getFitSettings() {
        var fitSettings = {
            size_id: this.cur_size_id,
            seatHight: distance(this.drawer.bike.BottomBracket, this.drawer.bike.SeatpostTop) / this.drawer.scale + parseFloat(this.drawer.INIT_GEOMETRY['saddleHeight']),
            stemHight: distance(this.drawer.bike.TopTube.p1, this.drawer.bike.Stem.p1) / this.drawer.scale,
            saddleOffset: (this.drawer.bike.Saddle.x - this.drawer.bike.SeatpostTop.x) / this.drawer.scale,
            torsoAngle: this.drawer.angles.TorsoAngle.value,
            shifterAngle: this.drawer.angles.ShifterAngle.value
        };

        return fitSettings
    }

    getMeasurements(handlebarWidth = 0) {
        const d = this.drawer;
        if (!d || !d.bike || !d.bike.BottomBracket || !d.bike.Saddle || !d.rider || !d.rider.Hands) {
            return null;
        }

        const s = d.scale;

        const saddleHeightMm = d.GEOMETRY['saddleHeight'] / s;
        const seatHeightAlongTube = distance(d.bike.BottomBracket, d.bike.SeatpostTop) / s + saddleHeightMm;

        const saddleOffsetMm = (d.bike.Saddle.x - d.bike.SeatpostTop.x) / s;

        const noseToSteerer = (d.bike.TopTube.p1.x - d.bike.SaddleNose.x) / s;

        const noseToHandsCanvas = distance(d.bike.SaddleNose, d.rider.Hands) / s;
        const halfWidth = handlebarWidth / 2;
        const noseToHands = Math.sqrt(noseToHandsCanvas ** 2 + halfWidth ** 2);

        const saddleSurfaceY = d.bike.Saddle.y - d.GEOMETRY['saddleHeight'];
        const heightDiff = (d.rider.Hands.y - saddleSurfaceY) / s;

        return {
            seatHeightAlongTube: Math.round(seatHeightAlongTube * 10) / 10,
            saddleOffset: Math.round(saddleOffsetMm * 10) / 10,
            noseToSteerer: Math.round(noseToSteerer * 10) / 10,
            noseToHands: Math.round(noseToHands * 10) / 10,
            heightDiff: Math.round(heightDiff * 10) / 10,
            handlebarWidth,
            bikeName: this.cur_bike_model || '—',
            size: this.cur_size || '—',
            fitName: this.cur_fit_name || '—',
        };
    }

    exportFit(format) {
        const handlebarWidth = this.handlebarWidthInput
            ? parseFloat(this.handlebarWidthInput.value) || 0
            : 0;

        const m = this.getMeasurements(handlebarWidth);
        if (!m) {
            this.showError('Сначала выберите велосипед и размер для экспорта настроек.');
            return;
        }

        const now = new Date();
        const dateStr = now.toLocaleDateString('ru-RU');
        const timeStr = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

        let content, filename, mimeType;

        if (format === 'csv') {
            const header = ['Параметр', 'Значение', 'Единица'].join(';');
            const rows = [
                ['Велосипед', m.bikeName, ''],
                ['Размер', m.size, ''],
                ['Посадка', m.fitName, ''],
                ['Дата экспорта', `${dateStr} ${timeStr}`, ''],
                ['', '', ''],
                ['Высота седла от каретки (вдоль подседельной трубы)', m.seatHeightAlongTube, 'мм'],
                ['Горизонтальное смещение седла', m.saddleOffset, 'мм'],
                ['Расстояние от носика седла до оси рулевой', m.noseToSteerer, 'мм'],
                ['Ширина руля (введено)', m.handlebarWidth || '—', m.handlebarWidth ? 'мм' : ''],
                ['Расстояние от носика седла до ложбинки пистолетов', m.noseToHands, 'мм'],
                ['Перепад высот седло–руль (+ = руль ниже)', m.heightDiff, 'мм'],
            ];
            content = [header, ...rows.map(r => r.join(';'))].join('\n');
            filename = `bikefit_${m.bikeName}_${m.size}.csv`.replace(/\s+/g, '_');
            mimeType = 'text/csv;charset=utf-8;';
        } else {
            const pad = (label, value, unit) =>
                `  ${label.padEnd(52, '.')} ${String(value).padStart(8)} ${unit}`;
            content = [
                `  Велосипед : ${m.bikeName}`,
                `  Размер    : ${m.size}`,
                `  Посадка   : ${m.fitName}`,
                `  Дата      : ${dateStr} ${timeStr}`,
                '',
                '──────────────────────────────────────────────────────────────',
                '',
                pad('Высота седла от каретки (вдоль подседельной трубы)', m.seatHeightAlongTube, 'мм'),
                pad('Горизонтальное смещение седла (+ вперёд)', m.saddleOffset, 'мм'),
                pad('Носик седла -> ось рулевой', m.noseToSteerer, 'мм'),
                pad('Ширина руля (введено)', m.handlebarWidth || '—', m.handlebarWidth ? 'мм' : ''),
                pad('Носик седла -> ложбинка пистолетов', m.noseToHands, 'мм'),
                pad('Перепад высот седло–руль (+ = руль ниже)', m.heightDiff, 'мм'),
                '',
                '──────────────────────────────────────────────────────────────',
                '  Сгенерировано: BikeFit Simulator',
            ].join('\n');
            filename = `bikefit_${m.bikeName}_${m.size}.txt`.replace(/\s+/g, '_');
            mimeType = 'text/plain;charset=utf-8;';
        }

        const blob = new Blob(['\uFEFF' + content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }

    showError(message) {
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
        setTimeout(() => {
            errorContainer.style.display = 'none';
        }, 5000);
    }

    showSuccess(message) {
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
        setTimeout(() => {
            successContainer.style.display = 'none';
        }, 3000);
    }
}
