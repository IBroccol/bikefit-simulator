import { useEffect, useRef } from 'react';
import Header from '../components/layout/Header';
import styles from './ComparePage.module.css';

export default function ComparePage() {
  const scriptsRef = useRef([]);

  useEffect(() => {
    window.element_ids_left = {
      canvas:       'canvasLeft',
      bikeSearch:   'bikeSearchLeft',
      bikeList:     'bikeListLeft',
      sizeSelect:   'sizeSelectLeft',
      fitSearch:    'fitSearchLeft',
      fitList:      'fitListLeft',
      fitInput:     'fitInputLeft',
      saveButton:   'saveBtnLeft',
      resetButton:  'resetBtnLeft',
      deleteButton: 'deleteBtnLeft',
    };

    window.element_ids_right = {
      canvas:       'canvasRight',
      bikeSearch:   'bikeSearchRight',
      bikeList:     'bikeListRight',
      sizeSelect:   'sizeSelectRight',
      fitSearch:    'fitSearchRight',
      fitList:      'fitListRight',
      fitInput:     'fitInputRight',
      saveButton:   'saveBtnRight',
      resetButton:  'resetBtnRight',
      deleteButton: 'deleteBtnRight',
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
        await loadScript('/static/js/canvas_compare.js', 'module');
      } catch (err) {
        console.error('Failed to load compare scripts', err);
      }
    }

    init();

    return () => {
      scriptsRef.current.forEach(s => { if (s.parentNode) s.parentNode.removeChild(s); });
      scriptsRef.current = [];
      delete window.element_ids_left;
      delete window.element_ids_right;
    };
  }, []);

  const panelIds = [
    {
      side: 'Left', label: 'Велосипед 1',
      canvas: 'canvasLeft', bikeSearch: 'bikeSearchLeft', bikeList: 'bikeListLeft',
      sizeSelect: 'sizeSelectLeft', fitSearch: 'fitSearchLeft', fitList: 'fitListLeft',
      fitInput: 'fitInputLeft', saveBtn: 'saveBtnLeft', resetBtn: 'resetBtnLeft',
      deleteBtn: 'deleteBtnLeft',
    },
    {
      side: 'Right', label: 'Велосипед 2',
      canvas: 'canvasRight', bikeSearch: 'bikeSearchRight', bikeList: 'bikeListRight',
      sizeSelect: 'sizeSelectRight', fitSearch: 'fitSearchRight', fitList: 'fitListRight',
      fitInput: 'fitInputRight', saveBtn: 'saveBtnRight', resetBtn: 'resetBtnRight',
      deleteBtn: 'deleteBtnRight',
    },
  ];

  return (
    <div className={styles.page}>
      <Header title="Сравнение посадок" backTo="/dashboard" />

      <div className={styles.hints}>
        <h4 className={styles.hintsTitle}>💡 Рекомендации по посадке:</h4>
        <ul className={styles.hintsList}>
          <li>При положении педали на <strong>3 часа</strong> колено должно находиться <strong>над осью педали</strong></li>
          <li>При положении педали на <strong>6 часов</strong> угол в колене должен быть примерно <strong>145°</strong></li>
        </ul>
      </div>

      <div className={styles.compareSection}>
        {panelIds.map(p => (
          <div key={p.side} className={styles.bikePanel}>
            <h3 className={styles.panelTitle}>{p.label}</h3>
            <canvas id={p.canvas} className={styles.canvas} resize="true" />

            <div className={styles.controls}>
              <div className="input-group">
                <label htmlFor={p.bikeSearch}>Велосипед</label>
                <input type="text" placeholder="Начните вводить название" id={p.bikeSearch} autoComplete="off" />
                <div id={p.bikeList} className="autocomplete-list" />
              </div>

              <div className="input-group">
                <label htmlFor={p.sizeSelect}>Размер</label>
                <select id={p.sizeSelect}>
                  <option>Выберите размер</option>
                </select>
              </div>

              <div className="input-group">
                <label htmlFor={p.fitSearch}>Посадка</label>
                <input type="text" placeholder="Выберите настройку" id={p.fitSearch} readOnly />
                <div id={p.fitList} className="autocomplete-list" />
              </div>

              <button className="btn btn-danger btn-block" id={p.deleteBtn} style={{ display: 'none' }}>
                Удалить посадку
              </button>

              <div className="input-group">
                <label htmlFor={p.fitInput}>Сохранить посадку</label>
                <div className={styles.inputRow}>
                  <input type="text" id={p.fitInput} placeholder="Название посадки" />
                  <button className="btn btn-success" id={p.saveBtn}>Сохранить</button>
                </div>
              </div>

              <button className="btn btn-primary btn-block" id={p.resetBtn}>Сбросить</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
