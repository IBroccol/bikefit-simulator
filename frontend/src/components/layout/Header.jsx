import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import ThemeToggle from '../ui/ThemeToggle';
import styles from './Header.module.css';

export default function Header({ title, backTo }) {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleBack = () => navigate(backTo || '/dashboard');

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        {backTo !== false && (
          <button className="btn btn-secondary btn-sm" onClick={handleBack}>
            ← В меню
          </button>
        )}
        {title && <h1 className={styles.title}>{title}</h1>}
      </div>
      <div className={styles.right}>
        <ThemeToggle />
        <button className="btn btn-danger btn-sm" onClick={handleLogout}>
          Выйти
        </button>
      </div>
    </header>
  );
}
