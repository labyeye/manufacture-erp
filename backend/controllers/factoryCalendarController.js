const FactoryCalendar = require('../models/FactoryCalendar');
const ProductionCalendar = require('../models/ProductionCalendar');
const JobOrder = require('../models/JobOrder');
const MachineMaster = require('../models/MachineMaster');
const { recalcJobCalendar } = require('./planningController');
const moment = require('moment');

exports.getAll = async (req, res) => {
  try {
    const { startDate, endDate, type } = req.query;
    const query = {};
    if (type) query.type = type;
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = moment(startDate).startOf('day').toDate();
      if (endDate) query.date.$lte = moment(endDate).endOf('day').toDate();
    }
    const calendar = await FactoryCalendar.find(query).sort({ date: 1 });
    res.json(calendar);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch factory calendar' });
  }
};

exports.create = async (req, res) => {
  try {
    const entry = new FactoryCalendar(req.body);
    await entry.save();

    const entryDate = moment(entry.date).startOf('day').toDate();
    let affectedJobIds = [];

    if (entry.type === 'Holiday' || entry.type === 'Shutdown') {
      // Find all non-locked, non-completed calendar entries on that date
      const affected = await ProductionCalendar.find({
        date: {
          $gte: entryDate,
          $lte: moment(entry.date).endOf('day').toDate(),
        },
        status: { $nin: ['Completed', 'Cancelled', 'Rescheduled'] },
        locked: { $ne: true },
      }).select('jobOrderId process');

      if (affected.length > 0) {
        const entryIds = affected.map((e) => e._id);
        await ProductionCalendar.updateMany(
          { _id: { $in: entryIds } },
          {
            $set: { status: 'Rescheduled', rescheduleReasonCode: 'Manual' },
            $push: { shiftHistory: { fromDate: entryDate, reason: 'Manual', shiftedAt: new Date() } },
            $inc: { shiftCount: 1 },
          }
        );
        affectedJobIds = [...new Set(affected.map((e) => e.jobOrderId.toString()))];
        for (const jobId of affectedJobIds) {
          await recalcJobCalendar(jobId);
        }
      }
    } else if (entry.type === 'Power-cut') {
      // Affects only specific machines if affectsAllMachines=false
      const machineFilter = entry.affectsAllMachines
        ? {}
        : { _id: { $in: entry.affectedMachineIds } };

      const targetMachines = await MachineMaster.find(machineFilter).select('_id');
      const machineIds = targetMachines.map((m) => m._id);

      const affected = await ProductionCalendar.find({
        machineId: { $in: machineIds },
        date: {
          $gte: entryDate,
          $lte: moment(entry.date).endOf('day').toDate(),
        },
        status: { $nin: ['Completed', 'Cancelled', 'Rescheduled'] },
        locked: { $ne: true },
      }).select('jobOrderId process');

      if (affected.length > 0) {
        const entryIds = affected.map((e) => e._id);
        await ProductionCalendar.updateMany(
          { _id: { $in: entryIds } },
          {
            $set: { status: 'Rescheduled', rescheduleReasonCode: 'Manual' },
            $push: { shiftHistory: { fromDate: entryDate, reason: 'Manual', shiftedAt: new Date() } },
            $inc: { shiftCount: 1 },
          }
        );
        affectedJobIds = [...new Set(affected.map((e) => e.jobOrderId.toString()))];
        for (const jobId of affectedJobIds) {
          await recalcJobCalendar(jobId);
        }
      }
    }

    res.status(201).json({ ...entry.toObject(), affectedJobs: affectedJobIds.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create calendar entry: ' + error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const entry = await FactoryCalendar.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!entry) return res.status(404).json({ error: 'Entry not found' });
    res.json(entry);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update calendar entry' });
  }
};

exports.delete = async (req, res) => {
  try {
    const entry = await FactoryCalendar.findByIdAndDelete(req.params.id);
    if (!entry) return res.status(404).json({ error: 'Entry not found' });
    res.json({ message: 'Calendar entry deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete calendar entry' });
  }
};
