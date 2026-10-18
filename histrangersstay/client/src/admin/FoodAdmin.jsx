import CrudPage from './CrudPage';
import { inr } from '../api';

const fields = [
  { name: 'name', label: 'Dish name', type: 'text', required: true },
  { name: 'category', label: 'Category', type: 'text', required: true, hint: 'For example Breakfast, Main course, Snacks, Beverages. Items with the same category are grouped on the website.' },
  { name: 'description', label: 'Description', type: 'textarea' },
  { name: 'price', label: 'Price (INR)', type: 'number', required: true },
  { name: 'veg', label: 'Vegetarian', type: 'checkbox' },
  { name: 'image', label: 'Photo (optional)', type: 'image', hint: 'Upload a photo of the dish.' },
  { name: 'order', label: 'Sort order', type: 'number', hint: 'Smaller numbers show first inside a category.' },
  { name: 'available', label: 'Available to order', type: 'checkbox' },
];

const columns = [
  { label: 'Dish', render: (f) => <><b>{f.name}</b><br /><small className="muted">{f.category}</small></> },
  { label: 'Type', render: (f) => (f.veg ? 'Veg' : 'Non-veg') },
  { label: 'Price', render: (f) => inr(f.price) },
  { label: 'Status', render: (f) => <span className={`badge badge--${f.available ? 'confirmed' : 'cancelled'}`}>{f.available ? 'Available' : 'Hidden'}</span> },
];

export default function FoodAdmin() {
  return <CrudPage title="Food menu" singular="Dish" endpoint="/food" fields={fields} columns={columns} defaults={{ category: 'Main course', veg: true, order: 0, available: true }}
    note="Guests can add these dishes while booking a room, or later from My account. Prices are charged at the property with the room." />;
}
