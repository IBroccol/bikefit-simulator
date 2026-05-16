import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import fitsApi from '../api/fitsApi';
import Header from '../components/layout/Header';
import FormField from '../components/ui/FormField';
import { ErrorMessage, SuccessMessage } from '../components/ui/ErrorMessage';
import Spinner from '../components/ui/Spinner';
import styles from './AnthropometryPage.module.css';

const FIELDS = [
  {
    section: 'Основные параметры',
    items: [
      { name: 'height',     label: 'Рост, см',            placeholder: '170', hint: 'height' },
    ],
  },
  {
    section: 'Нижние конечности',
    items: [
      { name: 'hip',        label: 'Длина бедра, мм',     placeholder: '450', hint: 'hip' },
      { name: 'lowerLeg',   label: 'Длина голени, мм',    placeholder: '400', hint: 'lowerLeg' },
      { name: 'footLength', label: 'Длина стопы, мм',     placeholder: '260', hint: 'footLength' },
    ],
  },
  {
    section: 'Верхние конечности и туловище',
    items: [
      { name: 'torsoMax',   label: 'Длина туловища, мм',  placeholder: '500', hint: 'torsoMax' },
      { name: 'upperarm',   label: 'Длина плеча, мм',     placeholder: '320', hint: 'upperarm' },
      { name: 'forearm',    label: 'Длина предплечья, мм', placeholder: '280', hint: 'forearm' },
    ],
  },
];

const ALL_NAMES = FIELDS.flatMap(s => s.items.map(f => f.name));

function makeEmpty() {
  const v = {};
  ALL_NAMES.forEach(n => { v[n] = ''; });
  return v;
}

export default function AnthropometryPage() {
  const navigate = useNavigate();
  const [values, setValues] = useState(makeEmpty());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  // fieldErrors: { [name]: errorMessage }
  const [fieldErrors, setFieldErrors] = useState({});

  // Load existing anthropometry on mount
  useEffect(() => {
    fitsApi.getAnthropometry()
      .then(data => {
        if (data) {
          const filled = { ...makeEmpty() };
          Object.keys(data).forEach(k => {
            if (k in filled && data[k] !== null) {
              filled[k] = String(Math.round(parseFloat(data[k])));
            }
          });
          setValues(filled);
        }
      })
      .catch(() => {}) // no existing data — keep empty
      .finally(() => setLoading(false));
  }, []);

  function handleChange(name, val) {
    setValues(prev => ({ ...prev, [name]: val }));
    // Clear error for this field as soon as user types
    if (fieldErrors[name]) {
      setFieldErrors(prev => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validate: all fields required and must be positive numbers
    const errs = {};
    ALL_NAMES.forEach(n => {
      const v = values[n].trim();
      if (!v) {
        errs[n] = 'Обязательное поле';
      } else if (isNaN(Number(v)) || Number(v) <= 0) {
        errs[n] = 'Введите положительное число';
      }
    });

    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      setError('Заполните все поля корректно');
      return;
    }

    setFieldErrors({});
    const payload = {};
    ALL_NAMES.forEach(n => { payload[n] = parseInt(values[n], 10); });

    setSaving(true);
    try {
      await fitsApi.addAnthropometry(payload);
      setSuccess('Данные успешно сохранены!');
      setTimeout(() => navigate('/dashboard'), 1500);
    } catch (err) {
      const data = err.response?.data;
      if (data?.errors?.length) {
        const errs = {};
        data.errors.forEach(e => { if (e.field) errs[e.field] = e.message; });
        setFieldErrors(errs);
        setError(data.errors.map(e => e.message).join('; '));
      } else {
        setError(data?.error || 'Ошибка при сохранении');
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Spinner fullscreen />;

  return (
    <div className={styles.page}>
      <Header title="Мои параметры" backTo="/dashboard" />

      <main className={styles.main}>
        <ErrorMessage message={error} />
        <SuccessMessage message={success} />

        <form onSubmit={handleSubmit} className={styles.form} noValidate>
          {FIELDS.map(({ section, items }) => (
            <div key={section} className={styles.section}>
              <h3 className={styles.sectionTitle}>{section}</h3>
              <div className={styles.grid}>
                {items.map(f => (
                  <FormField
                    key={f.name}
                    id={f.name}
                    label={f.label}
                    type="number"
                    step="1"
                    min="1"
                    placeholder={f.placeholder}
                    value={values[f.name]}
                    onChange={e => handleChange(f.name, e.target.value)}
                    hint={f.hint ? `/hints/${f.hint}.png` : undefined}
                    error={fieldErrors[f.name]}
                    required
                  />
                ))}
              </div>
            </div>
          ))}

          <div className={styles.actions}>
            <button
              type="submit"
              className="btn btn-success btn-lg"
              disabled={saving}
            >
              {saving ? 'Сохранение…' : 'Сохранить данные'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
