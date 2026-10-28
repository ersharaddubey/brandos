// Cafe guest session. A guest scans the table QR code, enters name + phone once and can order without an account.
// Stored in this browser only (localStorage) and expires after 12 hours, so a shared phone is not left logged in.
const GUEST_KEY = 'hs_cafe_guest';
const TABLE_KEY = 'hs_cafe_table';
const ORDERS_KEY = 'hs_cafe_orders';
const QR_KEY = 'hs_cafe_qr';
const TTL = 12 * 60 * 60 * 1000;

const read = (store, key) => { try { return JSON.parse(store.getItem(key)); } catch { return null; } };
const write = (store, key, v) => { try { store.setItem(key, JSON.stringify(v)); } catch { /* private mode: ignore */ } };

export const digits = (v) => String(v || '').replace(/\D/g, '');

export function getGuest() {
  const g = read(localStorage, GUEST_KEY);
  if (!g || !g.name || !g.phone || Date.now() - (g.at || 0) > TTL) {
    try { localStorage.removeItem(GUEST_KEY); } catch { /* ignore */ }
    return null;
  }
  return g;
}

export function saveGuest({ name, phone }) {
  const g = { name: String(name).trim(), phone: String(phone).trim(), at: Date.now() };
  write(localStorage, GUEST_KEY, g);
  return g;
}

export function clearGuest() { try { localStorage.removeItem(GUEST_KEY); } catch { /* ignore */ } }

// Table number from the QR code (?table=5). Kept for the browser session so it survives page changes.
export const getTable = () => read(sessionStorage, TABLE_KEY) || '';
export const saveTable = (t) => write(sessionStorage, TABLE_KEY, String(t || '').slice(0, 20));

// Remember for this visit that the guest came in through a QR code (used to tag the order as a QR order)
export const markQr = () => write(sessionStorage, QR_KEY, 1);
export const cameViaQr = () => !!read(sessionStorage, QR_KEY);

// Orders placed from this browser, so a guest can open the bill again without remembering the number
export const getOrders = () => (Array.isArray(read(localStorage, ORDERS_KEY)) ? read(localStorage, ORDERS_KEY) : []);
export function rememberOrder({ orderNo, phone, total }) {
  const list = getOrders().filter((o) => o.orderNo !== orderNo);
  list.unshift({ orderNo, phone, total, at: Date.now() });
  write(localStorage, ORDERS_KEY, list.slice(0, 8));
}
