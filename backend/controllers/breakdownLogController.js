const BreakdownLog = require('../models/BreakdownLog');
const ProductionCalendar = require('../models/ProductionCalendar');
const MachineMaster = require('../models/MachineMaster');
const JobOrder = require('../models/JobOrder');
const { recalcJobCalendar } = require('./planningController');
const moment = require('moment');

exports.getAll = async (req, res) => {
  try {
    const { startDate, endDate, machineId, status } = req.query;
    const query = {};

    if (machineId) query.machineId = machineId;
    if (status) query.status = status;
    if (startDate || endDate) {
      query.startDateTime = {};
      if (startDate) query.startDateTime.$gte = moment(startDate).startOf('day').toDate();
      if (endDate) query.startDateTime.$lte = moment(endDate).endOf('day').toDate();
    }

    const logs = await BreakdownLog.find(query).populate('machineId').sort({ startDateTime: -1 });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch breakdown logs' });
  }
};

exports.create = async (req, res) => {
  try {
    const log = new BreakdownLog(req.body);
    await log.save();

    const machineIdStr = log.machineId.toString();
    const breakdownStart = moment(log.startDateTime).startOf('day').toDate();

    // 1. Find all non-locked, non-completed calendar entries on this machine from breakdown date onward
    const affectedEntries = await ProductionCalendar.find({
      machineId: log.machineId,
      date: { $gte: breakdownStart },
      status: { $nin: ['Completed', 'Cancelled', 'Rescheduled'] },
      locked: { $ne: true },
    }).select('jobOrderId process date');

    // 2. Mark them all as Rescheduled
    if (affectedEntries.length > 0) {
      const entryIds = affectedEntries.map((e) => e._id);
      await ProductionCalendar.updateMany(
        { _id: { $in: entryIds } },
        {
          $set: { status: 'Rescheduled', rescheduleReasonCode: 'Breakdown' },
          $push: {
            shiftHistory: {
              fromDate: new Date(),
              reason: 'Breakdown',
              shiftedAt: new Date(),
            },
          },
          $inc: { shiftCount: 1 },
        }
      );

      // 3. Collect unique job IDs and push shiftHistory on each job
      const uniqueJobIds = [...new Set(affectedEntries.map((e) => e.jobOrderId.toString()))];

      for (const jobId of uniqueJobIds) {
        const job = await JobOrder.findById(jobId);
        if (!job) continue;

        // Record the shift in the job's shiftHistory
        const processesAffected = [
          ...new Set(
            affectedEntries
              .filter((e) => e.jobOrderId.toString() === jobId)
              .map((e) => e.process)
          ),
        ];
        job.shiftHistory = job.shiftHistory || [];
        job.shiftHistory.push({
          fromDate: new Date(),
          process: processesAffected.join(', '),
          reason: 'Breakdown',
          shiftedAt: new Date(),
        });
        await job.save();

        // Recalculate calendar from today (uses remaining qty via stageQtyMap)
        await recalcJobCalendar(jobId);
      }
    }

    // 4. Mark rescheduleTriggered and update machine status
    log.rescheduleTriggered = affectedEntries.length > 0;
    await log.save();

    await MachineMaster.findByIdAndUpdate(log.machineId, { currentStatus: 'Breakdown' });

    res.status(201).json({
      ...log.toObject(),
      affectedJobs: [...new Set(affectedEntries.map((e) => e.jobOrderId.toString()))].length,
      affectedEntries: affectedEntries.length,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create breakdown log: ' + error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const log = await BreakdownLog.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!log) return res.status(404).json({ error: 'Log not found' });

    // If breakdown is resolved, check if machine has any other open breakdowns
    if (req.body.status === 'Resolved') {
      const openBreakdowns = await BreakdownLog.countDocuments({
        machineId: log.machineId,
        status: 'Open',
        _id: { $ne: log._id },
      });
      if (openBreakdowns === 0) {
        await MachineMaster.findByIdAndUpdate(log.machineId, { currentStatus: 'Running' });
      }
    }

    res.json(log);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update breakdown log' });
  }
};

exports.delete = async (req, res) => {
  try {
    const log = await BreakdownLog.findByIdAndDelete(req.params.id);
    if (!log) return res.status(404).json({ error: 'Log not found' });
    res.json({ message: 'Log deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete breakdown log' });
  }
};
