/**
 * Централизованная система обработки и отображения ошибок на фронтенде.
 * Обеспечивает единообразное отображение ошибок во всем приложении.
 */

export class ErrorHandler {
    constructor() {
        this.errorContainer = null;
        this.successContainer = null;
        this.fieldErrors = new Map();
    }

    /**
     * Инициализирует обработчик ошибок для формы
     * @param {string} errorContainerId - ID контейнера для общих ошибок
     * @param {string} successContainerId - ID контейнера для успешных сообщений
     */
    init(errorContainerId = 'error-container', successContainerId = 'success-container') {
        this.errorContainer = document.getElementById(errorContainerId);
        if (!this.errorContainer) {
            console.warn(`Error container with id '${errorContainerId}' not found`);
        }
        
        this.successContainer = document.getElementById(successContainerId);
        if (!this.successContainer) {
            console.warn(`Success container with id '${successContainerId}' not found`);
        }
    }

    /**
     * Очищает все ошибки на странице
     */
    clearErrors() {
        // Очистка общего контейнера ошибок
        if (this.errorContainer) {
            this.errorContainer.style.display = 'none';
            this.errorContainer.innerHTML = '';
        }

        // Очистка контейнера успеха
        if (this.successContainer) {
            this.successContainer.style.display = 'none';
            this.successContainer.innerHTML = '';
        }

        // Очистка ошибок полей
        document.querySelectorAll('.field-error').forEach(el => {
            el.textContent = '';
            el.style.display = 'none';
        });

        // Удаление класса error с инпутов
        document.querySelectorAll('input.error, select.error, textarea.error').forEach(el => {
            el.classList.remove('error');
        });

        this.fieldErrors.clear();
    }

    /**
     * Отображает общую ошибку
     * @param {string} message - Сообщение об ошибке
     * @param {string} type - Тип ошибки ('error', 'warning', 'info')
     */
    showGeneralError(message, type = 'error') {
        if (!this.errorContainer) {
            console.error('Error container not initialized');
            return;
        }

        this.errorContainer.textContent = message;
        this.errorContainer.className = `error-container ${type}`;
        this.errorContainer.style.display = 'block';

        // Автоматически скрыть через 10 секунд для info и warning
        if (type === 'info' || type === 'warning') {
            setTimeout(() => {
                this.errorContainer.style.display = 'none';
            }, 10000);
        }
    }

    /**
     * Отображает ошибку для конкретного поля
     * @param {string} fieldName - Имя поля
     * @param {string} message - Сообщение об ошибке
     */
    showFieldError(fieldName, message) {
        const input = document.querySelector(`[name="${fieldName}"], #${fieldName}`);
        const errorElement = document.getElementById(`${fieldName}-error`);

        if (input) {
            input.classList.add('error');
            
            // Прокрутка к первой ошибке
            if (this.fieldErrors.size === 0) {
                input.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }

        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
        }

        this.fieldErrors.set(fieldName, message);
    }

    /**
     * Обрабатывает ответ от сервера и отображает ошибки
     * @param {Object} result - Ответ от сервера
     * @returns {boolean} - true если есть ошибки, false если нет
     */
    handleServerResponse(result) {
        this.clearErrors();

        if (!result) {
            this.showGeneralError('Не получен ответ от сервера');
            return true;
        }

        if (result.success) {
            return false;
        }

        // Обработка массива ошибок (валидация)
        if (result.errors && Array.isArray(result.errors)) {
            let hasGeneralError = false;

            result.errors.forEach(error => {
                if (error.field === 'data' || error.field === 'general') {
                    this.showGeneralError(error.message);
                    hasGeneralError = true;
                } else if (error.field) {
                    this.showFieldError(error.field, error.message);
                }
            });

            // Если есть только ошибки полей, показываем общее сообщение
            if (!hasGeneralError && this.fieldErrors.size > 0) {
                this.showGeneralError('Пожалуйста, исправьте ошибки в форме', 'warning');
            }

            return true;
        }

        // Обработка одиночной ошибки
        if (result.error) {
            if (result.field) {
                this.showFieldError(result.field, result.error);
            } else {
                this.showGeneralError(result.error);
            }
            return true;
        }

        // Неизвестный формат ошибки
        this.showGeneralError('Произошла неизвестная ошибка');
        return true;
    }

    /**
     * Обрабатывает ошибки сети
     * @param {Error} error - Объект ошибки
     */
    handleNetworkError(error) {
        console.error('Network error:', error);
        this.clearErrors();
        this.showGeneralError('Ошибка сети. Проверьте подключение к интернету и попробуйте снова.');
    }

    /**
     * Выполняет API запрос с автоматической обработкой ошибок
     * @param {string} url - URL для запроса
     * @param {Object} options - Опции fetch
     * @returns {Promise<Object|null>} - Данные ответа или null при ошибке
     */
    async fetchWithErrorHandling(url, options = {}) {
        try {
            const response = await fetch(url, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                credentials: 'include',
                ...options
            });

            const result = await response.json();

            if (this.handleServerResponse(result)) {
                return null;
            }

            return result;
        } catch (error) {
            this.handleNetworkError(error);
            return null;
        }
    }

    /**
     * Показывает модальное окно с сообщением
     * @param {string} message - Сообщение
     * @param {string} type - Тип ('success', 'error', 'warning', 'info')
     * @param {Function} onClose - Callback при закрытии
     */
    showModal(message, type = 'info', onClose = null) {
        // Создаем модальное окно если его нет
        let modal = document.getElementById('app-modal');
        
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'app-modal';
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h3 id="modal-title"></h3>
                    </div>
                    <div class="modal-body">
                        <p id="modal-message"></p>
                    </div>
                    <div class="modal-footer">
                        <button id="modal-ok-btn" class="btn btn-primary btn-lg">OK</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }

        const title = modal.querySelector('#modal-title');
        const messageEl = modal.querySelector('#modal-message');
        const okBtn = modal.querySelector('#modal-ok-btn');

        // Устанавливаем заголовок в зависимости от типа
        const titles = {
            success: '✅ Успешно!',
            error: '❌ Ошибка',
            warning: '⚠️ Внимание',
            info: 'ℹ️ Информация'
        };
        title.textContent = titles[type] || titles.info;

        messageEl.textContent = message;
        modal.style.display = 'block';

        // Обработчик закрытия
        const closeModal = () => {
            modal.style.display = 'none';
            if (onClose) onClose();
        };

        okBtn.onclick = closeModal;
        modal.onclick = (e) => {
            if (e.target === modal) closeModal();
        };
    }

    /**
     * Показывает уведомление об успехе (inline версия)
     * @param {string} message - Сообщение
     * @param {Function} onClose - Callback при закрытии (опционально)
     */
    showSuccess(message, onClose = null) {
        this.clearErrors();
        
        if (!this.successContainer) {
            console.warn('Success container not initialized, falling back to modal');
            this.showModal(message, 'success', onClose);
            return;
        }

        this.successContainer.textContent = message;
        this.successContainer.style.display = 'block';

        // Автоматически скрыть через 3 секунды и выполнить callback
        setTimeout(() => {
            if (this.successContainer) {
                this.successContainer.style.display = 'none';
            }
            if (onClose) onClose();
        }, 3000);
    }

    /**
     * Показывает уведомление об ошибке
     * @param {string} message - Сообщение
     */
    showError(message) {
        this.showModal(message, 'error');
    }
}

// Создаем глобальный экземпляр для использования во всем приложении
export const errorHandler = new ErrorHandler();

// Для обратной совместимости экспортируем как default
export default errorHandler;