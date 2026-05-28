import { useState, useEffect, useRef } from 'react';
import bikesApi from '../api/bikesApi';
import Header from '../components/layout/Header';
import { Spinner } from '../components/ui/Spinner';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import styles from './MyBikesPage.module.css';

const STATUS_LABELS = {
  private: 'Приватный',
  public: 'Публичный',
  pending: 'На рассмотрении',
};

export default function MyBikesPage() {
  const [bikes, setBikes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedBike, setSelectedBike] = useState(null);
  const [sizes, setSizes] = useState([]);
  const [selectedSize, setSelectedSize] = useState(null);

  const scriptsRef = useRef([]);
  const selectedBikeRef = useRef(null);

  useEffect(() => {
    loadBikes();
  }, []);

  useEffect(() => {
    selectedBikeRef.current = selectedBike;
  }, [selectedBike]);

  useEffect(() => {
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

        const inlineScript = document.createElement('script');
        inlineScript.type = 'module';
        inlineScript.textContent = `
          import { Drawer } from '/static/js/canvas_drawer.js';

          let _drawer = null;

          window.__myBikesClearCanvas = function() {
            if (_drawer) {
              try { _drawer.clearCanvas(); } catch(e) {}
              _drawer = null;
            }
          };

          window.__myBikesDrawPreview = async function(sizeId) {
            try {
              const res = await fetch('/bikes/geometry', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ size_id: sizeId }),
              });
              const result = await res.json();
              if (!result.success) return;

              const geo = result.data;

              if (_drawer) {
                try { _drawer.clearCanvas(); } catch(e) {}
              }
              _drawer = new Drawer('mybikes-canvas', geo, null, null);
              _drawer.INIT_GEOMETRY = geo;
              _drawer.draw_preview();
            } catch(err) {
              console.error('drawBikePreview error:', err);
            }
          };
        `;
        document.head.appendChild(inlineScript);
        scriptsRef.current.push(inlineScript);
      } catch (err) {
        console.error('Failed to load canvas scripts', err);
      }
    }

    init();

    return () => {
      scriptsRef.current.forEach(s => { if (s.parentNode) s.parentNode.removeChild(s); });
      scriptsRef.current = [];
      delete window.__myBikesDrawPreview;
      delete window.__myBikesClearCanvas;
    };
  }, []);

  async function loadBikes() {
    setLoading(true);
    setError('');
    try {
      const data = await bikesApi.getUserBikes();
      setBikes(data);
    } catch {
      setError('Ошибка загрузки велосипедов');
    } finally {
      setLoading(false);
    }
  }

  async function handleSelectBike(bike) {
    setSelectedBike(bike);
    setSelectedSize(null);
    setSizes([]);
    if (window.__myBikesClearCanvas) window.__myBikesClearCanvas();
    try {
      const data = await bikesApi.getSizes(bike.id);
      setSizes(data);
    } catch {
      setSizes([]);
    }
  }

  async function handleSelectSize(sizeObj) {
    setSelectedSize(sizeObj.size);
    // Wait a tick so the canvas is definitely in the DOM before Drawer accesses it
    setTimeout(() => {
      if (window.__myBikesDrawPreview) {
        window.__myBikesDrawPreview(sizeObj.id);
      }
    }, 0);
  }

  async function handleSendToModeration(bikeId) {
    try {
      await bikesApi.setBikePending(bikeId);
      await loadBikes();
    } catch {
      setError('Ошибка при отправке на модерацию');
    }
  }

  async function handleDelete(bikeId) {
    try {
      await bikesApi.deleteBike(bikeId);
      if (selectedBike?.id === bikeId) {
        setSelectedBike(null);
        setSizes([]);
        setSelectedSize(null);
      }
      await loadBikes();
    } catch {
      setError('Ошибка при удалении велосипеда');
    }
  }

  return (
    <div className={styles.page}>
      <Header title="Мои велосипеды" backTo="/dashboard" />

      <main className={styles.main}>
        <ErrorMessage message={error} />

        {loading ? (
          <Spinner />
        ) : (
          <div className={styles.layout}>
            {/* Left: bike list */}
            <aside className={styles.sidebar}>
              {bikes.length === 0 ? (
                <p className={styles.empty}>Нет добавленных велосипедов</p>
              ) : (
                bikes.map(bike => (
                  <div
                    key={bike.id}
                    className={`${styles.bikeItem} ${selectedBike?.id === bike.id ? styles.active : ''}`}
                    onClick={() => handleSelectBike(bike)}
                  >
                    <div className={styles.bikeInfo}>
                      <h3 className={styles.bikeModel}>{bike.model}</h3>
                      <p className={styles.bikeMeta}>
                        <b>Статус:</b> {STATUS_LABELS[bike.status] ?? bike.status}
                      </p>
                      <p className={styles.bikeMeta}>
                        <b>Добавлен:</b>{' '}
                        {new Date(bike.created_at).toLocaleString('ru-RU')}
                      </p>
                    </div>
                    <div className={styles.bikeActions} onClick={e => e.stopPropagation()}>
                      {bike.status === 'private' && (
                        <button
                          className="btn btn-info"
                          onClick={() => handleSendToModeration(bike.id)}
                        >
                          На модерацию
                        </button>
                      )}
                      <button
                        className="btn btn-danger"
                        onClick={() => handleDelete(bike.id)}
                      >
                        Удалить
                      </button>
                    </div>
                  </div>
                ))
              )}
            </aside>

            {/* Right: canvas + size buttons */}
            <section className={styles.preview}>
              <canvas
                id="mybikes-canvas"
                className={styles.canvas}
              />

              {sizes.length > 0 && (
                <div className={styles.sizeButtons}>
                  {sizes.map(s => (
                    <button
                      key={s.id}
                      className={`btn ${selectedSize === s.size ? 'btn-primary' : 'btn-secondary'} ${styles.sizeBtn}`}
                      onClick={() => handleSelectSize(s)}
                    >
                      {s.size}
                    </button>
                  ))}
                </div>
              )}
              {!selectedBike && (
                <p className={styles.hint}>Выберите велосипед для просмотра</p>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
