import CrudPage from './CrudPage';
import { fmtDate } from '../api';

const fields = [
  { name: 'title', label: 'Offer title', type: 'text', required: true },
  { name: 'tag', label: 'Short tag', type: 'text', hint: 'For example Breakfast included' },
  { name: 'description', label: 'Description', type: 'textarea' },
  { name: 'image', label: 'Offer photo', type: 'image', hint: 'Upload a photo for this offer.' },
  { name: 'code', label: 'Offer code', type: 'text' },
  { name: 'discountPercent', label: 'Discount (%)', type: 'number', hint: 'Taken off the room charges when the guest applies the code. 0 = no money off (a perk only).' },
  { name: 'minNights', label: 'Minimum nights (optional)', type: 'number', hint: '0 = works for any stay length.' },
  { name: 'weekdaysOnly', label: 'Only for check-in Monday to Thursday', type: 'checkbox' },
  { name: 'maxDiscount', label: 'Maximum discount (INR, optional)', type: 'number', hint: '0 = no limit.' },
  { name: 'validTill', label: 'Valid till', type: 'date', hint: 'Leave empty for no end date. The offer stays visible through this date, then hides itself.' },
  { name: 'active', label: 'Show on website', type: 'checkbox' },
];

const expired = (o) => o.validTill && new Date(o.validTill).getTime() < Date.now() - 86400000;

const columns = [
  { label: 'Offer', render: (o) => <><b>{o.title}</b><br /><small className="muted">{o.tag}</small></> },
  { label: 'Code', render: (o) => o.code || '—' },
  { label: 'Discount', render: (o) => (o.discountPercent ? <>{o.discountPercent}%{(o.minNights > 0 || o.weekdaysOnly) && <><br /><small className="muted">{[o.minNights > 0 && `${o.minNights}+ nights`, o.weekdaysOnly && 'Mon to Thu'].filter(Boolean).join(', ')}</small></>}</> : '—') },
  { label: 'Valid till', render: (o) => (o.validTill ? fmtDate(o.validTill) : 'No end date') },
  { label: 'Status', render: (o) => <span className={`badge badge--${o.active && !expired(o) ? 'confirmed' : 'cancelled'}`}>{!o.active ? 'Hidden' : expired(o) ? 'Expired' : 'Live'}</span> },
];

export default function OffersAdmin() {
  return <CrudPage title="Offers" singular="Offer" endpoint="/offers" fields={fields} columns={columns} defaults={{ discountPercent: 0, minNights: 0, weekdaysOnly: false, maxDiscount: 0, active: true }} />;
}
