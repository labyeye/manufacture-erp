import React, { useState, useRef } from 'react';
import { C } from '../constants/colors';
import { SectionTitle, Badge } from '../components/ui/BasicComponents';

const uid = () => Math.random().toString(36).slice(2, 9).toUpperCase();

const inputStyle = {
  width: '100%',
  padding: '9px 12px',
  border: '1px solid #333',
  borderRadius: 6,
  fontSize: 13,
  fontFamily: 'inherit',
  background: '#1a1a1a',
  color: '#e0e0e0',
  outline: 'none',
  boxSizing: 'border-box',
};

const cardStyle = {
  background: '#1e1e1e',
  border: '1px solid #2a2a2a',
  borderRadius: 10,
  padding: 20,
  marginBottom: 16,
};

export default function ClientMaster({ clientMaster = [], setClientMaster, toast }) {
  const [formData, setFormData] = useState({ name: '', contact: '', email: '', gstin: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState(null);
  const fileInputRef = useRef(null);

  const filtered = clientMaster.filter(
    (c) =>
      !searchTerm ||
      c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.contact?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleChange = (field, value) => setFormData((p) => ({ ...p, [field]: value }));

  const handleSubmit = () => {
    if (!formData.name.trim()) { toast('Client name is required', 'error'); return; }
    if (!formData.contact.trim()) { toast('Contact is required', 'error'); return; }

    if (editingId) {
      setClientMaster((prev) => prev.map((c) => c.id === editingId ? { ...c, ...formData } : c));
      toast('Client updated successfully', 'success');
      setEditingId(null);
    } else {
      setClientMaster((prev) => [...prev, { id: uid(), ...formData, status: 'Active', createdAt: new Date().toISOString().split('T')[0] }]);
      toast('Client added successfully', 'success');
    }
    setFormData({ name: '', contact: '', email: '', gstin: '' });
  };

  const handleEdit = (client) => {
    setFormData({ name: client.name, contact: client.contact, email: client.email || '', gstin: client.gstin || '' });
    setEditingId(client.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (id) => {
    if (confirm('Delete this client?')) {
      setClientMaster((prev) => prev.filter((c) => c.id !== id));
      toast('Client deleted', 'success');
    }
  };

  const handleToggleStatus = (client) => {
    setClientMaster((prev) =>
      prev.map((c) => c.id === client.id ? { ...c, status: c.status === 'Active' ? 'Inactive' : 'Active' } : c)
    );
  };

  const handleExportExcel = () => {
    if (clientMaster.length === 0) { toast('No clients to export', 'error'); return; }
    const header = ['Name', 'Phone/WhatsApp', 'Email', 'GST Number', 'Status'];
    const rows = clientMaster.map(c => [c.name, c.contact, c.email || '', c.gstin || '', c.status || 'Active']);
    const csv = [header, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'clients.csv'; a.click();
    toast('Exported successfully', 'success');
  };

  const handleImportExcel = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target.result;
      const lines = text.split('\n').filter(Boolean);
      const imported = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map(v => v.replace(/^"|"$/g, '').trim());
        if (cols[0]) imported.push({ id: uid(), name: cols[0], contact: cols[1] || '', email: cols[2] || '', gstin: cols[3] || '', status: cols[4] || 'Active', createdAt: new Date().toISOString().split('T')[0] });
      }
      setClientMaster((prev) => [...prev, ...imported]);
      toast(`Imported ${imported.length} clients`, 'success');
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleTemplate = () => {
    const csv = '"Name","Phone/WhatsApp","Email","GST Number","Status"\n"Example Client","9876543210","example@email.com","22AAAAA0000A1Z5","Active"';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'client_template.csv'; a.click();
  };

  return (
    <div className="fade">
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#e0e0e0', display: 'flex', alignItems: 'center', gap: 10, margin: 0 }}>
          👥 Client Master
        </h2>
        <p style={{ fontSize: 13, color: '#888', margin: '4px 0 0 0' }}>
          All clients — auto-populated from Sales Orders or added manually
        </p>
      </div>

      {/* Add Client Form */}
      <div style={cardStyle}>
        <div style={{ marginBottom: 14, fontSize: 14, fontWeight: 700, color: '#4CAF50' }}>
          {editingId ? '✏️ Edit Client' : '+ Add Client'}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginBottom: 14 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#888', display: 'block', marginBottom: 5 }}>CLIENT NAME *</label>
            <input style={inputStyle} placeholder="Client name" value={formData.name} onChange={e => handleChange('name', e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#888', display: 'block', marginBottom: 5 }}>PHONE / WHATSAPP</label>
            <input style={inputStyle} placeholder="Phone number" value={formData.contact} onChange={e => handleChange('contact', e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#888', display: 'block', marginBottom: 5 }}>EMAIL</label>
            <input style={inputStyle} placeholder="Email address" value={formData.email} onChange={e => handleChange('email', e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#888', display: 'block', marginBottom: 5 }}>GST NUMBER</label>
            <input style={inputStyle} placeholder="GST / Tax ID" value={formData.gstin} onChange={e => handleChange('gstin', e.target.value)} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button onClick={handleSubmit} style={{ padding: '9px 20px', background: '#4CAF50', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
            {editingId ? '✅ Update Client' : '+ Add Client'}
          </button>
          {editingId && (
            <button onClick={() => { setEditingId(null); setFormData({ name: '', contact: '', email: '', gstin: '' }); }}
              style={{ padding: '9px 20px', background: '#333', color: '#aaa', border: '1px solid #444', borderRadius: 6, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
              Cancel
            </button>
          )}
          <button onClick={handleTemplate} style={{ padding: '9px 16px', background: '#1976D2', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
            ⬇ Template
          </button>
          <button onClick={() => fileInputRef.current?.click()} style={{ padding: '9px 16px', background: '#1976D2', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
            ⬆ Import Excel
          </button>
          <input ref={fileInputRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleImportExcel} />
          <button onClick={handleExportExcel} style={{ padding: '9px 16px', background: '#4CAF50', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
            ⬇ Export Excel
          </button>
        </div>
      </div>

      {/* Clients List */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#e0e0e0' }}>Clients ({clientMaster.length})</span>
          <input
            type="text"
            placeholder="🔍 Search..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ ...inputStyle, width: 220, background: '#141414' }}
          />
        </div>

        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#555', padding: 40, fontSize: 13 }}>
            {searchTerm ? 'No clients found' : 'No clients yet. They auto-populate when you create Sales Orders.'}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #2a2a2a' }}>
                  {['Client Name', 'Phone/WhatsApp', 'Email', 'GST Number', 'Status', 'Actions'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '10px 12px', fontWeight: 600, color: '#888', fontSize: 11, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(client => (
                  <tr key={client.id} style={{ borderBottom: '1px solid #222' }}>
                    <td style={{ padding: '12px', fontWeight: 600, color: '#e0e0e0' }}>{client.name}</td>
                    <td style={{ padding: '12px', color: '#aaa' }}>{client.contact}</td>
                    <td style={{ padding: '12px', color: '#aaa' }}>{client.email || '-'}</td>
                    <td style={{ padding: '12px', color: '#aaa', fontFamily: 'monospace', fontSize: 11 }}>{client.gstin || '-'}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{
                        padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                        background: client.status === 'Active' ? '#4CAF5022' : '#f4433622',
                        color: client.status === 'Active' ? '#4CAF50' : '#f44336',
                      }}>{client.status || 'Active'}</span>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => handleEdit(client)}
                          style={{ padding: '5px 10px', background: '#1976D222', color: '#1976D2', border: 'none', borderRadius: 4, fontWeight: 700, fontSize: 11, cursor: 'pointer' }}>
                          ✏️ Edit
                        </button>
                        <button onClick={() => handleToggleStatus(client)}
                          style={{ padding: '5px 10px', background: '#FF980022', color: '#FF9800', border: 'none', borderRadius: 4, fontWeight: 700, fontSize: 11, cursor: 'pointer' }}>
                          {client.status === 'Active' ? '⏸' : '▶'}
                        </button>
                        <button onClick={() => handleDelete(client.id)}
                          style={{ padding: '5px 10px', background: '#f4433622', color: '#f44336', border: 'none', borderRadius: 4, fontWeight: 700, fontSize: 11, cursor: 'pointer' }}>
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}