import styles from './ErrorMessage.module.css';

export function ErrorMessage({ message }) {
  if (!message) return null;
  return <div className={styles.error}>{message}</div>;
}

export function SuccessMessage({ message }) {
  if (!message) return null;
  return <div className={styles.success}>{message}</div>;
}
