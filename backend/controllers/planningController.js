const JobOrder = require('../models/JobOrder');
const MachineMaster = require('../models/MachineMaster');
const ProductionCalendar = require('../models/ProductionCalendar');
const CompanyMaster = require('../models/CompanyMaster');
const moment = require('moment');

const generateProductionCalendar = async (req, res) => {
  try {
    const horizonDays = parseInt(req.query.days) || 14;
    const startDate = moment().startOf('day');
    const endDate = moment().add(horizonDays, 'days').endOf('day');

    // 1. Fetch all machines
    const machines = await MachineMaster.find({ status: 'Active' });

    // 2. Fetch all open job orders
    const jobOrders = await JobOrder.find({ 
      status: { $in: ['Open', 'In Progress', 'Partially Done'] } 
    });

    // 3. Fetch companies for priority
    const companies = await CompanyMaster.find();
    const companyPriorityMap = companies.reduce((acc, c) => {
      acc[c.name] = c.priority || 3;
      return acc;
    }, {});

    // Clear existing PLANNED calendar entries in the horizon
    await ProductionCalendar.deleteMany({
      date: { $gte: startDate.toDate(), $lte: endDate.toDate() },
      status: 'Planned'
    });

    // 4. Sort Jobs for the Queue
    const sortedJobs = jobOrders.sort((a, b) => {
      // Priority 1: Material Ready & Artwork Approved
      const aReady = a.materialReady && a.artworkApproved;
      const bReady = b.materialReady && b.artworkApproved;
      if (aReady !== bReady) return bReady ? 1 : -1;

      // Priority 2: Due Date (Grouped by date to allow similarity sorting within the same day)
      const aDate = moment(a.deliveryDate).startOf('day');
      const bDate = moment(b.deliveryDate).startOf('day');
      if (!aDate.isSame(bDate)) return aDate.isBefore(bDate) ? -1 : 1;

      // Priority 3: Setup Similarity (GSM, Size, Reel Width)
      if (a.paperGsm !== b.paperGsm) return a.paperGsm - b.paperGsm;
      if (a.reelWidthMm !== b.reelWidthMm) return a.reelWidthMm - b.reelWidthMm;
      if (a.sheetSize !== b.sheetSize) return a.sheetSize?.localeCompare(b.sheetSize);

      // Priority 4: Client Priority
      const aPrio = companyPriorityMap[a.companyName] || 3;
      const bPrio = companyPriorityMap[b.companyName] || 3;
      if (aPrio !== bPrio) return aPrio - bPrio;

      return 0;
    });

    const calendarEntries = [];

    // 5. Allocation Loop
    for (const machine of machines) {
      let currentDate = moment(startDate);

      for (let d = 0; d < horizonDays; d++) {
        const dateStr = currentDate.format('dddd');
        
        // Skip if weekly off or not a working day
        if (machine.weeklyOff.includes(dateStr) || !machine.workingDays.includes(dateStr)) {
          currentDate.add(1, 'day');
          continue;
        }

        let availableHours = machine.standardShiftHours;
        let otHours = machine.overtimeAllowed ? machine.maxOvertimeHours : 0;
        let currentTime = moment(currentDate).set({
          hour: parseInt(machine.shiftStartTime.split(':')[0]),
          minute: parseInt(machine.shiftStartTime.split(':')[1])
        });

        // Find jobs compatible with this machine's process
        const compatibleJobs = sortedJobs.filter(j => 
          j.process.includes(machine.type) && 
          !j.completedProcesses.includes(machine.type)
        );

        for (const job of compatibleJobs) {
          if (availableHours <= 0 && otHours <= 0) break;

          // Calculate Planned Hours
          // Planned Hours = Setup Time + (Order Qty ÷ Practical Run Rate) + Buffer Time
          const runRate = machine.practicalRunRate || 1000;
          const setupTime = (machine.setupTimeDefault || 30) / 60; // hours
          const prodHours = job.orderQty / runRate;
          const totalRequiredHours = setupTime + prodHours;

          let hoursToAllocate = Math.min(totalRequiredHours, availableHours + otHours);
          
          if (hoursToAllocate > 0) {
            const isOT = availableHours <= 0;
            
            calendarEntries.push({
              machineId: machine._id,
              date: currentDate.toDate(),
              shift: isOT ? 'OT' : 'Shift 1',
              startTime: currentTime.format('HH:mm'),
              endTime: currentTime.clone().add(hoursToAllocate, 'hours').format('HH:mm'),
              jobOrderId: job._id,
              jobCardNo: job.joNo,
              process: machine.type,
              scheduledHours: hoursToAllocate,
              scheduledQty: job.orderQty * (hoursToAllocate / totalRequiredHours),
              isOvertime: isOT,
              status: 'Planned'
            });

            currentTime.add(hoursToAllocate, 'hours');
            if (isOT) {
              otHours -= hoursToAllocate;
            } else {
              availableHours -= hoursToAllocate;
            }

            // If job is fully allocated, remove from compatible list for THIS machine's future days
            // (In a real scenario, we'd track remaining qty/hours)
          }
        }
        currentDate.add(1, 'day');
      }
    }

    if (calendarEntries.length > 0) {
      await ProductionCalendar.insertMany(calendarEntries);
    }

    res.status(200).json({
      success: true,
      message: `Generated ${calendarEntries.length} calendar entries.`,
      count: calendarEntries.length
    });

  } catch (error) {
    console.error('Planning Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const getProductionCalendar = async (req, res) => {
  try {
    const { startDate, endDate, machineId } = req.query;
    let query = {};
    
    if (startDate && endDate) {
      query.date = { 
        $gte: moment(startDate).startOf('day').toDate(), 
        $lte: moment(endDate).endOf('day').toDate() 
      };
    }
    
    if (machineId) {
      query.machineId = machineId;
    }

    const calendar = await ProductionCalendar.find(query)
      .populate('machineId', 'name type')
      .populate('jobOrderId', 'joNo itemName companyName')
      .sort({ date: 1, startTime: 1 });

    res.status(200).json(calendar);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  generateProductionCalendar,
  getProductionCalendar
};
