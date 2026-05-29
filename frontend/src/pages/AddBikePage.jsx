import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import bikesApi from '../api/bikesApi';
import Header from '../components/layout/Header';
import { ErrorMessage, SuccessMessage } from '../components/ui/ErrorMessage';
import styles from './AddBikePage.module.css';

const SHARED_PARAMS = [
  { name: 'rimD',          label: 'Диаметр обода, мм',          required: false, hint: 'rimD',          placeholder: '622' },
  { name: 'tyreW',         label: 'Ширина покрышек, мм',         required: false, hint: 'tyreW',         placeholder: '25' },
  { name: 'stemAngle',     label: 'Угол выноса, град.',          required: false, hint: 'stemAngle',     placeholder: '-8' },
  { name: 'minStemHight',  label: 'Мин. высота выноса, мм',      required: false, hint: 'minStemHight',  placeholder: '30' },
  { name: 'maxStemHight',  label: 'Макс. высота выноса, мм',     required: false, hint: 'maxStemHight',  placeholder: '70' },
  { name: 'barReach',      label: 'Рич руля, мм',                required: false, hint: 'barReach',      placeholder: '75' },
  { name: 'barDrop',       label: 'Дроп руля, мм',               required: false, hint: 'barDrop',       placeholder: '125' },
  { name: 'shifterReach',  label: 'Рич рукояток, мм',            required: false, hint: 'shifterReach',  placeholder: '70' },
  { name: 'saddleLen',     label: 'Длина седла, мм',             required: false, hint: 'saddleLen',     placeholder: '240' },
  { name: 'saddleRailLen', label: 'Длина рейлов седла, мм',      required: false, hint: 'saddleRailLen', placeholder: '60' },
  { name: 'saddleHeight',  label: 'Высота седла, мм',            required: false, hint: 'saddleHeight',  placeholder: '50' },
  { name: 'minseatpostLen',label: 'Мин. длина штыря, мм',        required: false, hint: 'minseatpostLen', placeholder: '50' },
  { name: 'maxseatpostLen',label: 'Макс. длина штыря, мм',       required: false, hint: 'maxseatpostLen', placeholder: '250' },
];

const PER_SIZE_PARAMS = [
  { section: 'Геометрия рамы' },
  { name: 'seatTube',  label: 'Длина подседельной трубы, мм',  required: true,  hint: 'seatTube' },
  { name: 'seatAngle', label: 'Угол подседельной трубы, град.', required: true,  hint: 'seatAngle' },
  { name: 'headTube',  label: 'Длина рулевого стакана, мм',     required: true,  hint: 'headTube' },
  { name: 'headAngle', label: 'Угол рулевого стакана, град.',   required: true,  hint: 'headAngle' },
  { name: 'bbdrop',    label: 'Провис каретки, мм',             required: true,  hint: 'bbDrop' },
  { name: 'chainstay', label: 'Длина нижних перьев, мм',        required: true,  hint: 'chainstay' },
  { name: 'wheelbase', label: 'Колёсная база, мм',              required: true,  hint: 'wheelbase' },
  { name: 'stack',     label: 'Стэк (Stack), мм',               required: true,  hint: 'stack' },
  { name: 'reach',     label: 'Рич (Reach), мм',                required: true,  hint: 'reach' },
  { section: 'Трансмиссия' },
  { name: 'crankLen',  label: 'Длина шатунов, мм',              required: true,  hint: 'crankLen' },
  { section: 'Посадка' },
  { name: 'stemLen',   label: 'Длина выноса, мм',               required: true,  hint: 'stemLen' },
];

function makeEmptySize() {
  const vals = {};
  PER_SIZE_PARAMS.forEach(p => { if (p.name) vals[p.name] = ''; });
  return { label: '', values: vals };
}

function makeEmptyShared() {
  const vals = {};
  SHARED_PARAMS.forEach(p => { vals[p.name] = ''; });
  return vals;
}

function isCellInvalid(value, required, submitted) {
  if (!submitted) return false;
  if (required && !String(value).trim()) return true;
  return false;
}

