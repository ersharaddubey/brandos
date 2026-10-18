import { useEffect } from 'react';

// Spatial UI engine: cursor-driven parallax on the background + 3D tilt and specular light on `.tilt` cards.
// Only active for mouse/trackpad users who haven't asked for reduced motion.
export default function Spatial() {
  useEffect(() => {
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!fine || calm) return undefined;
    const root = document.documentElement;
    let raf = 0;
    let last = null;

    const apply = () => {
      raf = 0;
      if (!last) return;
      const { x, y, target } = last;
      root.style.setProperty('--px', ((x / window.innerWidth) - 0.5).toFixed(3));
      root.style.setProperty('--py', ((y / window.innerHeight) - 0.5).toFixed(3));
      const card = target instanceof Element ? target.closest('.tilt') : null;
      if (card) {
        const r = card.getBoundingClientRect();
        const nx = (x - r.left) / r.width;
        const ny = (y - r.top) / r.height;
        card.style.setProperty('--ry', `${((nx - 0.5) * 9).toFixed(2)}deg`);
        card.style.setProperty('--rx', `${((0.5 - ny) * 9).toFixed(2)}deg`);
        card.style.setProperty('--mx', `${(nx * 100).toFixed(1)}%`);
        card.style.setProperty('--my', `${(ny * 100).toFixed(1)}%`);
      }
    };
    const move = (e) => { last = { x: e.clientX, y: e.clientY, target: e.target }; if (!raf) raf = requestAnimationFrame(apply); };
    const leave = (e) => {
      const card = e.target instanceof Element ? e.target.closest?.('.tilt') : null;
      if (card && !card.contains(e.relatedTarget)) { card.style.setProperty('--rx', '0deg'); card.style.setProperty('--ry', '0deg'); }
    };
    window.addEventListener('pointermove', move, { passive: true });
    document.addEventListener('pointerout', leave, { passive: true });
    return () => { window.removeEventListener('pointermove', move); document.removeEventListener('pointerout', leave); if (raf) cancelAnimationFrame(raf); };
  }, []);
  return null;
}
