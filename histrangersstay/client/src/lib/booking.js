// Small helpers shared by My Account, Find my booking and the invoice.
export const BADGE = {
  pending: 'bg-amber-100 text-amber-800',
  confirmed: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-red-100 text-red-700',
  completed: 'bg-sky-100 text-sky-800',
};

const startOfToday = () => { const t = new Date(); t.setHours(0, 0, 0, 0); return t; };

// upcoming | past | cancelled
export const bucket = (b) => {
  if (b.status === 'cancelled') return 'cancelled';
  if (b.status === 'completed') return 'past';
  return new Date(b.checkOut) < startOfToday() ? 'past' : 'upcoming';
};

// Food and cancel are allowed while the booking is active and the stay has not ended
export const canEditFood = (b) => ['pending', 'confirmed'].includes(b.status) && new Date(b.checkOut) >= startOfToday();
export const canCancel = (b) => ['pending', 'confirmed'].includes(b.status) && new Date(b.checkIn) >= startOfToday();

export const foodQtyMap = (b) => Object.fromEntries((b.food || []).map((l) => [String(l.item), l.qty]));
