import { useEffect, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, History } from 'lucide-react';
import { api } from './api';
import type { Movement } from './types';

export function Activity() {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    api<{ movements: Movement[] }>('/inventory/movements', { signal: controller.signal })
      .then((data) => setMovements(data.movements))
      .catch((error: Error) => {
        if (error.name !== 'AbortError') setError(error.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [revision]);
  return (
    <>
      <div className="section-heading">
        <div>
          <h2>Inventory activity</h2>
          <p className="muted">The latest 50 stock updates across your showroom.</p>
        </div>
        <span className="outline-tag">
          <History size={14} /> Activity log
        </span>
      </div>
      {error ? (
        <div className="empty-state">
          <p role="alert">{error}</p>
          <button className="button secondary" onClick={() => setRevision(revision + 1)}>
            Try again
          </button>
        </div>
      ) : loading ? (
        <div className="empty-state" role="status">
          Loading activity…
        </div>
      ) : !movements.length ? (
        <div className="empty-state">No stock updates yet. Add a vehicle to get started.</div>
      ) : (
        <div className="activity-list">
          {movements.map((movement) => (
            <article key={movement.id} className="activity-row">
              <span className={`activity-icon ${movement.kind === 'purchase' ? 'out' : ''}`}>
                {movement.kind === 'purchase' ? (
                  <ArrowUpRight size={20} />
                ) : (
                  <ArrowDownLeft size={20} />
                )}
              </span>
              <div className="activity-description">
                <strong>{movement.vehicleName}</strong>
                <span>
                  {movement.kind === 'initial'
                    ? 'Initial stock'
                    : movement.kind === 'purchase'
                      ? 'Purchased'
                      : 'Restocked'}{' '}
                  · {movement.actorName}
                </span>
              </div>
              <div className="activity-quantity">
                <strong className={movement.delta < 0 ? 'text-amber-700' : 'text-emerald-700'}>
                  {movement.delta > 0 ? '+' : ''}
                  {movement.delta} units
                </strong>
                <span>{movement.quantityAfter} remaining</span>
              </div>
              <time dateTime={movement.createdAt}>
                {new Date(movement.createdAt).toLocaleString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </time>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
