import React, { useState } from 'react';
import { C } from '../constants/colors';
import { Card, SectionTitle, Badge, Field, SubmitBtn } from '../components/ui/BasicComponents';

const uid = () => Math.random().toString(36).slice(2, 9).toUpperCase();

export default function PrintingDetailMaster({
  printingMaster = [], setPrintingMaster, itemMasterFG = {}, toast
}) {
  const blankEntry = {
    itemName: '', clientName: '', paperType: '', paperGsm: '',
    printing: '', plate: '', processes: [], remarks: ''
  };

  const [entry, setEntry] = useState(blankEntry);
  const [errors, setErrors] = useState({});
  const [view, setView] = useState('form');

  const setField = (k, v) => {
    setEntry(f => ({ ...f, [k]: v }));
    setErrors(e => ({ ...e, [k]: false }));
  };

  const toggleProcess = (proc) => {
    setEntry(f => ({
      ...f,
      processes: f.processes.includes(proc)
        ? f.processes.filter(p => p !== proc)
        : [...f.processes, proc]
    }));
  };

  const E = (k) => errors[k] ? { border: `1px solid ${C.red}` } : {};
  const EMsg = (k) => errors[k] ? <div style={{ color: C.red, fontSize: 10, marginTop: 3 }}>Required</div> : null;

  const submit = () => {
    const err = {};
    if (!entry.itemName) err.itemName = true;
    if (!entry.clientName) err.clientName = true;
    if (!entry.paperType) err.paperType = true;
    setErrors(err);

    if (Object.keys(err).length > 0) {
      toast('Please fill all required fields', 'error');
      return;
    }

    const newEntry = { ...entry, id: uid() };
    setPrintingMaster(p => [...p, newEntry]);

    toast('Printing detail saved', 'success');
    setEntry(blankEntry);
    setErrors({});
  };

  return (
    <div className="fade">
      <SectionTitle icon="🖨️" title="Printing Detail Master" sub="Store printing templates and standard processes" />

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {[['form', '📝 New'], ['records', `📋 Templates (${printingMaster.length})`]].map(([v, l]) => (
          <button key={v} onClick={() => setView(v)} style={{
            padding: '8px 20px', borderRadius: 6, border: `1px solid ${view === v ? C.blue : C.border}`,
            background: view === v ? C.blue + '22' : 'transparent', color: view === v ? C.blue : C.muted,
            fontWeight: 700, fontSize: 13
          }}>{l}</button>
        ))}
      </div>

      {view === 'form' && (
        <Card>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
            <Field label="Item Name *">
              <input placeholder="e.g. Cake Box 8x8x5" value={entry.itemName} onChange={e => setField('itemName', e.target.value)} style={E('itemName')} />
              {EMsg('itemName')}
            </Field>
            <Field label="Client Name *">
              <input placeholder="Client name" value={entry.clientName} onChange={e => setField('clientName', e.target.value)} style={E('clientName')} />
              {EMsg('clientName')}
            </Field>
            <Field label="Paper Type *">
              <select value={entry.paperType} onChange={e => setField('paperType', e.target.value)} style={E('paperType')}>
                <option value="">-- Select --</option>
                {['MG Kraft', 'MF Kraft', 'Bleached Kraft', 'OGR', 'White PE', 'Kraft PE'].map(t => <option key={t}>{t}</option>)}
              </select>
              {EMsg('paperType')}
            </Field>
            <Field label="Paper GSM">
              <input type="number" placeholder="e.g. 130" value={entry.paperGsm} onChange={e => setField('paperGsm', e.target.value)} />
            </Field>
            <Field label="Printing">
              <select value={entry.printing} onChange={e => setField('printing', e.target.value)}>
                <option value="">-- Select --</option>
                {['Plain', '1 Color', '2 Color', '3 Color', '4 Color', '5 Color', '6 Color'].map(p => <option key={p}>{p}</option>)}
              </select>
            </Field>
            <Field label="Plate">
              <select value={entry.plate} onChange={e => setField('plate', e.target.value)}>
                <option value="">-- Select --</option>
                {['Plain', 'Old', 'New'].map(p => <option key={p}>{p}</option>)}
              </select>
            </Field>
            <Field label="Processes" span={2}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {['Printing', 'Die Cutting', 'Pasting', 'Stitching', 'Lamination', 'Coating', 'Folding', 'Assembly'].map(proc => (
                  <label key={proc} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12 }}>
                    <input type="checkbox" checked={entry.processes.includes(proc)} onChange={() => toggleProcess(proc)} />
                    {proc}
                  </label>
                ))}
              </div>
            </Field>
            <Field label="Remarks" span={2}>
              <input placeholder="Notes..." value={entry.remarks} onChange={e => setField('remarks', e.target.value)} />
            </Field>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <SubmitBtn label="Save Template" color={C.blue} onClick={submit} />
          </div>
        </Card>
      )}

      {view === 'records' && (
        <Card>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: C.muted, marginBottom: 14 }}>Printing Templates</h3>
          {printingMaster.length === 0 && <div style={{ textAlign: 'center', color: C.muted, padding: 32 }}>No templates yet.</div>}
          {(printingMaster || []).map(t => (
            <div key={t.id} style={{ borderBottom: `1px solid ${C.border}22`, padding: '12px 4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{t.itemName}</span>
                  <span style={{ fontSize: 12, color: C.muted }}>👤 {t.clientName}</span>
                  <Badge text={t.paperType} color={C.accent} />
                  {t.printing && <Badge text={t.printing} color={C.yellow} />}
                </div>
              </div>
              {t.processes.length > 0 && (
                <div style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>
                  Processes: {t.processes.join(', ')}
                </div>
              )}
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
