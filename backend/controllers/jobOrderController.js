const JobOrder = require('../models/JobOrder');
const RawMaterialStock = require('../models/RawMaterialStock');
const FGStock = require('../models/FGStock');
const PrintingDetailMaster = require('../models/PrintingDetailMaster');
const MachineMaster = require('../models/MachineMaster');
const SalesOrder = require('../models/SalesOrder');
const { generateJONo } = require('../utils/counters');
const { generateJobCardPDF } = require('../utils/pdf');

const STAGES = ["Printing", "Varnish", "Lamination", "Die Cutting", "Formation", "Manual Formation"];

/**
 * Build schedule for job order based on machine capacity
 */
async function buildSchedule(jobOrder, machineAssignments) {
  const schedule = [];
  let currentDate = new Date(jobOrder.jobcardDate);

  for (const process of jobOrder.process) {
    const machineId = machineAssignments[process];

    if (!machineId) continue;

    const machine = await MachineMaster.findById(machineId);

    if (!machine || machine.status !== 'Active') continue;

    // Calculate duration (days) needed for this process
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

/**
 * Deduct raw material stock for job order
 */
async function deductRawMaterialStock(jobOrder) {
  // Find matching RM stock by paperType + gsm + sheetSize
  const query = {
    paperType: jobOrder.paperType,
    gsm: jobOrder.paperGsm
  };

  if (jobOrder.sheetSize) {
    query.sheetSize = jobOrder.sheetSize;
  }

  const rmStock = await RawMaterialStock.findOne(query);

  if (rmStock && jobOrder.noOfSheets) {
    rmStock.qty = Math.max(0, rmStock.qty - jobOrder.noOfSheets);

    if (rmStock.weightPerSheet) {
      rmStock.weight = rmStock.qty * rmStock.weightPerSheet;
    }

    await rmStock.save();
  }

  // If there's a second paper
  if (jobOrder.hasSecondPaper && jobOrder.paperType2 && jobOrder.paperGsm2) {
    const rmStock2 = await RawMaterialStock.findOne({
      paperType: jobOrder.paperType2,
      gsm: jobOrder.paperGsm2
    });

    if (rmStock2 && jobOrder.noOfSheets2) {
      rmStock2.qty = Math.max(0, rmStock2.qty - jobOrder.noOfSheets2);

      if (rmStock2.weightPerSheet) {
        rmStock2.weight = rmStock2.qty * rmStock2.weightPerSheet;
      }

      await rmStock2.save();
    }
  }

  // For reel jobs
  if (jobOrder.reelWeightKg) {
    const reelStock = await RawMaterialStock.findOne({
      paperType: jobOrder.paperType,
      gsm: jobOrder.paperGsm,
      unit: 'reels'
    });

    if (reelStock) {
      reelStock.weight = Math.max(0, reelStock.weight - jobOrder.reelWeightKg);
      await reelStock.save();
    }
  }
}

/**
 * Save or update printing details master
 */
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

/**
 * Get all job orders
 */
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

/**
 * Get single job order
 */
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

/**
 * Create new job order
 */
exports.create = async (req, res) => {
  try {
    const joNo = await generateJONo();

    const jobOrderData = {
      ...req.body,
      joNo,
      createdBy: req.userId,
      status: 'Open',
      completedProcesses: [],
      stageQtyMap: new Map(),
      stageHistory: []
    };

    // Build schedule if machineAssignments provided
    if (req.body.machineAssignments) {
      jobOrderData.machineAssignments = new Map(Object.entries(req.body.machineAssignments));
      jobOrderData.schedule = await buildSchedule(jobOrderData, req.body.machineAssignments);
    }

    const jobOrder = new JobOrder(jobOrderData);
    await jobOrder.save();

    // Auto-deduct raw material stock
    await deductRawMaterialStock(jobOrder);

    // Save/update printing master
    await upsertPrintingMaster(jobOrder);

    res.status(201).json(jobOrder);
  } catch (error) {
    console.error('Create job order error:', error);
    res.status(500).json({ error: 'Failed to create job order', details: error.message });
  }
};

/**
 * Update job order
 */
exports.update = async (req, res) => {
  try {
    const jobOrder = await JobOrder.findById(req.params.id);

    if (!jobOrder) {
      return res.status(404).json({ error: 'Job order not found' });
    }

    // Update fields
    Object.assign(jobOrder, req.body);

    // Rebuild schedule if machineAssignments changed
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

/**
 * Delete job order
 */
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

/**
 * Add production stage entry
 */
exports.addStage = async (req, res) => {
  try {
    const { stage, qtyCompleted, qtyRejected, operator, machine, shift, date, remarks } = req.body;

    const jobOrder = await JobOrder.findById(req.params.id);

    if (!jobOrder) {
      return res.status(404).json({ error: 'Job order not found' });
    }

    // Add to stage history
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

    // Update stageQtyMap
    const currentQty = jobOrder.stageQtyMap.get(stage) || 0;
    jobOrder.stageQtyMap.set(stage, currentQty + (qtyCompleted || 0));

    // Update completed processes and status
    const orderedProcesses = STAGES.filter(p => jobOrder.process.includes(p));
    const completedProcesses = [];

    for (const proc of orderedProcesses) {
      if (['Formation', 'Manual Formation'].includes(proc)) {
        if ((jobOrder.stageQtyMap.get(proc) || 0) >= jobOrder.orderQty) {
          completedProcesses.push(proc);
        }
      } else {
        if (jobOrder.stageHistory.some(e => e.stage === proc)) {
          completedProcesses.push(proc);
        }
      }
    }

    jobOrder.completedProcesses = completedProcesses;
    jobOrder.currentStage = orderedProcesses.find(p => !completedProcesses.includes(p)) || 'Completed';
    jobOrder.status = completedProcesses.length === orderedProcesses.length
      ? 'Completed'
      : completedProcesses.length > 0
      ? 'In Progress'
      : 'Open';

    // If completed, move to FG Stock
    if (jobOrder.status === 'Completed') {
      // Find price from linked SO
      let price = 0;
      if (jobOrder.soRef) {
        const so = await SalesOrder.findOne({ soNo: jobOrder.soRef });
        if (so) {
          const item = so.items.find(i => i.itemName === jobOrder.itemName);
          if (item) price = item.price || 0;
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
          qty: jobOrder.orderQty,
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

/**
 * Generate job card PDF
 */
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
