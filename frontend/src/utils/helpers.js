
import React from "react";
import * as XLSX from "xlsx";

export const uid = () => Math.random().toString(36).slice(2, 9).toUpperCase();
export const today = () => new Date().toISOString().slice(0, 10);
export const fmt = (n) => (n ?? 0).toLocaleString("en-IN");

export const xlsxDownload = (wb, filename) => {
  const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([wbout], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".xlsx") ? filename : filename + ".xlsx";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};


export function usePersistedState(key, defaultVal) {
  const [state, setState] = React.useState(() => {
    const raw = localStorage.getItem(key);
    if (!raw || raw === "undefined") {
      return defaultVal;
    }
    try {
      return JSON.parse(raw);
    } catch (e) {
      console.warn(`Failed to parse localStorage key "${key}":`, e);
      return defaultVal;
    }
  });
  const setPersistedState = React.useCallback((val) => {
    setState(val);
    localStorage.setItem(key, JSON.stringify(val));
  }, []);
  return [state, setPersistedState];
}


export const getAuth = () => {
  const raw = localStorage.getItem("erp_auth");
  if (!raw || raw === "undefined" || raw === "null") return null;
  try {
    return JSON.parse(raw);
  } catch (e) {
    console.warn("Failed to parse auth:", e);
    return null;
  }
};
export const setAuth = (v) => {
  if (v === null || v === undefined) {
    localStorage.removeItem("erp_auth");
  } else {
    localStorage.setItem("erp_auth", JSON.stringify(v));
  }
};

export const getUsers = () => {
  const raw = localStorage.getItem("erp_users");
  if (!raw || raw === "undefined" || raw === "null") return [];
  try {
    return JSON.parse(raw);
  } catch (e) {
    console.warn("Failed to parse users:", e);
    return [];
  }
};
export const setUsers = (v) => localStorage.setItem("erp_users", JSON.stringify(v));

export const getRoles = () => {
  const raw = localStorage.getItem("erp_roles");
  if (!raw || raw === "undefined" || raw === "null") return {};
  try {
    return JSON.parse(raw);
  } catch (e) {
    console.warn("Failed to parse roles:", e);
    return {};
  }
};
export const setRoles = (v) => localStorage.setItem("erp_roles", JSON.stringify(v));


export function generateProductCode(type, counters) {
  const prefixMap = { "Raw Material": "RM", "Finished Goods": "FG", "Consumable": "CG", "Machine Spare": "SP" };
  const prefix = prefixMap[type] || "IT";
  const num = (counters[prefix] || 1);
  return prefix + String(num).padStart(4, "0");
}


export function computeRMItemName(it) {
  if (it.rmItem === "Paper Reel") {
    return [it.paperType, "Paper Reel", it.gsm ? it.gsm + "gsm" : "", it.widthMm ? it.widthMm + "mm" : ""].filter(Boolean).join(" ");
  }
  if (it.rmItem === "Paper Sheets") {
    return [it.paperType, "Sheet", it.gsm ? it.gsm + "gsm" : "", (it.widthMm && it.lengthMm) ? it.widthMm + "x" + it.lengthMm + "mm" : it.widthMm ? it.widthMm + "mm" : ""].filter(Boolean).join(" ");
  }
  return it.itemName || "";
}


export const computeConsumableItemName = (it) => {
  const dims = [];
  if (it.width) dims.push(it.width + "mm");
  if (it.height) dims.push(it.height + "mm");
  if (it.length) dims.push(it.length + "mm");
  const dimStr = dims.length ? " " + dims.join("x") : "";
  return (it.category && it.category.match(/Box|Bag|Polybag/i) ? it.category + dimStr : it.category) + (it.uom ? " (" + it.uom + ")" : "");
};


export function addWorkingDays(dateStr, days) {
  const d = new Date(dateStr + "T00:00:00");
  let added = 0, remaining = days;
  while (added < remaining) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0) added++; 
  }
  return d.toISOString().slice(0, 10);
}

export function dateRangesOverlap(s1, e1, s2, e2) {
  return new Date(s1) <= new Date(e2) && new Date(e1) >= new Date(s2);
}

export function daysSince(dateStr) {
  if (!dateStr) return 0;
  const diff = new Date(today() + "T00:00:00") - new Date(dateStr + "T00:00:00");
  return Math.floor(diff / 86400000);
}


export function buildSchedule(form, machineMaster, existingJobOrders = []) {
  const schedule = [];
  const FORMATION_MACHINES = ["Formation", "Bag Making", "Sheeting", "Sheet Cutting", "Cutting"];
  const MANUAL_FORMATION_MACHINES = ["Handmade"];

  const procs = form.processFlow || [];
  let curDate = form.startDate;

  procs.forEach((proc, idx) => {
    const allocMachines = proc.machineIds && proc.machineIds.length > 0
      ? (machineMaster || []).filter(m => proc.machineIds.includes(m.id) && m.status === "Active")
      : ["Formation", "Manual Formation"].includes(proc) && proc !== "Formation"
        ? (machineMaster || []).filter(m => MANUAL_FORMATION_MACHINES.includes(m.type) && m.status === "Active")
        : ["Formation", "Manual Formation"].includes(proc)
          ? (machineMaster || []).filter(m => FORMATION_MACHINES.includes(m.type) && m.status === "Active")
          : (machineMaster || []).filter(m => m.type === proc && m.status === "Active");

    if (allocMachines.length === 0) {
      return; 
    }

    
    let duration = form.durByProcess && form.durByProcess[proc] ? +(form.durByProcess[proc]) : 1;

    
    curDate = addWorkingDays(curDate, duration);

    schedule.push({
      process: proc,
      startDate: addWorkingDays(curDate, -duration),
      endDate: curDate,
      machineId: allocMachines[0].id,
      machineName: allocMachines[0].name,
      duration,
    });
  });

  return schedule;
}


export function getStageTarget(jo, stage) {
  if (!jo.stageQtyMap) return 0;
  return +(jo.stageQtyMap[stage] || 0);
}

export function getStageFilledQty(jo, stage) {
  if (!jo.stageHistory) return 0;
  const entries = jo.stageHistory.filter(e => e.stage === stage);
  return entries.reduce((s, e) => s + +(e.qtyCompleted || 0), 0);
}


export function recomputeJO(jo, stageQtyMap, newHistory) {
  const completedProcesses = [];
  const history = newHistory || jo.stageHistory || [];
  const procs = (jo.process || []).slice();

  procs.forEach(proc => {
    const target = stageQtyMap[proc] || 0;
    const completed = history
      .filter(e => e.stage === proc)
      .reduce((s, e) => s + +(e.qtyCompleted || 0), 0);
    if (target > 0 && completed >= target) {
      completedProcesses.push(proc);
    }
  });

  const nextIdx = procs.findIndex(p => !completedProcesses.includes(p));
  const currentStage = nextIdx >= 0 ? procs[nextIdx] : null;
  const allDone = completedProcesses.length === procs.length;
  const status = allDone ? "Completed" : nextIdx >= 0 ? "In Progress" : "Pending";

  return { completedProcesses, currentStage, status };
}
