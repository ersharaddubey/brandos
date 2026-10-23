import CrudPage from './CrudPage';

const fields = [
  { name: 'name', label: 'Name', type: 'text', required: true },
  { name: 'role', label: 'Role', type: 'text' },
  { name: 'bio', label: 'Short bio', type: 'textarea' },
  { name: 'photo', label: 'Photo', type: 'image' },
  { name: 'phone', label: 'Phone', type: 'text' },
  { name: 'email', label: 'Email', type: 'text' },
  { name: 'instagram', label: 'Instagram', type: 'text' },
  { name: 'order', label: 'Sort order', type: 'number' },
  { name: 'active', label: 'Show on website', type: 'checkbox' },
];
const columns = [
  { label: 'Name', render: (m) => <b>{m.name}</b> },
  { label: 'Role', render: (m) => m.role },
  { label: 'Shown', render: (m) => (m.active ? 'Yes' : 'Hidden') },
];

export default function TeamAdmin() {
  return <CrudPage title="Leadership" singular="Team member" endpoint="/team" fields={fields} columns={columns} defaults={{ order: 0, active: true }}
    note="These cards appear on the Leadership page (/leadership)." />;
}
