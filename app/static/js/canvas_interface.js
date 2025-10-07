import { Drawer } from './canvas_drawer.js'

export class Interface {
    constructor(element_ids) {
        console.log(element_ids)
        this.cur_bike_id = null;
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
    }

    setupEventListeners() {
        this.saveButton.addEventListener("click", () => this.saveFit());
        this.resetButton.addEventListener("click", () => this.drawer.reset());

        this.bikeSearch.addEventListener("focus", async() => {
            const savedBikes = await this.fetchBikes();
            this.renderAutocompleteList(this.bikeList, savedBikes, this.bikeSearch, this.onBikeChoise.bind(this));
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

    async fetchSizes(bike_model) {
        try {
            const response = await fetch('/bikes/sizes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bike_model })
            });

            if (!response.ok) throw new Error("Ошибка при получении размеров");
            return await response.json(); // ожидается массив размеров
        } catch (error) {
            console.error("Ошибка:", error);
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
        this.cur_size = size
        this.drawer.blur()
            //console.log("Выбран размер:", size);
        let bike_id = await this.fetchBikeId()
            //console.log("bike_id:", bike_id)
        const bike_geo = await this.getBikeGeo(bike_id)
        this.drawer.INIT_GEOMETRY = bike_geo
        if (bike_id != this.cur_bike_id) {
            this.fitSearch.value = ""
            this.fitInput.value = ""
        }
        this.cur_bike_id = bike_id
            //console.log(bike_geo)

        this.drawer.INIT_FIT = await this.getBasicFitData(bike_id)
        this.drawer.draw()
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

    async fetchBikes() {
        try {
            const response = await fetch('/bikes/list', {
                method: 'GET',
                credentials: "include",
            });

            if (!response.ok) throw new Error("Ошибка при получении данных");
            return await response.json();
        } catch (error) {
            console.error("Ошибка:", error);
            return [];
        }
    }

    async fetchFits() {
        if (this.cur_bike_id === null) {
            console.error("Ошибка: не выбран велосипед");
            return [];
        }
        try {
            const response = await fetch('/fits/list', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: "include",
                body: JSON.stringify({ bike_id: this.cur_bike_id })
            });

            if (!response.ok) throw new Error("Ошибка при получении данных");
            return await response.json();
        } catch (error) {
            console.error("Ошибка:", error);
            return [];
        }
    }

    renderAutocompleteList(list, items, input, click_fun) {
        list.innerHTML = "";
        items.forEach(item => {
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
        list.style.display = items.length ? "block" : "none";
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
            alert("Введите название посадки перед сохранением!");
            document.getElementById("fit-name").focus();
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

            var data = await response.json()

            if (data.success) {
                alert("Настройки успешно сохранены!");
            } else {
                alert("Ошибка при сохранении!");
            }
        } catch (error) {
            console.error("Ошибка:", error);
        }
        this.fitInput.value = ""
    }

    async getBikeGeo(bike_id) {
        try {
            const response = await fetch('/bikes/geo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bike_id: bike_id })
            });

            if (response.ok) return await response.json();
            throw new Error('Ошибка при получении данных');
        } catch (error) {
            console.error('Ошибка:', error);
            throw error;
        }
    }

    async getFitData(fit_name, bike_id) {
        try {
            const response = await fetch('/fits/get', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: "include",
                body: JSON.stringify({ fit_name: fit_name, bike_id: bike_id })
            });

            if (response.ok) return await response.json();
            throw new Error('Ошибка при получении данных');
        } catch (error) {
            console.error('Ошибка:', error);
            throw error;
        }
    }

    async getBasicFitData(bike_id) {
        try {
            const response = await fetch('/fits/basic', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: "include",
                body: JSON.stringify({ bike_id: bike_id })
            });

            if (response.ok) return await response.json();
            throw new Error('Ошибка при получении данных');
        } catch (error) {
            console.error('Ошибка:', error);
            throw error;
        }
    }

    async onBikeChoise(bike_model) {
        //console.log(bike_model)
        const sizes = await this.fetchSizes(bike_model);
        this.renderSizeOptions(sizes);
        if (bike_model != this.cur_bike_model)
            this.drawer.clearCanvas()
        this.cur_bike_model = bike_model

    }

    async onFitChoise(fit_name) {
        this.drawer.blur()
        const fit_data = await this.getFitData(fit_name, this.cur_bike_id)
        this.drawer.INIT_FIT = fit_data
        this.cur_fit_name = fit_name
            //console.log(fit_data)
        this.drawer.draw()
    }

    async getAnthro() {
        try {
            const response = await fetch('/fits/anthro', {
                method: 'GET',
                credentials: "include",
            });

            if (response.ok) {
                this.drawer.INIT_ANTROPOMETRICS = await response.json();
                //console.log(this.drawer.INIT_ANTROPOMETRICS)
            } else
                throw new Error('Ошибка при получении данных');
        } catch (error) {
            console.error('Ошибка:', error);
            throw error;
        }
    }

    getFitSettings() {
        //console.log(this)
        var fitSettings = {
            bike_id: this.cur_bike_id,
            seatHight: distance(this.drawer.bike.BottomBracket, this.drawer.bike.SeatpostTop) / this.drawer.scale + this.drawer.INIT_GEOMETRY['saddleHeight'],
            stemHight: distance(this.drawer.bike.TopTube.p1, this.drawer.bike.Stem.p1) / this.drawer.scale,
            saddleOffset: (this.drawer.bike.Saddle.x - this.drawer.bike.SeatpostTop.x) / this.drawer.scale,
            torsoAngle: this.drawer.angles.TorsoAngle.value,
            shifterAngle: this.drawer.angles.ShifterAngle.value
        };

        return fitSettings
    }
}