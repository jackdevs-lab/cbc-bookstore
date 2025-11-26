// frontend/src/AdminPanel.jsx
import { useState } from 'react';

const API_URL = 'https://cbc-books-backend.onrender.com';
const ADMIN_PASSWORD = 'Veronica2024!'; // Match .env

export default function AdminPanel() {
  const [form, setForm] = useState({
    title: '', grade_id: '', subject_id: '', category_id: '',
    price: '', image: '', publisher: '', isbn: '', description: '', stock: ''
  });
  const [status, setStatus] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('Uploading...');

    try {
      const res = await fetch(`${API_URL}/api/admin/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'password': ADMIN_PASSWORD
        },
        body: JSON.stringify({
          ...form,
          price: Number(form.price),
          grade_id: Number(form.grade_id),
          subject_id: Number(form.subject_id),
          category_id: Number(form.category_id),
          stock: Number(form.stock)
        })
      });

      const data = await res.json();
      if (res.ok) {
        setStatus(`Success: ${data.product.title}`);
        setForm({ title: '', grade_id: '', subject_id: '', category_id: '', price: '', image: '', publisher: '', isbn: '', description: '', stock: '' });
      } else {
        setStatus(`Error: ${data.error}`);
      }
    } catch (err) {
      setStatus(`Failed: ${err.message}`);
    }
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'Arial', maxWidth: '600px', margin: '0 auto' }}>
      <h1>CBC Admin - Add Product</h1>
      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }}>
        <input placeholder="Title" value={form.title} onChange={e => setForm({...form, title: e.target.value})} required />
        <input placeholder="Grade ID (1-8)" type="number" value={form.grade_id} onChange={e => setForm({...form, grade_id: e.target.value})} required />
        <input placeholder="Subject ID" type="number" value={form.subject_id} onChange={e => setForm({...form, subject_id: e.target.value})} required />
        <input placeholder="Category ID" type="number" value={form.category_id} onChange={e => setForm({...form, category_id: e.target.value})} required />
        <input placeholder="Price (KES)" type="number" value={form.price} onChange={e => setForm({...form, price: e.target.value})} required />
        <input placeholder="Image URL" value={form.image} onChange={e => setForm({...form, image: e.target.value})} />
        <input placeholder="Publisher" value={form.publisher} onChange={e => setForm({...form, publisher: e.target.value})} required />
        <input placeholder="ISBN" value={form.isbn} onChange={e => setForm({...form, isbn: e.target.value})} required />
        <textarea placeholder="Description" value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
        <input placeholder="Stock" type="number" value={form.stock} onChange={e => setForm({...form, stock: e.target.value})} required />
        <button type="submit" style={{ padding: '1rem', background: '#007bff', color: 'white', border: 'none', borderRadius: '8px' }}>
          Add Product
        </button>
      </form>
      <p style={{ marginTop: '1rem', fontWeight: 'bold' }}>{status}</p>
    </div>
  );
}