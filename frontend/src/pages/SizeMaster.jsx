import React, { useState } from 'react';
import { C } from '../constants/colors';
import { Card, SectionTitle, Field, SubmitBtn } from '../components/ui/BasicComponents';

const uid = () => Math.random().toString(36).slice(2, 9).toUpperCase();

const SIZE_CATEGORIES = [
  'Paper Cup',
  'Bowl',
  'Tray',
  'Plate',
  'Container',
  'Cake Box',
  'Food Box',
  'Printed Box',
  'Insert',
  'Flat Item',
  'Label',
  'Paper Bag with Handle',
  'Paper Bag',
  'Gusseted Bag',
  'Wrapping Paper',
  'Tissue Paper',
  'Kraft Paper Wrap',
  'Paper Reel',
  'Paper Sheets',
];

export default function SizeMaster({
  sizeMaster = {},
  setSizeMaster,
  categoryMaster = {},
  setCategoryMaster,
  toast,
}) {
  const [tab, setTab] = useState('list');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [newSize, setNewSize] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingValue, setEditingValue] = useState('');

  const currentSizes = selectedCategory ? (sizeMaster[selectedCategory] || []) : [];

  const handleAddSize = () => {
    if (!selectedCategory) {
      toast('Please select a category', 'error');
      return;
    }
    if (!newSize.trim()) {
      toast('Please enter a size', 'error');
      return;
    }

    setSizeMaster((prev) => ({
      ...prev,
      [selectedCategory]: [
        ...(prev[selectedCategory] || []),
        newSize.trim(),
      ],
    }));

    toast(`Size "${newSize}" added to ${selectedCategory}`, 'success');
    setNewSize('');
  };

  const handleDeleteSize = (size) => {
    setSizeMaster((prev) => ({
      ...prev,
      [selectedCategory]: (prev[selectedCategory] || []).filter(
        (s) => s !== size
      ),
    }));
    toast('Size deleted', 'success');
  };

  const handleEditSize = (oldSize, newValue) => {
    if (!newValue.trim()) {
      toast('Size cannot be empty', 'error');
      return;
    }

    setSizeMaster((prev) => ({
      ...prev,
      [selectedCategory]: (prev[selectedCategory] || []).map((s) =>
        s === oldSize ? newValue.trim() : s
      ),
    }));

    toast('Size updated', 'success');
    setEditingId(null);
    setEditingValue('');
  };

  return (
    <div className="fade">
      <SectionTitle
        icon="📏"
        title="Size Master"
        sub="Manage product sizes and dimensions for each category"
      />

      <div
        style={{
          display: 'flex',
          gap: 8,
          marginBottom: 20,
          borderBottom: `1px solid ${C.border}`,
        }}
      >
        <button
          onClick={() => setTab('list')}
          style={{
            padding: '9px 20px',
            borderRadius: '6px 6px 0 0',
            fontWeight: 700,
            fontSize: 13,
            border: `1px solid ${tab === 'list' ? C.blue : C.border}`,
            background: tab === 'list' ? C.card : 'transparent',
            color: tab === 'list' ? C.blue : C.muted,
            marginBottom: -1,
            cursor: 'pointer',
          }}
        >
          📋 View Sizes
        </button>
        <button
          onClick={() => setTab('new')}
          style={{
            padding: '9px 20px',
            borderRadius: '6px 6px 0 0',
            fontWeight: 700,
            fontSize: 13,
            border: `1px solid ${tab === 'new' ? C.blue : C.border}`,
            background: tab === 'new' ? C.card : 'transparent',
            color: tab === 'new' ? C.blue : C.muted,
            marginBottom: -1,
            cursor: 'pointer',
          }}
        >
          ➕ Add Size
        </button>
      </div>

      {tab === 'list' && (
        <Card>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: C.muted }}>
              Select Category:
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              style={{
                width: '100%',
                marginTop: 8,
                padding: '9px 12px',
                border: `1px solid ${C.border}`,
                borderRadius: 6,
                fontSize: 13,
                fontFamily: 'inherit',
              }}
            >
              <option value="">-- Select Category --</option>
              {SIZE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {selectedCategory ? (
            currentSizes.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  color: C.muted,
                  padding: 32,
                  fontSize: 13,
                }}
              >
                No sizes configured for {selectedCategory}
              </div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                  gap: 12,
                }}
              >
                {currentSizes.map((size, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '12px 16px',
                      background: C.surface,
                      border: `1px solid ${C.border}`,
                      borderRadius: 6,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <span style={{ fontWeight: 600, fontSize: 13 }}>
                      {size}
                    </span>
                    <button
                      onClick={() => handleDeleteSize(size)}
                      style={{
                        background: C.red + '22',
                        color: C.red,
                        border: 'none',
                        borderRadius: 4,
                        padding: '4px 8px',
                        fontWeight: 700,
                        fontSize: 11,
                        cursor: 'pointer',
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )
          ) : (
            <div
              style={{
                textAlign: 'center',
                color: C.muted,
                padding: 32,
                fontSize: 13,
              }}
            >
              Select a category to view its sizes
            </div>
          )}
        </Card>
      )}

      {tab === 'new' && (
        <Card>
          <h3
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: C.blue,
              marginBottom: 16,
            }}
          >
            Add New Size
          </h3>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: 14,
              marginBottom: 20,
            }}
          >
            <Field label="Category *">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  border: `1px solid ${C.border}`,
                  borderRadius: 6,
                  fontSize: 13,
                  fontFamily: 'inherit',
                }}
              >
                <option value="">-- Select Category --</option>
                {SIZE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Size Description *">
              <input
                type="text"
                placeholder="e.g. Small, Medium, Large, 10inch, etc."
                value={newSize}
                onChange={(e) => setNewSize(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  border: `1px solid ${C.border}`,
                  borderRadius: 6,
                  fontSize: 13,
                  fontFamily: 'inherit',
                }}
              />
            </Field>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <SubmitBtn
              label="Add Size"
              color={C.blue}
              onClick={handleAddSize}
            />
            <button
              onClick={() => {
                setSelectedCategory('');
                setNewSize('');
              }}
              style={{
                padding: '9px 20px',
                borderRadius: 6,
                border: `1px solid ${C.border}`,
                background: C.inputBg,
                color: C.text,
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              Clear
            </button>
          </div>

          {selectedCategory && (
            <div
              style={{
                marginTop: 20,
                padding: '12px 16px',
                background: C.blue + '11',
                border: `1px solid ${C.blue}44`,
                borderRadius: 6,
                fontSize: 12,
              }}
            >
              <strong>Current Sizes in {selectedCategory}:</strong>{' '}
              {currentSizes.length === 0
                ? 'None'
                : currentSizes.join(', ')}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
