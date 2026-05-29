import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Header from '../components/layout/Header';
import Card from '../components/ui/Card';
import styles from './DashboardPage.module.css';

const NAV_ITEMS = [
  { to: '/bikes/new',      label: 'Добавить велосипед' },
  { to: '/bikes',          label: 'Мои велосипеды' },
  { to: '/anthropometry',  label: 'Мои параметры' },
  { to: '/canvas',         label: 'Настройка посадки' },
  { to: '/compare',        label: 'Сравнение посадок' },
];

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/');
  }

  return (
    <div className={styles.page}>
      <Header title="Личный кабинет" backTo={false} />

      <main className={styles.main}>
        <Card className={styles.card}>
          <h2 className={styles.greeting}>
            Добро пожаловать, <span className={styles.username}>{user?.username}</span>!
          </h2>

          <nav className={styles.nav}>
            {NAV_ITEMS.map(({ to, label }) => (
              <Link key={to} to={to} className="btn btn-primary btn-block">
                {label}
              </Link>
            ))}

            {user?.role === 'moderator' && (
              <Link to="/moderation" className="btn btn-primary btn-block">
                Модерация
              </Link>
            )}
          </nav>

          <div className={styles.footer}>
            <button
              className="btn btn-danger btn-block"
              onClick={handleLogout}
            >
              Выйти
            </button>
          </div>
        </Card>
      </main>
    </div>
  );
}
