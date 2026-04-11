import React, { useState, useEffect, useRef } from 'react';
import { C } from '../constants/colors';
import { SectionTitle, Badge } from '../components/ui/BasicComponents';
import { clientMasterAPI } from '../api/auth';

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

export default function ClientMaster({ toast }) {
  const [clientMaster, setClientMaster] = useState([]);
  const [formData, setFormData] = useState({ name: '', contact: '', email: '', gstin: '', category: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  
  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const res = await clientMasterAPI.getAll();
      setClientMaster(res.clients || []);
    } catch (error) {
      toast?.('Failed to load clients', 'error');
    }
  };

  const filtered = clientMaster.filter(
    (c) =>
      !searchTerm ||
      c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.contact?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleChange = (field, value) => setFormData((p) => ({ ...p, [field]: value }));

  const handleSubmit = async () => {
    if (!formData.name.trim()) { toast('Client name is required', 'error'); return; }

    setLoading(true);
    try {
      if (editingId) {
        await clientMasterAPI.update(editingId, formData);
        toast('Client updated successfully', 'success');
        setEditingId(null);
      } else {
        await clientMasterAPI.create(formData);
        toast('Client added successfully', 'success');
      }
      setFormData({ name: '', contact: '', email: '', gstin: '', category: '' });
      fetchClients();
    } catch (error) {
      toast(error.response?.data?.error || 'Failed to save client', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (client) => {
    setFormData({
      name: client.name,
      contact: client.contact || '',
      email: client.email || '',
      gstin: client.gstin || '',
      category: client.category || ''
    });
    setEditingId(client._id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this client?')) return;

    try {
      await clientMasterAPI.delete(id);
      toast('Client deleted', 'success');
      fetchClients();
    } catch (error) {
      toast('Failed to delete client', 'error');
    }
  };

  const handleToggleStatus = async (client) => {
    try {
      const newStatus = client.status === 'Active' ? 'Inactive' : 'Active';
      await clientMasterAPI.updateStatus(client._id, newStatus);
      fetchClients();
    } catch (error) {
      toast('Failed to update status', 'error');
    }
  };

  const handleExportExcel = () => {
    if (clientMaster.length === 0) { toast('No clients to export', 'error'); return; }
    const header = ['Name', 'Category', 'Phone/WhatsApp', 'Email', 'GST Number', 'Status'];
    const rows = clientMaster.map(c => [c.name, c.category || '', c.contact || '', c.email || '', c.gstin || '', c.status || 'Active']);
    const csv = [header, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'clients.csv'; a.click();
    toast('Exported successfully', 'success');
  };

  const handleImportExcel = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const text = ev.target.result;
      const lines = text.split('\n').filter(Boolean);
      let successCount = 0;
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map(v => v.replace(/^"|"$/g, '').trim());
        if (cols[0]) {
          try {
            await clientMasterAPI.create({
              name: cols[0],
              category: cols[1] || '',
              contact: cols[2] || '',
              email: cols[3] || '',
              gstin: cols[4] || '',
              status: cols[5] || 'Active'
            });
            successCount++;
          } catch (error) {
            
          }
        }
      }
      fetchClients();
      toast(`Imported ${successCount} clients`, 'success');
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleTemplate = () => {
    const csv = '"Name","Category","Phone/WhatsApp","Email","GST Number","Status"\n"Example Client","HP","9876543210","example@email.com","22AAAAA0000A1Z5","Active"';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'client_template.csv'; a.click();
  };

  return (
    <div className="fade">
      {}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#e0e0e0', display: 'flex', alignItems: 'center', gap: 10, margin: 0 }}>
          👥 Client Master
        </h2>
        <p style={{ fontSize: 13, color: '#888', margin: '4px 0 0 0' }}>
          All clients — auto-populated from Sales Orders or added manually
        </p>
      </div>

      {}
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
            <label style={{ fontSize: 11, fontWeight: 600, color: '#888', display: 'block', marginBottom: 5 }}>CATEGORY</label>
            <input style={inputStyle} placeholder="e.g. HP, ZPL, Others" value={formData.category} onChange={e => handleChange('category', e.target.value)} />
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
          <button onClick={handleSubmit} disabled={loading} style={{ padding: '9px 20px', background: loading ? '#666' : '#4CAF50', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, fontSize: 13, cursor: loading ? 'not-allowed' : 'pointer' }}>
            {loading ? 'Saving...' : editingId ? '✅ Update Client' : '+ Add Client'}
          </button>
          {editingId && (
            <button onClick={() => { setEditingId(null); setFormData({ name: '', contact: '', email: '', gstin: '', category: '' }); }}
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

      {}
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
                  {['Client Name', 'Category', 'Phone/WhatsApp', 'Email', 'GST Number', 'Status', 'Actions'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '10px 12px', fontWeight: 600, color: '#888', fontSize: 11, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(client => (
                  <tr key={client._id} style={{ borderBottom: '1px solid #222' }}>
                    <td style={{ padding: '12px', fontWeight: 600, color: '#e0e0e0' }}>{client.name}</td>
                    <td style={{ padding: '12px', color: '#aaa' }}>{client.category || '-'}</td>
                    <td style={{ padding: '12px', color: '#aaa' }}>{client.contact || '-'}</td>
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
                        <button onClick={() => handleDelete(client._id)}
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