import styles from './FormField.module.css';

/**
 * FormField — controlled input with label and optional error.
 * Props:
 *   label      — visible label text
 *   id         — links <label> to <input>
 *   error      — validation error string (shown below input)
 *   hint       — optional hint image src (tooltip-style)
 *   ...rest    — forwarded to <input> (type, value, onChange, min, max, step, …)
 */
export default function FormField({ label, id, error, hint, ...rest }) {
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
        {hint && (
          <span className={styles.hintWrapper}>
            <span className={styles.hintIcon}>?</span>
            <img src={hint} alt={label} className={styles.hintImg} />
          </span>
        )}
      </label>
      <input id={id} className={`${styles.input} ${error ? styles.inputError : ''}`} {...rest} />
      {error && <span className={styles.error}>{error}</span>}
    </div>
  );
}
