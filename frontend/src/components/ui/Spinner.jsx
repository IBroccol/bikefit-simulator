import styles from './Spinner.module.css';

export function Spinner({ fullscreen }) {
  if (fullscreen) {
    return (
      <div className={styles.fullscreen}>
        <div className={styles.spinner} />
      </div>
    );
  }
  return <div className={styles.spinner} />;
}

export default Spinner;
