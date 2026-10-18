import CrudPage from './CrudPage';
import { inr } from '../api';

const fields = [
  { name: 'name', label: 'Room name', type: 'text', required: true },
  { name: 'type', label: 'Room type', type: 'text', hint: 'For example Luxury, Suite, Presidential' },
  { name: 'description', label: 'Description', type: 'textarea' },
  { name: 'pricePerNight', label: 'Price per night (INR)', type: 'number', required: true },
  { name: 'maxGuests', label: 'Maximum guests', type: 'number', min: 1 },
  { name: 'totalRooms', label: 'Rooms of this type available', type: 'number', min: 1, hint: 'Used to block bookings when the dates are sold out.' },
  { name: 'size', label: 'Size (sq ft)', type: 'number' },
  { name: 'bedType', label: 'Bed type', type: 'text' },
  { name: 'images', label: 'Photos', type: 'images', hint: 'Upload room photos. The first one is the cover.' },
  { name: 'amenities', label: 'Room amenities', type: 'list', hint: 'Separate with commas' },
  { name: 'active', label: 'Available for booking', type: 'checkbox' },
];

const columns = [
  { label: 'Room', render: (r) => <><b>{r.name}</b><br /><small className="muted">{r.type}</small></> },
  { label: 'Price', render: (r) => inr(r.pricePerNight) },
  { label: 'Guests', render: (r) => r.maxGuests },
  { label: 'Inventory', render: (r) => r.totalRooms },
  { label: 'Status', render: (r) => <span className={`badge badge--${r.active ? 'confirmed' : 'cancelled'}`}>{r.active ? 'Open' : 'Closed'}</span> },
];

// Rooms of the single property. Every room belongs to that hotel automatically.
export default function RoomsSection({ hotelId }) {
  return <CrudPage title="Rooms" singular="Room" endpoint="/rooms" fields={fields} columns={columns} fixed={{ hotel: hotelId }} defaults={{ maxGuests: 2, totalRooms: 10, size: 350, bedType: 'King', active: true }} />;
}
