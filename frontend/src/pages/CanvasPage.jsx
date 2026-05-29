import { useEffect, useRef } from 'react';
import Header from '../components/layout/Header';
import styles from './CanvasPage.module.css';

export default function CanvasPage() {
  const scriptsRef = useRef([]);

  useEffect(() => {
    window.element_ids = {
      canvas:               'myCanvas',
      bikeSearch:           'bikeSearch',
      bikeList:             'bikeList',
      sizeSelect:           'sizeSelect',
      fitSearch:            'fitSearch',
      fitList:              'fitList',
      fitInput:             'fitInput',
      saveButton:           'saveBtn',
      resetButton:          'resetBtn',
      deleteButton:         'deleteBtn',
      handlebarWidthInput:  'handlebarWidth',
      exportTxtButton:      'exportTxtBtn',
      exportCsvButton:      'exportCsvBtn',
    };

    function loadScript(src, type = 'text/javascript') {
      return new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = src;
        s.type = type;
        s.onload = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
        scriptsRef.current.push(s);
      });
    }

    async function init() {
      try {
        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/paper.js/0.12.15/paper-full.min.js');
        await loadScript('/static/js/canvas.js', 'module');
      } catch (err) {
        console.error('Failed to load canvas scripts', err);
      }
    }

    init();

    return () => {
      scriptsRef.current.forEach(s => {
        if (s.parentNode) s.parentNode.removeChild(s);
      });
      scriptsRef.current = [];
      delete window.element_ids;
    };
  }, []);

  return (
    <div className={styles.page}>
      <Header title="Настройка посадки" backTo="/dashboard" />

      <div className={styles.layout}>
        <aside className={`sidebar ${styles.sidebar}`}>
          <div className="block">
            <h3>Велосипед</h3>
            <div className="input-group">
              <label htmlFor="bikeSearch">Поиск велосипеда</label>
              <input
                type="text"
                placeholder="Начните вводить название"
                id="bikeSearch"
                autoComplete="off"
              />
              <div id="bikeList" className="autocomplete-list" />
            </div>
            <div className="input-group">
              <label htmlFor="sizeSelect">Размер</label>
              <select id="sizeSelect">
                <option>Выберите размер</option>
              </select>
            </div>
          </div>
        </aside>

        <main className={styles.canvasContainer}>
          <div className={styles.canvasWrapper}>
            <div className={styles.hints}>
              <h4 className={styles.hintsTitle}>💡 Рекомендации по посадке:</h4>
              <ul className={styles.hintsList}>
                <li>
                  При положении педали на <strong>3 часа</strong> (горизонтально вперёд)
                  колено должно находиться <strong>над осью педали</strong>
                </li>
                <li>
                  При положении педали на <strong>6 часов</strong> (внизу)
                  угол в колене должен быть примерно <strong>145°</strong>
                </li>
              </ul>
            </div>

            <canvas id="myCanvas" className={styles.canvas} />

            <div className={styles.controls}>
              <button className="btn btn-primary" id="resetBtn">Сбросить</button>
            </div>
          </div>
        </main>

        <aside className={`sidebar ${styles.sidebar}`}>
          <div className="block">
            <h3>Мои посадки</h3>
            <div className="input-group">
              <label htmlFor="fitSearch">Выбрать посадку</label>
              <input
                type="text"
                placeholder="Выберите посадку"
                id="fitSearch"
                readOnly
              />
              <div id="fitList" className="autocomplete-list" />
            </div>
            <button
              className="btn btn-danger btn-block"
              id="deleteBtn"
              style={{ display: 'none' }}
            >
              Удалить посадку
            </button>
          </div>

          <div className="block">
            <h3>Сохранить настройки</h3>
            <div className="input-group">
              <label htmlFor="fitInput">Название посадки</label>
              <input type="text" id="fitInput" placeholder="Введите название" />
              <button className="btn btn-success btn-block" id="saveBtn">
                Сохранить
              </button>
            </div>
          </div>

          <div className="block">
            <h3>Экспорт посадки</h3>
            <div className="input-group">
              <label htmlFor="handlebarWidth">Ширина руля, мм</label>
              <input
                type="number"
                id="handlebarWidth"
                placeholder="например, 420"
                min="300"
                max="500"
                step="5"
              />
            </div>
            <div className={styles.exportButtons}>
              <button className="btn btn-secondary" id="exportTxtBtn">
                ↓ TXT
              </button>
              <button className="btn btn-secondary" id="exportCsvBtn">
                ↓ CSV
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
