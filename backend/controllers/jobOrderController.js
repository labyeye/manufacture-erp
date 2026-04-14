const JobOrder = require('../models/JobOrder');
const RawMaterialStock = require('../models/RawMaterialStock');
const FGStock = require('../models/FGStock');
const PrintingDetailMaster = require('../models/PrintingDetailMaster');
const MachineMaster = require('../models/MachineMaster');
const SalesOrder = require('../models/SalesOrder');
const { generateJONo } = require('../utils/counters');
const { generateJobCardPDF } = require('../utils/pdf');

const STAGES = ["Printing", "Varnish", "Lamination", "Die Cutting", "Formation", "Manual Formation"];

async function buildSchedule(jobOrder, machineAssignments) {
  const schedule = [];
  let currentDate = new Date(jobOrder.jobcardDate);

  for (const process of jobOrder.process) {
    const machineId = machineAssignments[process];
    if (!machineId) continue;

    const machine = await MachineMaster.findById(machineId);
    if (!machine || machine.status !== 'Active') continue;

    const capacityPerDay = machine.capacity * machine.workingHours * machine.shiftsPerDay;
    const duration = capacityPerDay > 0 ? Math.ceil(jobOrder.orderQty / capacityPerDay) : 1;

    const startDate = new Date(currentDate);
    const endDate = new Date(currentDate);
    endDate.setDate(endDate.getDate() + duration);

    schedule.push({
      process,
      machine: machine.name,
      machineId: machine._id.toString(),
      machineName: machine.name,
      startDate,
      endDate,
      duration
    });

    currentDate = endDate;
  }

  return schedule;
}

async function deductRawMaterialStock(jobOrder) {
  try {
    const findStock = async (id, cat, type, gsm) => {
      // 1. Try by ID first (most accurate)
      if (id) {
        const byId = await RawMaterialStock.findById(id);
        if (byId) return byId;
      }

      // 2. Fallback to fuzzy match
      if (!cat || !type) return null;
      const normCat = cat.trim().replace(/s$/i, "");
      return RawMaterialStock.findOne({
        category: { $regex: new RegExp(`^${normCat}`, "i") },
        paperType: { $regex: new RegExp(`${type.trim()}`, "i") },
        gsm: gsm,
      });
    };

    // 1. Process Main Paper
    const rmStock = await findStock(
      jobOrder.rmStockId,
      jobOrder.paperCategory,
      jobOrder.paperType,
      jobOrder.paperGsm,
    );

    if (rmStock) {
      if (rmStock.unit === "kg" || jobOrder.paperCategory === "Paper Reel") {
        const weightToDeduct = Number(jobOrder.reelWeightKg || 0);
        if (weightToDeduct > 0) {
          rmStock.weight = Math.max(0, rmStock.weight - weightToDeduct);
          // If it's a sheet stock tracked in kg, also adjust qty if possible
          if (rmStock.unit === "sheets" && rmStock.weightPerSheet > 0) {
            rmStock.qty = Math.floor(rmStock.weight / rmStock.weightPerSheet);
          }
        }
      } else {
        const qtyToDeduct = Number(jobOrder.noOfSheets || 0);
        if (qtyToDeduct > 0) {
          const wps =
            rmStock.weightPerSheet ||
            (rmStock.qty > 0 ? rmStock.weight / rmStock.qty : 0);

          rmStock.qty = Math.max(0, rmStock.qty - qtyToDeduct);
          if (wps > 0) {
            rmStock.weight = rmStock.qty * wps;
          }
        }
      }
      await rmStock.save();
      console.log(`✅ Stock Deducted for ${jobOrder.joNo}:`, rmStock.name);
    }

    // 2. Handle Second Paper if present
    if (jobOrder.hasSecondPaper && (jobOrder.rmStockId2 || jobOrder.paperType2)) {
      const rmStock2 = await findStock(
        jobOrder.rmStockId2,
        jobOrder.paperCategory2 || jobOrder.paperCategory,
        jobOrder.paperType2,
        jobOrder.paperGsm2,
      );

      if (rmStock2) {
        if (rmStock2.unit === "kg" || (jobOrder.paperCategory2 || jobOrder.paperCategory) === "Paper Reel") {
          // Weight calculation for second paper - currently assumes same as main reel weight or needs its own field
          // If it's sheets, it uses noOfSheets2
          if (rmStock2.unit === "sheets") {
             const qty2 = Number(jobOrder.noOfSheets2 || 0);
             const wps2 = rmStock2.weightPerSheet || (rmStock2.qty > 0 ? rmStock2.weight / rmStock2.qty : 0);
             rmStock2.qty = Math.max(0, rmStock2.qty - qty2);
             if (wps2 > 0) rmStock2.weight = rmStock2.qty * wps2;
          } else {
             const weightToDeduct2 = Number(jobOrder.reelWeightKg || 0); // Logic may vary
             rmStock2.weight = Math.max(0, rmStock2.weight - weightToDeduct2);
          }
        } else {
          const qtyToDeduct2 = Number(jobOrder.noOfSheets2 || 0);
          if (qtyToDeduct2 > 0) {
            const wps2 =
              rmStock2.weightPerSheet ||
              (rmStock2.qty > 0 ? rmStock2.weight / rmStock2.qty : 0);

            rmStock2.qty = Math.max(0, rmStock2.qty - qtyToDeduct2);
            if (wps2 > 0) {
              rmStock2.weight = rmStock2.qty * wps2;
            }
          }
        }
        await rmStock2.save();
        console.log(`✅ Stock 2 Deducted for ${jobOrder.joNo}:`, rmStock2.name);
      }
    }
  } catch (err) {
    console.error("❌ Stock Deduction Error:", err);
  }
}

