import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import authApi from '../api/authApi';
import Card from '../components/ui/Card';
import FormField from '../components/ui/FormField';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import ThemeToggle from '../components/ui/ThemeToggle';
import styles from './AuthPage.module.css';

export default function RegisterPage() {
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);

  function validate() {
    const errs = {};
    if (!username.trim()) errs.username = 'Введите логин';
    if (!password) errs.password = 'Введите пароль';
    if (!confirmPassword) errs.confirmPassword = 'Повторите пароль';
    if (password && confirmPassword && password !== confirmPassword) {
      errs.confirmPassword = 'Пароли не совпадают';
    }
    return errs;
  }

  function clearFieldError(field) {
    setFieldErrors(prev => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const errs = validate();
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setLoading(true);
    try {
      await authApi.register({ username: username.trim(), password, confirm_password: confirmPassword });
      navigate('/');
    } catch (err) {
      const data = err.response?.data;
      if (data?.errors?.length) {
        const errs = {};
        // Server uses confirm_password; React state key is confirmPassword
        const fieldMap = { confirm_password: 'confirmPassword' };
        data.errors.forEach(e => {
          if (e.field) {
            const key = fieldMap[e.field] ?? e.field;
            errs[key] = e.message;
          }
        });
        setFieldErrors(errs);
        setError(data.errors.map(e => e.message).join('; '));
      } else {
        setError(data?.error || 'Ошибка регистрации');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.themeBtn}>
        <ThemeToggle />
      </div>
      <Card className={styles.card}>
        <h2 className={styles.title}>Регистрация</h2>

        <ErrorMessage message={error} />

        <form onSubmit={handleSubmit} className={styles.form} noValidate>
          <FormField
            id="username"
            label="Логин"
            type="text"
            placeholder="Введите логин"
            value={username}
            onChange={e => { setUsername(e.target.value); clearFieldError('username'); }}
            error={fieldErrors.username}
            required
            autoFocus
          />
          <FormField
            id="password"
            label="Пароль"
            type={showPassword ? 'text' : 'password'}
            placeholder="Введите пароль"
            value={password}
            onChange={e => { setPassword(e.target.value); clearFieldError('password'); clearFieldError('confirmPassword'); }}
            error={fieldErrors.password}
            required
          />
          <FormField
            id="confirm_password"
            label="Подтверждение пароля"
            type={showPassword ? 'text' : 'password'}
            placeholder="Повторите пароль"
            value={confirmPassword}
            onChange={e => { setConfirmPassword(e.target.value); clearFieldError('confirmPassword'); }}
            error={fieldErrors.confirmPassword}
            required
          />

          <label className={styles.showPassword}>
            <input
              type="checkbox"
              checked={showPassword}
              onChange={e => setShowPassword(e.target.checked)}
            />
            Показать пароли
          </label>

          <button
            type="submit"
            className={`btn btn-primary btn-block btn-lg ${styles.submitBtn}`}
            disabled={loading}
          >
            {loading ? 'Регистрация…' : 'Зарегистрироваться'}
          </button>
        </form>

        <p className={styles.link}>
          <Link to="/">Уже есть аккаунт? Войти</Link>
        </p>
      </Card>
    </div>
  );
}
