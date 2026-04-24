/**
 * seedMachines.js
 * Upserts machine records with capacity data from the Machine Master Field Reference.
 *
 * Run: node backend/scripts/seedMachines.js
 *   or: MONGODB_URI=<uri> node backend/scripts/seedMachines.js
 *
 * Safe to run multiple times — uses upsert by name.
 */

require("dotenv").config();
const mongoose = require("mongoose");
const MachineMaster = require("../models/MachineMaster");

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/manufactureiq";

// ---------------------------------------------------------------------------
// Reference data from Machine Master Field Reference sheet (2026-04-25)
// setupTimeDefault  = "Setup Time New Job (Minutes)"   → converted to hours
// changeoverTimeDefault = "Mould/Size Change Time (Min)" → converted to hours
// practicalRunRate  = "Capacity Per Hour"
// ---------------------------------------------------------------------------
const MACHINE_CAPACITY = [
  // --- Sheet / Printing ---
  {
    name: "Komori 28x40inch Machine",
    practicalRunRate: 3750,
    capacityUnit: "Sheets",
    setupTimeDefault: 30 / 60,       // 30 min → 0.50 hr
    changeoverTimeDefault: 0,
  },
  {
    name: "Flexo Printing Machine",
    practicalRunRate: 3750,
    capacityUnit: "Pcs",
    setupTimeDefault: 45 / 60,       // 45 min → 0.75 hr
    changeoverTimeDefault: 0,
  },

  // --- Die Cutting ---
  {
    name: "Manual Die Cutting Machine 1",
    practicalRunRate: 875,
    capacityUnit: "Sheets",
    setupTimeDefault: 45 / 60,       // 45 min → 0.75 hr
    changeoverTimeDefault: 0,
  },
  {
    name: "Manual Die Cutting Machine 2",
    practicalRunRate: 875,
    capacityUnit: "Sheets",
    setupTimeDefault: 45 / 60,
    changeoverTimeDefault: 0,
  },
  {
    name: "Automatic Die Cutting",
    practicalRunRate: 2500,
    capacityUnit: "Sheets",
    setupTimeDefault: 30 / 60,       // 30 min → 0.50 hr
    changeoverTimeDefault: 0,
  },

  // --- Lamination ---
  {
    name: "Laminator Machine 1",
    practicalRunRate: 1250,
    capacityUnit: "Sheets",
    setupTimeDefault: 30 / 60,
    changeoverTimeDefault: 0,
  },
  {
    name: "Laminator Machine 2",
    practicalRunRate: 1250,          // same spec as Machine 1
    capacityUnit: "Sheets",
    setupTimeDefault: 30 / 60,
    changeoverTimeDefault: 0,
  },

  // --- Formation: Dip Bowl / Lid ---
  {
    name: "Dip Bowl",
    practicalRunRate: 2750,
    capacityUnit: "Pcs",
    setupTimeDefault: 10 / 60,       // 10 min → 0.167 hr
    changeoverTimeDefault: 360 / 60, // 360 min → 6 hr  (mould change)
  },
  {
    name: "Single Layer Lid",
    practicalRunRate: 2750,
    capacityUnit: "Pcs",
    setupTimeDefault: 10 / 60,
    changeoverTimeDefault: 360 / 60,
  },

  // --- Formation: Paper Cups ---
  {
    name: "Single Wall Cup",
    practicalRunRate: 2750,
    capacityUnit: "Pcs",
    setupTimeDefault: 10 / 60,
    changeoverTimeDefault: 360 / 60,
  },
  {
    name: "Double Wall Cup",
    practicalRunRate: 2750,
    capacityUnit: "Pcs",
    setupTimeDefault: 10 / 60,
    changeoverTimeDefault: 360 / 60,
  },

  // --- Formation: Soup Bowls (dedicated sizes — no mould change) ---
  {
    name: "Bowl 250ml",
    practicalRunRate: 2250,
    capacityUnit: "Pcs",
    setupTimeDefault: 10 / 60,
    changeoverTimeDefault: 0,
  },
  {
    name: "Bowl 350ml",
    practicalRunRate: 2250,
    capacityUnit: "Pcs",
    setupTimeDefault: 10 / 60,
    changeoverTimeDefault: 0,
  },
  {
    name: "Bowl 500ml",
    practicalRunRate: 2250,
    capacityUnit: "Pcs",
    setupTimeDefault: 10 / 60,
    changeoverTimeDefault: 0,
  },
  {
    name: "Bowl 750ml",
    practicalRunRate: 2250,
    capacityUnit: "Pcs",
    setupTimeDefault: 10 / 60,
    changeoverTimeDefault: 0,
  },

  // --- Formation: Lid 110mm ---
  {
    name: "Lid 110mm 1",
    practicalRunRate: 2250,
    capacityUnit: "Pcs",
    setupTimeDefault: 10 / 60,
    changeoverTimeDefault: 0,
  },
  {
    name: "Lid 110mm 2",
    practicalRunRate: 1875,          // slightly lower capacity
    capacityUnit: "Pcs",
    setupTimeDefault: 10 / 60,
    changeoverTimeDefault: 0,
  },

  // --- Formation: Flat Bowl (mould change required) ---
  {
    name: "Flat Bowl Machine 1",
    practicalRunRate: 2250,
    capacityUnit: "Pcs",
    setupTimeDefault: 10 / 60,
    changeoverTimeDefault: 360 / 60, // 6 hr mould change
  },
  {
    name: "Flat Bowl Machine 2",
    practicalRunRate: 2250,
    capacityUnit: "Pcs",
    setupTimeDefault: 10 / 60,
    changeoverTimeDefault: 360 / 60,
  },
  {
    name: "Flat Bowl Lid Machine",
    practicalRunRate: 2250,
    capacityUnit: "Pcs",
    setupTimeDefault: 10 / 60,
    changeoverTimeDefault: 0,
  },

  // --- Formation: Carton Erection ---
  {
    name: "Carton Erection 1",
    practicalRunRate: 2750,
    capacityUnit: "Pcs",
    setupTimeDefault: 10 / 60,
    changeoverTimeDefault: 150 / 60, // 150 min → 2.5 hr
  },
  {
    name: "Carton Erection 2",
    practicalRunRate: 2750,
    capacityUnit: "Pcs",
    setupTimeDefault: 10 / 60,
    changeoverTimeDefault: 150 / 60,
  },

  // --- Bag Making: SBBM 360 ---
  {
    name: "SBBM 360 Machine 1",
    practicalRunRate: 5250,
    capacityUnit: "Pcs",
    setupTimeDefault: 10 / 60,
    changeoverTimeDefault: 180 / 60, // 180 min → 3 hr
  },
  {
    name: "SBBM 360 Machine 2",
    practicalRunRate: 5250,
    capacityUnit: "Pcs",
    setupTimeDefault: 10 / 60,
    changeoverTimeDefault: 180 / 60,
  },

  // --- Sheet Cutting ---
  {
    name: "Sheet Cutting Machine",
    practicalRunRate: 11250,
    capacityUnit: "Pcs",
    setupTimeDefault: 10 / 60,
    changeoverTimeDefault: 0,        // mould change time not specified in reference
  },
];

