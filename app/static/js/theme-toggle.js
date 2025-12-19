/**
 * BikeFit - Переключатель темы
 * Управление светлой/темной темой с сохранением в localStorage
 */

class ThemeManager {
    constructor() {
        this.theme = this.getStoredTheme() || this.getPreferredTheme();
        this.init();
    }

    /**
     * Получить сохраненную тему из localStorage
     */
    getStoredTheme() {
        return localStorage.getItem('bikefit-theme');
    }

    /**
     * Получить предпочитаемую тему из системных настроек
     */
    getPreferredTheme() {
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark';
        }
        return 'light';
    }

    /**
     * Установить тему
     */
    setTheme(theme) {
        this.theme = theme;
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('bikefit-theme', theme);
        this.updateToggleButton();
    }

    /**
     * Переключить тему
     */
    toggleTheme() {
        const newTheme = this.theme === 'light' ? 'dark' : 'light';
        this.setTheme(newTheme);
    }

    /**
     * Обновить кнопку переключения
     */
    updateToggleButton() {
        const button = document.getElementById('theme-toggle');
        if (!button) return;

        const icon = button.querySelector('.theme-toggle-icon');
        const text = button.querySelector('.theme-toggle-text');

        if (this.theme === 'dark') {
            icon.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="20" height="20">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
            `;
            if (text) text.textContent = 'Светлая';
        } else {
            icon.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="20" height="20">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
            `;
            if (text) text.textContent = 'Темная';
        }
    }

    /**
     * Создать кнопку переключения темы
     */
    createToggleButton() {
        // Проверяем, не существует ли уже кнопка
        if (document.getElementById('theme-toggle')) return;

        const button = document.createElement('button');
        button.id = 'theme-toggle';
        button.className = 'theme-toggle';
        button.setAttribute('aria-label', 'Переключить тему');
        button.innerHTML = `
            <span class="theme-toggle-icon"></span>
            <span class="theme-toggle-text"></span>
        `;

        button.addEventListener('click', () => this.toggleTheme());
        document.body.appendChild(button);
        
        this.updateToggleButton();
    }

    /**
     * Инициализация
     */
    init() {
        // Устанавливаем тему сразу, чтобы избежать мигания
        document.documentElement.setAttribute('data-theme', this.theme);

        // Создаем кнопку после загрузки DOM
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.createToggleButton();
            });
        } else {
            this.createToggleButton();
        }

        // Слушаем изменения системной темы
        if (window.matchMedia) {
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
                if (!this.getStoredTheme()) {
                    this.setTheme(e.matches ? 'dark' : 'light');
                }
            });
        }
    }
}

// Создаем глобальный экземпляр
const themeManager = new ThemeManager();

// Экспортируем для использования в других модулях
export default themeManager;