export default function AddBikePage() {
  const navigate = useNavigate();

  const [model, setModel] = useState('');
  const [sizes, setSizes] = useState([makeEmptySize()]);
  const [shared, setShared] = useState(makeEmptyShared());
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [serverCellErrors, setServerCellErrors] = useState({});
  const [serverSharedErrors, setServerSharedErrors] = useState({});
  const [importUrl, setImportUrl] = useState('');
  const [importing, setImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState('');

  async function handleImport(e) {
    e.preventDefault();
    if (!importUrl.trim()) return;
    setImporting(true);
    setError('');
    setImportSuccess('');

    try {
      const data = await bikesApi.parseUrl(importUrl.trim());

      if (data.model) setModel(data.model);

      if (data.sizes?.length) {
        const newSizes = data.sizes.map(s => {
          const vals = {};
          PER_SIZE_PARAMS.forEach(p => {
            if (!p.name) return;
            vals[p.name] = s[p.name] !== undefined ? String(s[p.name]) : '';
          });
          return { label: s.label || '', values: vals };
        });
        setSizes(newSizes);

        const first = data.sizes[0];
        setShared(prev => {
          const next = { ...prev };
          SHARED_PARAMS.forEach(p => {
            if (first[p.name] !== undefined && first[p.name] !== null) {
              next[p.name] = String(first[p.name]);
            }
          });
          return next;
        });
      }

      setImportSuccess(`Импортировано ${data.sizes?.length ?? 0} размеров. Проверьте и дополните недостающие поля.`);
      setImportUrl('');
    } catch (err) {
      const msg = err.response?.data?.error || 'Ошибка при импорте данных';
      setError(msg);
    } finally {
      setImporting(false);
    }
  }

  function addSize() {
    setSizes(prev => [...prev, makeEmptySize()]);
  }

  function removeSize(idx) {
    setSizes(prev => prev.filter((_, i) => i !== idx));
  }

  function updateSizeLabel(idx, val) {
    setSizes(prev => prev.map((s, i) => i === idx ? { ...s, label: val } : s));
  }

  function updateSizeValue(idx, param, val) {
    setSizes(prev => prev.map((s, i) =>
      i === idx ? { ...s, values: { ...s.values, [param]: val } } : s
    ));
    setServerCellErrors(prev => {
      if (!prev[idx]?.[param]) return prev;
      const next = { ...prev, [idx]: { ...prev[idx] } };
      delete next[idx][param];
      return next;
    });
  }

  function updateShared(param, val) {
    setShared(prev => ({ ...prev, [param]: val }));
    setServerSharedErrors(prev => {
      if (!prev[param]) return prev;
      const next = { ...prev };
      delete next[param];
      return next;
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitted(true);
    setError('');
    setSuccess('');
    setServerCellErrors({});
    setServerSharedErrors({});

    if (!model.trim()) { setError('Введите модель велосипеда'); return; }
    if (sizes.length === 0) { setError('Добавьте хотя бы один размер'); return; }

    const labels = sizes.map(s => s.label.trim());
    if (labels.some(l => !l)) { setError('Укажите название для каждого размера'); return; }
    if (new Set(labels).size !== labels.length) { setError('Размеры должны быть уникальными'); return; }

    const requiredPerSize = PER_SIZE_PARAMS.filter(p => p.name && p.required).map(p => p.name);
    for (const s of sizes) {
      for (const name of requiredPerSize) {
        if (!String(s.values[name]).trim()) {
          setError('Заполните все обязательные поля (отмечены *)');
          return;
        }
      }
    }

    const requiredShared = SHARED_PARAMS.filter(p => p.required).map(p => p.name);
    for (const name of requiredShared) {
      if (!String(shared[name]).trim()) {
        setError('Заполните все обязательные общие параметры (отмечены *)');
        return;
      }
    }

    const bikes = sizes.map(s => {
      const bike = { model: model.trim(), size: s.label.trim() };
      SHARED_PARAMS.forEach(p => {
        const v = shared[p.name] !== '' ? shared[p.name] : (p.placeholder ?? '');
        if (v !== '') bike[p.name] = parseFloat(v);
      });
      PER_SIZE_PARAMS.forEach(p => {
        if (!p.name) return;
        const v = s.values[p.name];
        if (v !== '') bike[p.name] = parseFloat(v);
      });
      return bike;
    });

    setLoading(true);
    try {
      await bikesApi.addBike(bikes);
      setSuccess('Велосипед успешно добавлен!');
      setTimeout(() => navigate('/dashboard'), 1500);
    } catch (err) {
      const data = err.response?.data;
      if (data?.errors?.length) {
        const sharedParamNames = new Set(SHARED_PARAMS.map(p => p.name));
        const cellErrs = {};
        const sharedErrs = {};

        data.errors.forEach(e => {
          if (!e.field) return;
          const field = e.field;

          if (sharedParamNames.has(field)) {
            sharedErrs[field] = e.message;
            return;
          }

          const match = field.match(/^(.+?)_(\d+)$/);
          if (match) {
            const paramName = match[1];
            const idx = parseInt(match[2], 10);
            if (!cellErrs[idx]) cellErrs[idx] = {};
            cellErrs[idx][paramName] = e.message;
          } else {
            if (!cellErrs[0]) cellErrs[0] = {};
            cellErrs[0][field] = e.message;
          }
        });

        setServerCellErrors(cellErrs);
        setServerSharedErrors(sharedErrs);
        setError(data.errors.map(e => e.message).join('; '));
      } else {
        setError(data?.error || 'Ошибка при сохранении');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <Header title="Добавить велосипед" backTo="/dashboard" />

      <main className={styles.main}>
        <ErrorMessage message={error} />
        <SuccessMessage message={success} />
        <SuccessMessage message={importSuccess} />

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Импорт с bikeinsights.com</h3>
          <p className={styles.importHint}>
            Вставьте ссылку на страницу велосипеда с{' '}
            <a href="https://bikeinsights.com" target="_blank" rel="noopener noreferrer">bikeinsights.com</a>
            {' '}— данные геометрии будут заполнены автоматически.
          </p>
          <div className={styles.importForm}>
            <input
              className={styles.importInput}
              type="url"
              placeholder="https://bikeinsights.com/bikes/..."
              value={importUrl}
              onChange={e => setImportUrl(e.target.value)}
            />
            <button
              type="button"
              className={`btn btn-info ${styles.importBtn}`}
              disabled={importing || !importUrl.trim()}
              onClick={handleImport}
            >
              {importing ? 'Загрузка…' : 'Импортировать'}
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} noValidate className={styles.mainForm}>
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Основная информация</h3>
            <div className={styles.field}>
              <label htmlFor="model" className={styles.label}>Модель велосипеда *</label>
              <input
                id="model"
                className={`${styles.input} ${submitted && !model.trim() ? styles.inputError : ''}`}
                type="text"
                placeholder="Например, Trek Domane SL 6"
                value={model}
                onChange={e => setModel(e.target.value)}
                required
              />
              {submitted && !model.trim() && (
                <span className={styles.fieldError}>Обязательное поле</span>
              )}
            </div>
          </div>

          <div className={styles.tableSection}>
            <div className={`${styles.sizesHeader} ${styles.tableSectionHeader}`}>
              <h3 className={styles.sectionTitle}>Геометрия по размерам</h3>
              <button type="button" className="btn btn-info" onClick={addSize}>
                + Добавить размер
              </button>
            </div>

            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={styles.paramHeader}>Параметр</th>
                    {sizes.map((s, idx) => (
                      <th key={idx} className={styles.sizeHeader}>
                        <div className={styles.sizeHeaderInner}>
                          <input
                            className={`${styles.sizeInput} ${submitted && !s.label.trim() ? styles.inputError : ''}`}
                            type="text"
                            placeholder="Размер"
                            value={s.label}
                            onChange={e => updateSizeLabel(idx, e.target.value)}
                          />
                          {sizes.length > 1 && (
                            <button
                              type="button"
                              className={styles.removeBtn}
                              title="Удалить размер"
                              onClick={() => removeSize(idx)}
                            >×</button>
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {PER_SIZE_PARAMS.map((p, rowIdx) => {
                    if (p.section) {
                      return (
                        <tr key={`sec-${rowIdx}`}>
                          <td className={styles.sectionRow} colSpan={sizes.length + 1}>
                            {p.section}
                          </td>
                        </tr>
                      );
                    }
                    return (
                      <tr key={p.name}>
                        <td className={styles.paramCell}>
                          {p.hint && (
                            <span className={styles.hintWrap}>
                              <span className={styles.hintIcon}>?</span>
                              <img
                                src={`/hints/${p.hint}.png`}
                                alt={p.label}
                                className={styles.hintImg}
                              />
                            </span>
                          )}
                          {p.label}{p.required && ' *'}
                        </td>
                        {sizes.map((s, idx) => {
                          const cellErr = serverCellErrors[idx]?.[p.name];
                          const isInvalid = isCellInvalid(s.values[p.name], p.required, submitted) || !!cellErr;
                          return (
                            <td key={idx} className={styles.cellWrap}>
                              <input
                                className={`${styles.numInput} ${isInvalid ? styles.inputError : ''}`}
                                type="number"
                                step="0.1"
                                value={s.values[p.name]}
                                onChange={e => updateSizeValue(idx, p.name, e.target.value)}
                                required={p.required}
                                title={cellErr || ''}
                              />
                              {cellErr && (
                                <span className={styles.cellError}>{cellErr}</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Общие параметры (для всех размеров)</h3>
            <div className={styles.sharedGrid}>
              {SHARED_PARAMS.map(p => (
                <div key={p.name} className={styles.field}>
                  <label htmlFor={p.name} className={styles.label}>
                    {p.hint && (
                      <span className={styles.hintWrap}>
                        <span className={styles.hintIcon}>?</span>
                        <img
                          src={`/hints/${p.hint}.png`}
                          alt={p.label}
                          className={styles.hintImg}
                        />
                      </span>
                    )}
                    {p.label}{p.required && ' *'}
                  </label>
                  <input
                    id={p.name}
                    className={`${styles.numInput} ${
                      isCellInvalid(shared[p.name], p.required, submitted) || !!serverSharedErrors[p.name]
                        ? styles.inputError : ''
                    }`}
                    type="number"
                    step="0.1"
                    placeholder={p.placeholder || ''}
                    value={shared[p.name]}
                    onChange={e => updateShared(p.name, e.target.value)}
                    required={p.required}
                  />
                  {isCellInvalid(shared[p.name], p.required, submitted) && (
                    <span className={styles.fieldError}>Обязательное поле</span>
                  )}
                  {serverSharedErrors[p.name] && (
                    <span className={styles.fieldError}>{serverSharedErrors[p.name]}</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className={styles.actions}>
            <button
              type="submit"
              className="btn btn-success btn-lg"
              disabled={loading}
            >
              {loading ? 'Сохранение…' : 'Сохранить велосипед'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
