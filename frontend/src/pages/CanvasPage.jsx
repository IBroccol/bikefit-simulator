import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/layout/Header';
import styles from './CanvasPage.module.css';

/**
 * CanvasPage — wraps the existing Paper.js canvas_interface.js logic.
 *
 * Strategy: the original canvas.js / canvas_interface.js are vanilla JS
 * modules that manipulate the DOM directly via element IDs. We render the
 * exact same DOM structure and then dynamically load Paper.js + canvas.js
 * after the component mounts, passing window.element_ids just like the
 * original Flask template does.
 *
 * This avoids rewriting ~1000 lines of geometry/drawing code.
 */
export default function CanvasPage() {
  const navigate = useNavigate();
  const [toast, setToast] = useState({ msg: '', type: '' });
  const scriptsRef = useRef([]);

  useEffect(() => {
    // Set element IDs for the existing JS modules
    window.element_ids = {
      canvas:        'myCanvas',
      bikeSearch:    'bikeSearch',
      bikeList:      'bikeList',
      sizeSelect:    'sizeSelect',
      fitSearch:     'fitSearch',
      fitList:       'fitList',
      fitInput:      'fitInput',
      saveButton:    'saveBtn',
      resetButton:   'resetBtn',
      deleteButton:  'deleteBtn',
    };

    // Load Paper.js first, then canvas.js (which imports canvas_interface.js)
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
        // canvas.js is a module that imports canvas_interface.js etc.
        // Vite serves static files from /static/ via the proxy to Flask.
        await loadScript('/static/js/canvas.js', 'module');
      } catch (err) {
        console.error('Failed to load canvas scripts', err);
      }
    }

    init();

    return () => {
      // Cleanup injected scripts on unmount
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
        {/* Left sidebar: bike selection */}
        <aside className={`sidebar ${styles.sidebar}`}>
          <div className="block">
            <h3>Велосипед</h3>
            <div className="input-group">
              <label htmlFor="bikeSearch">Поиск велосипеда</label>
              <input
                type="text"
                placeholder="Выберите велосипед"
                id="bikeSearch"
                readOnly
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

        {/* Center: canvas */}
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

        {/* Right sidebar: fits */}
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
        </aside>
      </div>
    </div>
  );
}
