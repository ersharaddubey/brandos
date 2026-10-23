import CrudPage from './CrudPage';

const fields = [
  { name: 'name', label: 'Location name', type: 'text', required: true },
  { name: 'status', label: 'Status', type: 'select', options: ['live', 'upcoming'], hint: 'Live shows an "Open now" badge and a booking button. Upcoming shows "Upcoming".' },
  { name: 'city', label: 'City / area', type: 'text' },
  { name: 'state', label: 'State', type: 'text' },
  { name: 'tagline', label: 'Tagline', type: 'text' },
  { name: 'description', label: 'Description', type: 'textarea' },
  { name: 'image', label: 'Photo', type: 'image' },
  { name: 'address', label: 'Address', type: 'textarea' },
  { name: 'phone', label: 'Phone', type: 'text' },
  { name: 'link', label: 'Button link', type: 'text', hint: 'Live locations only. Use /stay for the booking page or a full https:// link.' },
  { name: 'order', label: 'Sort order', type: 'number' },
  { name: 'active', label: 'Show on website', type: 'checkbox' },
];
const columns = [
  { label: 'Location', render: (l) => <><b>{l.name}</b><br /><small className="muted">{[l.city, l.state].filter(Boolean).join(', ')}</small></> },
  { label: 'Status', render: (l) => <span className={`badge badge--${l.status === 'live' ? 'confirmed' : 'pending'}`}>{l.status}</span> },
  { label: 'Shown', render: (l) => (l.active ? 'Yes' : 'Hidden') },
];

export default function LocationsAdmin() {
  return <CrudPage title="Locations" singular="Location" endpoint="/locations" fields={fields} columns={columns} defaults={{ status: 'upcoming', order: 0, active: true }}
    note="Add Kasol, Bir and any new place here. Change a location to Live when it opens." />;
}
