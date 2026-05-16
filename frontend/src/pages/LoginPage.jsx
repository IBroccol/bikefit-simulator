import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Card from '../components/ui/Card';
import FormField from '../components/ui/FormField';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import ThemeToggle from '../components/ui/ThemeToggle';
import styles from './AuthPage.module.css';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);

  function validate() {
    const errs = {};
    if (!username.trim()) errs.username = 'Введите логин';
    if (!password) errs.password = 'Введите пароль';
    return errs;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const errs = validate();
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setLoading(true);
    try {
      await login({ username: username.trim(), password });
      navigate('/dashboard');
    } catch (err) {
      const data = err.response?.data;
      if (data?.errors?.length) {
        const errs = {};
        data.errors.forEach(e => { if (e.field) errs[e.field] = e.message; });
        setFieldErrors(errs);
        setError(data.errors.map(e => e.message).join('; '));
      } else {
        setError(data?.error || 'Ошибка входа');
        // Generic auth failure — highlight both fields without text
        setFieldErrors({ username: ' ', password: ' ' });
      }
    } finally {
      setLoading(false);
    }
  }

  function clearFieldError(field) {
    setFieldErrors(prev => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  return (
    <div className={styles.page}>
      <div className={styles.themeBtn}>
        <ThemeToggle />
      </div>
      <Card className={styles.card}>
        <h2 className={styles.title}>Вход в систему</h2>

        <ErrorMessage message={error} />

        <form onSubmit={handleSubmit} className={styles.form} noValidate>
          <FormField
            id="username"
            label="Логин"
            type="text"
            placeholder="Введите логин"
            value={username}
            onChange={e => { setUsername(e.target.value); clearFieldError('username'); }}
            error={fieldErrors.username?.trim() ? fieldErrors.username : undefined}
            required
            autoFocus
          />
          <FormField
            id="password"
            label="Пароль"
            type={showPassword ? 'text' : 'password'}
            placeholder="Введите пароль"
            value={password}
            onChange={e => { setPassword(e.target.value); clearFieldError('password'); }}
            error={fieldErrors.password?.trim() ? fieldErrors.password : undefined}
            required
          />

          <label className={styles.showPassword}>
            <input
              type="checkbox"
              checked={showPassword}
              onChange={e => setShowPassword(e.target.checked)}
            />
            Показать пароль
          </label>

          <button
            type="submit"
            className={`btn btn-primary btn-block btn-lg ${styles.submitBtn}`}
            disabled={loading}
          >
            {loading ? 'Вход…' : 'Войти'}
          </button>
        </form>

        <p className={styles.link}>
          <Link to="/register">Нет аккаунта? Зарегистрироваться</Link>
        </p>
      </Card>
    </div>
  );
}
