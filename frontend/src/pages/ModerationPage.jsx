import { useEffect, useRef } from 'react';
import Header from '../components/layout/Header';
import styles from './ModerationPage.module.css';

export default function ModerationPage() {
  const scriptsRef = useRef([]);

  useEffect(() => {
    window.element_ids = {
      canvas:      'bike-canvas',
      bikeList:    'pending-bikes',
      sizeButtons: 'size-buttons',
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
        await loadScript('https://unpkg.com/paper@0.12.15/dist/paper-full.min.js');
        await loadScript('/static/js/moderation.js', 'module');
      } catch (err) {
        console.error('Failed to load moderation scripts', err);
      }
    }

    init();

    return () => {
      scriptsRef.current.forEach(s => { if (s.parentNode) s.parentNode.removeChild(s); });
      scriptsRef.current = [];
      delete window.element_ids;
    };
  }, []);

  return (
    <div className={styles.page}>
      <Header title="Модерация велосипедов" backTo="/dashboard" />

      <main id="moderation-container" className={styles.main}>
        {/* Left: pending bikes list — populated by moderation.js */}
        <aside id="pending-bikes" className={styles.sidebar}>
          <p className={styles.loading}>Загрузка моделей…</p>
        </aside>

        {/* Right: canvas + size buttons */}
        <section id="preview-section" className={styles.preview}>
          <canvas id="bike-canvas" className={styles.canvas} resize="true" />
          <div id="size-buttons" className={styles.sizeButtons} />
        </section>
      </main>
    </div>
  );
}
