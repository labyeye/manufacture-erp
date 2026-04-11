import React, { useState, useMemo } from 'react';
import { C } from '../constants/colors';
import { Card, SectionTitle, Badge, Field, SubmitBtn, DatePicker } from '../components/ui/BasicComponents';

const uid = () => Math.random().toString(36).slice(2, 9).toUpperCase();
const today = () => new Date().toISOString().slice(0, 10);
const fmt = (n) => (n ?? 0).toLocaleString('en-IN');

const SHIFTS = ['Morning', 'Afternoon', 'Night'];

export default function ProductionUpdate({
  jobOrders = [], setJobOrders, productionUpdates = [], setProductionUpdates,
  wipStock = [], setWipStock, fgStock = [], setFgStock,
  pudCounter = 0, setPudCounter, toast
}) {
  const blankEntry = {
    joNo: '', currentStage: '', orderQty: '', noOfSheets: '', productionStage: '',
    operator: '', date: today(), qtyCompleted: '', qtyRejected: '0', shift: '', remarks: ''
  };

  const [entry, setEntry] = useState(blankEntry);
  const [errors, setErrors] = useState({});
  const [view, setView] = useState('entry');

  const activeJOs = useMemo(() => 
    (jobOrders || []).filter(jo => jo.status !== 'Completed'),
    [jobOrders]
  );

  const setField = (k, v) => {
    setEntry(f => {
      const updated = { ...f, [k]: v };
      if (k === 'joNo' && v) {
        const jo = jobOrders.find(j => j.joNo === v);
        if (jo) {
          updated.currentStage = jo.processes && jo.processes[0] ? jo.processes[0].process : '';
          updated.orderQty = '';
          updated.noOfSheets = '';
        }
      }
      return updated;
    });
    setErrors(e => ({ ...e, [k]: false }));
  };

  const E = (k) => errors[k] ? { border: `1px solid ${C.red}` } : {};
  const EMsg = (k) => errors[k] ? <div style={{ color: C.red, fontSize: 10, marginTop: 3 }}>Required</div> : null;

  const submit = () => {
    const err = {};
    if (!entry.joNo) err.joNo = true;
    if (!entry.productionStage) err.productionStage = true;
    if (!entry.operator) err.operator = true;
    if (!entry.date) err.date = true;
    if (!entry.qtyCompleted) err.qtyCompleted = true;
    setErrors(err);

    if (Object.keys(err).length > 0) {
      toast('Please fill all required fields', 'error');
      return;
    }

    const pudNo = `PUD-${String(pudCounter + 1).padStart(5, '0')}`;
    const record = { ...entry, id: uid(), pudNo, createdAt: today() };
    setProductionUpdates(p => [...p, record]);
    setPudCounter(c => c + 1);

    
    setWipStock(prev => {
      const key = `${entry.joNo}-${entry.productionStage}`;
      const idx = prev.findIndex(s => s.key === key);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx].qty = (updated[idx].qty || 0) + +(entry.qtyCompleted || 0);
        return updated;
      }
      return [...prev, { id: uid(), key, joNo: entry.joNo, stage: entry.productionStage, qty: +(entry.qtyCompleted || 0) }];
    });

    toast(`Production update ${pudNo} recorded`, 'success');
    setEntry(blankEntry);
    setErrors({});
  };

  const recordCount = productionUpdates.length;
  const wipCount = wipStock.length;
  const joCount = jobOrders.length;

  return (
    <div className="fade">
      <SectionTitle icon="⚙️" title="Production" sub="Record stage-wise production updates and WIP tracking" />

      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {[['entry', `📝 Entry`], ['records', `📋 Records (${recordCount})`], ['wip', `📊 WIP Stock (${wipCount})`], ['status', `📈 JO Status (${joCount})`]].map(([v, l]) => (
          <button key={v} onClick={() => setView(v)} style={{
            padding: '8px 20px', borderRadius: 6, border: `1px solid ${view === v ? C.blue : C.border}`,
            background: view === v ? C.blue + '22' : 'transparent', color: view === v ? C.blue : C.muted,
            fontWeight: 700, fontSize: 13
          }}>{l}</button>
        ))}
      </div>

      {view === 'entry' && (
        <div>
          <Card style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: C.blue, marginBottom: 16 }}>Production Update Entry</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
              <Field label="Job Order *">
                <select value={entry.joNo} onChange={e => setField('joNo', e.target.value)} style={E('joNo')}>
                  <option value="">-- Select JO --</option>
                  {activeJOs.map(jo => <option key={jo.joNo} value={jo.joNo}>{jo.joNo} — {jo.clientName}</option>)}
                </select>
                {EMsg('joNo')}
              </Field>
              <Field label="Current Stage">
                <div style={{ padding: '9px 12px', background: C.inputBg, border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 13, color: C.muted }}>
                  {entry.currentStage || '— Auto-filled from JO —'}
                </div>
              </Field>
              <Field label="Production Stage *">
                <select value={entry.productionStage} onChange={e => setField('productionStage', e.target.value)} style={E('productionStage')}>
                  <option value="">-- Select Stage --</option>
                  {['Printing', 'Die Cutting', 'Pasting', 'Stitching', 'Lamination', 'Coating', 'Slitting', 'Folding', 'Assembly', 'Packing', 'QC'].map(s => <option key={s}>{s}</option>)}
                </select>
                {EMsg('productionStage')}
              </Field>
              <Field label="Operator *">
                <input placeholder="Worker name" value={entry.operator} onChange={e => setField('operator', e.target.value)} style={E('operator')} />
                {EMsg('operator')}
              </Field>
              <Field label="Date *">
                <DatePicker value={entry.date} onChange={v => setField('date', v)} style={E('date')} />
                {EMsg('date')}
              </Field>
              <Field label="Shift">
                <select value={entry.shift} onChange={e => setField('shift', e.target.value)}>
                  <option value="">-- Select Shift --</option>
                  {SHIFTS.map(s => <option key={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="Qty Rejected">
                <input type="number" placeholder="Defective units" value={entry.qtyRejected} onChange={e => setField('qtyRejected', e.target.value)} />
              </Field>
              <Field label="Remarks" span={2}>
                <input placeholder="Production notes..." value={entry.remarks} onChange={e => setField('remarks', e.target.value)} />
              </Field>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <SubmitBtn label="Record Update" color={C.blue} onClick={submit} />
            </div>
          </Card>
        </div>
      )}

      {view === 'records' && (
        <Card>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: C.muted, marginBottom: 14 }}>Production Records ({recordCount})</h3>
          {recordCount === 0 && <div style={{ textAlign: 'center', color: C.muted, padding: 32, fontSize: 13 }}>No production updates yet.</div>}
          {(productionUpdates || []).slice().reverse().map(r => (
            <div key={r.id} style={{ borderBottom: `1px solid ${C.border}22`, padding: '12px 4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", color: C.blue, fontWeight: 700 }}>{r.pudNo}</span>
                  <span style={{ fontSize: 12, color: C.muted }}>{r.date}</span>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{r.joNo}</span>
                  <Badge text={r.productionStage} color={C.accent} />
                  <span style={{ fontSize: 12, color: C.green, fontWeight: 700 }}>✓ {r.qtyCompleted}</span>
                  {r.qtyRejected && r.qtyRejected !== '0' && <span style={{ fontSize: 12, color: C.red }}>✕ {r.qtyRejected}</span>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6, fontSize: 11, color: C.muted }}>
                {r.operator && <span>👤 {r.operator}</span>}
                {r.shift && <span>🕐 {r.shift}</span>}
                {r.remarks && <span>📝 {r.remarks}</span>}
              </div>
            </div>
          ))}
        </Card>
      )}

      {view === 'wip' && (
        <Card>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: C.muted, marginBottom: 14 }}>Work-in-Progress Stock ({wipCount})</h3>
          {wipCount === 0 && <div style={{ textAlign: 'center', color: C.muted, padding: 32, fontSize: 13 }}>No WIP stock yet.</div>}
          {(wipStock || []).map(s => (
            <div key={s.id} style={{ borderBottom: `1px solid ${C.border}22`, padding: '12px 4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 600 }}>{s.joNo}</span>
                  <Badge text={s.stage} color={C.yellow} />
                  <span style={{ fontSize: 12, color: C.green, fontWeight: 700 }}>Qty: {s.qty}</span>
                </div>
              </div>
            </div>
          ))}
        </Card>
      )}

      {view === 'status' && (
        <Card>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: C.muted, marginBottom: 14 }}>Job Order Status ({joCount})</h3>
          {joCount === 0 && <div style={{ textAlign: 'center', color: C.muted, padding: 32, fontSize: 13 }}>No job orders yet.</div>}
          {(jobOrders || []).map(jo => {
            const updates = (productionUpdates || []).filter(u => u.joNo === jo.joNo);
            const totalCompleted = updates.reduce((sum, u) => sum + (+(u.qtyCompleted || 0)), 0);
            return (
              <div key={jo.id} style={{ borderBottom: `1px solid ${C.border}22`, padding: '12px 4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", color: C.blue, fontWeight: 700 }}>{jo.joNo}</span>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{jo.clientName}</span>
                    <Badge text={jo.status} color={jo.status === 'Completed' ? C.green : C.yellow} />
                    <span style={{ fontSize: 12, color: C.muted }}>Updates: {updates.length}</span>
                    {totalCompleted > 0 && <span style={{ fontSize: 12, fontWeight: 700, color: C.green }}>Qty Done: {totalCompleted}</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
}