async function upsertPrintingMaster(jobOrder) {
  if (!jobOrder.printing && !jobOrder.plate) return;

  await PrintingDetailMaster.findOneAndUpdate(
    {
      itemName: jobOrder.itemName,
      clientName: jobOrder.clientName
    },
    {
      itemName: jobOrder.itemName,
      clientName: jobOrder.clientName,
      clientCategory: jobOrder.clientCategory,
      printing: jobOrder.printing,
      plate: jobOrder.plate,
      process: jobOrder.process,
      paperCategory: jobOrder.paperCategory,
      paperType: jobOrder.paperType,
      paperGsm: jobOrder.paperGsm,
      noOfUps: jobOrder.noOfUps,
      sheetSize: jobOrder.sheetSize,
      sheetW: jobOrder.sheetW,
      sheetL: jobOrder.sheetL,
      reelSize: jobOrder.reelSize,
      reelWidthMm: jobOrder.reelWidthMm,
      cuttingLengthMm: jobOrder.cuttingLengthMm,
      updatedAt: new Date()
    },
    { upsert: true, new: true }
  );
}

exports.getAll = async (req, res) => {
  try {
    const jobOrders = await JobOrder.find()
      .populate('createdBy', 'name username')
      .sort({ createdAt: -1 });

    res.json(jobOrders);
  } catch (error) {
    console.error('Get job orders error:', error);
    res.status(500).json({ error: 'Failed to fetch job orders' });
  }
};

exports.getOne = async (req, res) => {
  try {
    const jobOrder = await JobOrder.findById(req.params.id)
      .populate('createdBy', 'name username');

    if (!jobOrder) {
      return res.status(404).json({ error: 'Job order not found' });
    }

    res.json(jobOrder);
  } catch (error) {
    console.error('Get job order error:', error);
    res.status(500).json({ error: 'Failed to fetch job order' });
  }
};