// ---------------------------------------------------------------------------

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log(`Connected to MongoDB: ${MONGODB_URI}`);

  let updated = 0;
  let inserted = 0;

  for (const data of MACHINE_CAPACITY) {
    const existing = await MachineMaster.findOne({ name: data.name });

    const update = {
      practicalRunRate: data.practicalRunRate,
      capacityUnit: data.capacityUnit,
      setupTimeDefault: parseFloat(data.setupTimeDefault.toFixed(4)),
      changeoverTimeDefault: parseFloat(data.changeoverTimeDefault.toFixed(4)),
    };

    if (existing) {
      await MachineMaster.updateOne({ name: data.name }, { $set: update });
      console.log(
        `  updated  "${data.name}"` +
          `  rate=${data.practicalRunRate}/hr` +
          `  setup=${Math.round(data.setupTimeDefault * 60)}min` +
          `  changeover=${Math.round(data.changeoverTimeDefault * 60)}min`
      );
      updated++;
    } else {
      // Insert with full defaults
      await MachineMaster.create({
        name: data.name,
        type: _inferType(data.name),
        division: data.capacityUnit === "Sheets" ? "Sheet" : "Reel",
        status: "Active",
        ...update,
      });
      console.log(`  inserted "${data.name}"`);
      inserted++;
    }
  }

  console.log(`\nDone — ${updated} updated, ${inserted} inserted.`);
  await mongoose.disconnect();
}

function _inferType(name) {
  const n = name.toLowerCase();
  if (n.includes("printing") || n.includes("komori") || n.includes("akiyama"))
    return "Printing";
  if (n.includes("die cut")) return "Die Cutting";
  if (n.includes("laminator") || n.includes("lamination")) return "Lamination";
  if (n.includes("sbbm") || n.includes("cup")) return "Bag Making";
  if (n.includes("sheet cutting")) return "Sheet Cutting";
  if (n.includes("handmade") || n.includes("manual formation"))
    return "Manual Formation";
  return "Formation";
}

seed().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
