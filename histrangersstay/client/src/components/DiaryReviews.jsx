import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const TURN_MS = 850;
const reduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

function Stars({ n = 5 }) {
  return (
    <div className="diary-stars" aria-label={`${n} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => <span key={i} className={i <= n ? '' : 'off'}>★</span>)}
    </div>
  );
}

// One written page of the diary
function Sheet({ items, pageNo, total, title, twoCol, className = '' }) {
  return (
    <div className={`diary-paper ${className}`}>
      <div className="diary-rings" aria-hidden="true" />
      <div className="diary-content">
        <div className="diary-head">
          <h3>{title}</h3>
          <span>page {pageNo}</span>
        </div>
        {items.length === 0 ? (
          <p className="diary-text">No entries yet. The first page is waiting for a story…</p>
        ) : (
          <div className={twoCol ? 'diary-cols' : ''}>
            {items.map((r) => (
              <article key={r.id} className="diary-entry">
                <Stars n={r.rating} />
                <p className="diary-text">{r.text}</p>
                <p className="diary-sign">
                  {r.name}
                  {(r.country || r.stayedOn) && <small>{[r.country, r.stayedOn].filter(Boolean).join(' · ')}</small>}
                </p>
              </article>
            ))}
          </div>
        )}
      </div>
      <span className="diary-folio" aria-hidden="true">{pageNo} / {total}</span>
    </div>
  );
}

/**
 * Guest reviews written in a ruled, handwritten diary. `perPage` reviews sit on each page and
 * the page turns over like a real diary leaf. Works with arrows, number buttons, keyboard and swipe.
 */
export default function DiaryReviews({ reviews, perPage = 10, title = 'Guest diary', twoCol = true }) {
  const pages = useMemo(() => {
    const out = [];
    for (let i = 0; i < reviews.length; i += perPage) out.push(reviews.slice(i, i + perPage));
    return out.length ? out : [[]];
  }, [reviews, perPage]);
  const total = pages.length;

  const [page, setPage] = useState(0);
  const [turn, setTurn] = useState(null); // { from, to, dir }
  const bookRef = useRef(null);
  const touchX = useRef(null);
  const timer = useRef(null);

  // Reviews changed (e.g. loaded or edited) and the current page no longer exists
  useEffect(() => { if (page > total - 1) setPage(total - 1); }, [page, total]);
  useEffect(() => () => clearTimeout(timer.current), []);

  const finish = useCallback((to) => {
    clearTimeout(timer.current);
    setPage(to);
    setTurn(null);
  }, []);

  const goTo = useCallback((to, fromNav = false) => {
    if (turn || to === page || to < 0 || to > total - 1) return;
    if (fromNav && bookRef.current) {
      const top = bookRef.current.getBoundingClientRect().top;
      if (top < 90) window.scrollTo({ top: top + window.scrollY - 110, behavior: reduced() ? 'auto' : 'smooth' });
    }
    if (reduced()) { setPage(to); return; }
    setTurn({ from: page, to, dir: to > page ? 'next' : 'prev' });
    timer.current = setTimeout(() => finish(to), TURN_MS + 300); // safety net if animationend never fires
  }, [turn, page, total, finish]);

  const onKey = (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); goTo(page + 1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(page - 1); }
  };
  const onTouchEnd = (e) => {
    if (touchX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    touchX.current = null;
    if (Math.abs(dx) > 60) goTo(dx < 0 ? page + 1 : page - 1);
  };

  const shown = turn ? turn.from : page;
  // Next: new page waits underneath, old page lifts away. Previous: old page stays, the earlier page falls back on top.
  const under = turn ? (turn.dir === 'next' ? turn.to : turn.from) : page;
  const leaf = turn ? (turn.dir === 'next' ? turn.from : turn.to) : null;
  const sheet = (i, extra = {}) => (
    <Sheet items={pages[i]} pageNo={i + 1} total={total} title={title} twoCol={twoCol} {...extra} />
  );

  return (
    <div>
      <div
        ref={bookRef}
        className="diary-book mr-3.5 mb-3.5 outline-none"
        tabIndex={0}
        role="group"
        aria-roledescription="diary"
        aria-label={`${title}, page ${shown + 1} of ${total}. Use the left and right arrow keys to turn pages.`}
        onKeyDown={onKey}
        onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
        onTouchEnd={onTouchEnd}
      >
        <div className="diary-stack" aria-live="polite">
          <div key={`u${under}`} className={turn ? 'diary-under' : ''}>{sheet(under)}</div>
          {turn && (
            <div
              key={`l${leaf}${turn.dir}`}
              className={`diary-leaf ${turn.dir}`}
              onAnimationEnd={(e) => { if (e.target === e.currentTarget) finish(turn.to); }}
              aria-hidden="true"
            >
              <div className="face front">{sheet(leaf)}</div>
              <div className="face back" />
              <div className="shade" />
            </div>
          )}
        </div>
      </div>

      {total > 1 && (
        <nav className="diary-nav mt-8 flex flex-wrap items-center justify-center gap-3" aria-label="Diary pages">
          <button type="button" onClick={() => goTo(page - 1, true)} disabled={page === 0 || !!turn} aria-label="Previous page">← Back</button>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {pages.map((_, i) => (
              <button key={i} type="button" className="num" aria-label={`Page ${i + 1}`} aria-current={i === page ? 'page' : undefined} onClick={() => goTo(i, true)} disabled={!!turn}>{i + 1}</button>
            ))}
          </div>
          <button type="button" onClick={() => goTo(page + 1, true)} disabled={page === total - 1 || !!turn} aria-label="Next page">Turn page →</button>
        </nav>
      )}
    </div>
  );
}