exports.create = async (req, res) => {
  try {
    const joNo = await generateJONo();

    const STAGES_ORDER = ["Printing", "Varnish", "Lamination", "Die Cutting", "Formation", "Manual Formation"];
    let sortedProcess = req.body.process || [];
    if (Array.isArray(sortedProcess)) {
      sortedProcess.sort((a, b) => STAGES_ORDER.indexOf(a) - STAGES_ORDER.indexOf(b));
    }

    const jobOrderData = {
      ...req.body,
      process: sortedProcess,
      joNo,
      createdBy: req.userId,
      status: 'Open',
      completedProcesses: [],
      stageQtyMap: new Map(),
      stageTotalMap: new Map(),
      stageHistory: []
    };

    if (req.body.machineAssignments) {
      jobOrderData.machineAssignments = new Map(Object.entries(req.body.machineAssignments));
      jobOrderData.schedule = await buildSchedule(jobOrderData, req.body.machineAssignments);
    }

    const jobOrder = new JobOrder(jobOrderData);
    await jobOrder.save();

    await deductRawMaterialStock(jobOrder);

    await upsertPrintingMaster(jobOrder);

    res.status(201).json(jobOrder);
  } catch (error) {
    console.error('Create job order error:', error);
    res.status(500).json({ error: 'Failed to create job order', details: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const jobOrder = await JobOrder.findById(req.params.id);
    if (!jobOrder) {
      return res.status(404).json({ error: 'Job order not found' });
    }

    const STAGES_ORDER = ["Printing", "Varnish", "Lamination", "Die Cutting", "Formation", "Manual Formation"];
    if (req.body.process && Array.isArray(req.body.process)) {
      req.body.process.sort((a, b) => STAGES_ORDER.indexOf(a) - STAGES_ORDER.indexOf(b));
    }
    Object.assign(jobOrder, req.body);

    if (req.body.machineAssignments) {
      jobOrder.machineAssignments = new Map(Object.entries(req.body.machineAssignments));
      jobOrder.schedule = await buildSchedule(jobOrder, req.body.machineAssignments);
    }

    await jobOrder.save();
    res.json(jobOrder);
  } catch (error) {
    console.error('Update job order error:', error);
    res.status(500).json({ error: 'Failed to update job order' });
  }
};

exports.delete = async (req, res) => {
  try {
    const jobOrder = await JobOrder.findByIdAndDelete(req.params.id);
    if (!jobOrder) {
      return res.status(404).json({ error: 'Job order not found' });
    }
    res.json({ message: 'Job order deleted successfully' });
  } catch (error) {
    console.error('Delete job order error:', error);
    res.status(500).json({ error: 'Failed to delete job order' });
  }
};

exports.addStage = async (req, res) => {
  try {
    const { stage, qtyCompleted, qtyRejected, operator, machine, shift, date, remarks } = req.body;
    const jobOrder = await JobOrder.findById(req.params.id);

    if (!jobOrder) {
      return res.status(404).json({ error: 'Job order not found' });
    }

    jobOrder.stageHistory.push({
      stage,
      qtyCompleted: qtyCompleted || 0,
      qtyRejected: qtyRejected || 0,
      operator,
      machine,
      shift,
      date: date || new Date(),
      remarks,
      enteredBy: req.userId,
      enteredAt: new Date()
    });

    const currentQty = jobOrder.stageQtyMap.get(stage) || 0;
    jobOrder.stageQtyMap.set(stage, currentQty + (qtyCompleted || 0));

    const currentTotal = jobOrder.stageTotalMap.get(stage) || 0;
    jobOrder.stageTotalMap.set(stage, currentTotal + (qtyCompleted || 0) + (qtyRejected || 0));

    const orderedProcesses = jobOrder.process || [];
    const completedProcesses = [];

    for (const proc of orderedProcesses) {
      if (jobOrder.stageHistory.some(e => e.stage === proc)) {
        completedProcesses.push(proc);
      }
    }

    jobOrder.completedProcesses = completedProcesses;
    jobOrder.currentStage = orderedProcesses.find(p => !completedProcesses.includes(p)) || 'Completed';
    jobOrder.status = completedProcesses.length === orderedProcesses.length
      ? 'Completed'
      : completedProcesses.length > 0
      ? 'In Progress'
      : 'Open';

    // Update FG Stock if this is a formation stage or if job is completed
    const isFormationStage = stage.includes('Formation');
    if (isFormationStage || jobOrder.status === 'Completed') {
      const lastStage = orderedProcesses[orderedProcesses.length - 1];
      // If it's a formation stage, we sync the current progress of THAT stage to FG stock
      // Usually, formation is the final stage anyway.
      const finishedQty = jobOrder.stageQtyMap.get(stage) || 0;

      let price = 0;
      if (jobOrder.soRef) {
        const so = await SalesOrder.findOne({ soNo: jobOrder.soRef });
        if (so) {
          const joName = (jobOrder.itemName || "").trim().toLowerCase();
          const item = so.items.find(i => (i.itemName || "").trim().toLowerCase() === joName);
          if (item) {
            price = item.price || 0;
          } else {
            console.log(`⚠️ Item "${jobOrder.itemName}" not found in SO ${jobOrder.soRef}. Items present:`, so.items.map(i => i.itemName));
          }
        }
      }

      await FGStock.findOneAndUpdate(
        {
          itemName: jobOrder.itemName,
          joNo: jobOrder.joNo
        },
        {
          itemName: jobOrder.itemName,
          joNo: jobOrder.joNo,
          soRef: jobOrder.soRef,
          clientName: jobOrder.clientName,
          qty: finishedQty,
          price,
          lastUpdated: new Date()
        },
        { upsert: true }
      );
    }

    await jobOrder.save();
    res.json(jobOrder);
  } catch (error) {
    console.error('Add stage error:', error);
    res.status(500).json({ error: 'Failed to add stage entry' });
  }
};

exports.getJobCardPDF = async (req, res) => {
  try {
    const jobOrder = await JobOrder.findById(req.params.id).lean();
    if (!jobOrder) {
      return res.status(404).json({ error: 'Job order not found' });
    }
    const pdf = await generateJobCardPDF(jobOrder);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="JobCard_${jobOrder.joNo}.pdf"`);
    res.send(pdf);
  } catch (error) {
    console.error('Generate job card PDF error:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
};

module.exports = exports;
