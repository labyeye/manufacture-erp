const JobOrder = require("../models/JobOrder");
const MachineMaster = require("../models/MachineMaster");
const ProductionCalendar = require("../models/ProductionCalendar");
const CompanyMaster = require("../models/CompanyMaster");
const FactoryCalendar = require("../models/FactoryCalendar");
const MachineMaintenance = require("../models/MachineMaintenance");
const moment = require("moment");

// Returns a Set of "YYYY-MM-DD" strings that are holidays/shutdowns
const getHolidaySet = async (startDate, endDate) => {
  const entries = await FactoryCalendar.find({
    date: { $gte: startDate, $lte: endDate },
    type: { $in: ["Holiday", "Shutdown"] },
  });
  const set = new Set();
  entries.forEach((e) => set.add(moment(e.date).format("YYYY-MM-DD")));
  return set;
};




const addHoursToTime = (baseTime, hours) => {
  const [bh, bm] = baseTime.split(":").map(Number);
  const totalMins = bh * 60 + bm + Math.round(hours * 60);
  const h = Math.floor(totalMins / 60) % 24;
  const m = totalMins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

const generateProductionCalendar = async (req, res) => {
  try {
    const horizonDays = parseInt(req.query.days) || 14;
    const startDate = moment().startOf("day");
    const endDate = moment().add(horizonDays, "days").endOf("day");

    const machines = await MachineMaster.find({ status: "Active" });
    const jobOrders = await JobOrder.find({
      status: { $nin: ["Completed", "Cancelled"] },
    });
    const companies = await CompanyMaster.find();

    const companyPriorityMap = companies.reduce((acc, c) => {
      acc[c.name] = c.priority || 3;
      return acc;
    }, {});

    await ProductionCalendar.deleteMany({
      date: { $gte: startDate.toDate(), $lte: endDate.toDate() },
      locked: { $ne: true },
    });

    const sortedJobs = jobOrders.sort((a, b) => {
      const aReady = a.materialReady && a.artworkApproved;
      const bReady = b.materialReady && b.artworkApproved;
      if (aReady !== bReady) return bReady ? 1 : -1;

      const aDate = moment(a.deliveryDate).startOf("day");
      const bDate = moment(b.deliveryDate).startOf("day");
      if (!aDate.isSame(bDate)) return aDate.isBefore(bDate) ? -1 : 1;

      const aPrio = companyPriorityMap[a.companyName] || 3;
      const bPrio = companyPriorityMap[b.companyName] || 3;
      if (aPrio !== bPrio) return aPrio - bPrio;

      return 0;
    });

    const machineState = {};
    machines.forEach((m) => {
      const shiftHrs = m.standardShiftHours || 8; 
      const otHours = m.overtimeAllowed ? m.maxOvertimeHours || 3 : 0; 
      const numShifts = m.maxShiftsAllowed || 1;
      const nightShiftHours = numShifts >= 2 ? shiftHrs : 0; 
      const efficiency = m.efficiencyFactor || 0.95;
      const runRate = m.practicalRunRate || 1000;

      const effectiveRunRate = runRate * efficiency;
      
      const dailyCapHours = shiftHrs + otHours + nightShiftHours;

      const workingDays = m.workingDays?.length
        ? m.workingDays
        : ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const weeklyOff = m.weeklyOff?.length ? m.weeklyOff : ["Sunday"];

      machineState[m._id.toString()] = {
        machine: m,
        dailyCapHours,
        setupTime: m.setupTimeDefault !== undefined ? m.setupTimeDefault : 0.5,
        changeoverTime: m.changeoverTimeDefault || 0,
        workingDays,
        weeklyOff,
        shiftHrs,
        otHours,
        nightShiftHours,
        effectiveRunRate,
        dailyUsedHours: {},
        lastJobByDate: {}, 
      };
    });

    const calendarEntries = [];

    for (const job of sortedJobs) {
      if (!job.process || job.process.length === 0) continue;

      let previousStageMinStart = moment(startDate).startOf("day");
      let previousProcess = null;

      const orderQty = job.orderQty || 0;
      const noOfSheets = job.noOfSheets || orderQty;

      for (const processType of job.process) {
        const compatibleMachines = machines.filter(
          (m) => m.type === processType,
        );
        if (compatibleMachines.length === 0) continue;

        let selectedMachine = compatibleMachines[0];

        if (job.machineAssignments && job.machineAssignments.get(processType)) {
          const assignedId = job.machineAssignments.get(processType);
          const found = compatibleMachines.find(
            (m) => m._id.toString() === assignedId,
          );
          if (found) selectedMachine = found;
        }

        let stageQty = orderQty;
        if (
          processType.includes("Printing") ||
          processType.includes("Die Cut") ||
          processType === "Varnish" ||
          processType === "Sheet Cutting"
        ) {
          stageQty = noOfSheets;
        } else if (
          processType === "Formation" ||
          processType === "Bag Making" ||
          processType === "Manual Formation"
        ) {
          stageQty = orderQty;
        }

        let bufferDays = 0;
        if (previousProcess === "Printing" && processType.includes("Die Cut"))
          bufferDays = 1;
        if (previousProcess?.includes("Die Cut") && processType === "Formation")
          bufferDays = 2;

        const minStartTime = previousStageMinStart
          .clone()
          .add(bufferDays, "days");

        const state = machineState[selectedMachine._id.toString()];
        let currentDate = minStartTime.clone();

        const alreadyDone = job.stageQtyMap?.get(processType) || 0;
        let remaining = Math.max(0, stageQty - alreadyDone);
        let blocks = [];
        let safety = 0;

        if (remaining === 0) {
          previousStageMinStart = startDate.clone();
          previousProcess = processType;
          continue;
        }

        
        
        
        const shiftTiers = [
          {
            shift: "Morning",
            start: 0,
            end: state.shiftHrs,
            isOT: false,
          },
          {
            shift: "OT",
            start: state.shiftHrs,
            end: state.shiftHrs + state.otHours,
            isOT: true,
          },
          {
            shift: "Night",
            start: state.shiftHrs + state.otHours,
            end: state.shiftHrs + state.otHours + state.nightShiftHours,
            isOT: true,
          },
        ];

        while (remaining > 0 && safety++ < 300) {
          const dateStr = currentDate.format("YYYY-MM-DD");
          const dayName = currentDate.format("dddd");

          if (
            state.workingDays.includes(dayName) &&
            !state.weeklyOff.includes(dayName)
          ) {
            const machineShiftStart = selectedMachine.shiftStartTime || "09:00";

            const deliveryFeasible = (() => {
              const dueDate = moment(job.internalDueDate || job.deliveryDate);
              if (!dueDate.isValid()) return "GREEN";
              const daysToDeadline = dueDate.diff(currentDate, "days");
              return daysToDeadline > 2
                ? "GREEN"
                : daysToDeadline >= 0
                  ? "ORANGE"
                  : "RED";
            })();

            
            
            
            const isFirstJobOnDate = (state.dailyUsedHours[dateStr] || 0) === 0;
            const lastJobOnDate = state.lastJobByDate[dateStr];
            const needsChangeover =
              !isFirstJobOnDate &&
              lastJobOnDate &&
              lastJobOnDate !== job._id.toString() &&
              state.changeoverTime > 0;
            
            
            let jobSetupApplied = false;

            for (const tier of shiftTiers) {
              if (remaining <= 0) break;

              const tierCapacity = tier.end - tier.start;
              if (tierCapacity <= 0) continue; 

              const currentUsed = state.dailyUsedHours[dateStr] || 0;
              if (currentUsed >= tier.end) continue; 

              
              
              if (
                !jobSetupApplied &&
                needsChangeover &&
                tier.shift !== "Morning"
              )
                continue;

              const usedInTier = Math.max(0, currentUsed - tier.start);
              const availableInTier = tierCapacity - usedInTier;

              
              
              
              
              const effectiveSetup = (() => {
                if (tier.shift !== "Morning") return 0;
                if (usedInTier === 0) return state.setupTime; 
                if (!jobSetupApplied && needsChangeover)
                  return state.changeoverTime;
                return 0;
              })();

              if (
                availableInTier <= effectiveSetup ||
                state.effectiveRunRate <= 0
              )
                continue;

              const workHrs = availableInTier - effectiveSetup;
              const qtyPossible = Math.floor(workHrs * state.effectiveRunRate);
              if (qtyPossible <= 0) continue;

              const qtyToSchedule = Math.min(remaining, qtyPossible);
              const actualWorkHrs = qtyToSchedule / state.effectiveRunRate;
              const scheduledHrs = actualWorkHrs + effectiveSetup;

              
              const blockStartOffset = Math.max(currentUsed, tier.start);
              const startTime = addHoursToTime(
                machineShiftStart,
                blockStartOffset,
              );
              const endTime = addHoursToTime(
                machineShiftStart,
                blockStartOffset + scheduledHrs,
              );

              const startMoment = currentDate.clone().set({
                hour: parseInt(startTime.split(":")[0]),
                minute: parseInt(startTime.split(":")[1]),
              });
              const endMoment = currentDate.clone().set({
                hour: parseInt(endTime.split(":")[0]),
                minute: parseInt(endTime.split(":")[1]),
              });

              blocks.push({
                machineId: selectedMachine._id,
                date: currentDate.toDate(),
                shift: tier.shift,
                startTime,
                endTime,
                jobOrderId: job._id,
                jobCardNo: job.joNo,
                process: processType,
                scheduledHours: scheduledHrs,
                setupTime: effectiveSetup,
                runTime: scheduledHrs - effectiveSetup,
                scheduledQty: qtyToSchedule,
                dailyTarget: Math.round(qtyToSchedule),
                isOvertime: tier.isOT,
                overtimeNeeded: tier.isOT,
                overtimeHours: tier.isOT ? scheduledHrs : 0,
                deliveryFeasible,
                status: tier.isOT ? "Pending Approval" : "Scheduled",
                plannedStart: startMoment.toDate(),
                plannedEnd: endMoment.toDate(),
              });

              state.dailyUsedHours[dateStr] =
                (state.dailyUsedHours[dateStr] || 0) + scheduledHrs;
              remaining -= qtyToSchedule;

              
              
              if (effectiveSetup > 0) jobSetupApplied = true;
              state.lastJobByDate[dateStr] = job._id.toString();
            }
          }

          if (remaining > 0) {
            currentDate.add(1, "days");
          }
        }

        previousStageMinStart = currentDate.clone();
        previousProcess = processType;

        calendarEntries.push(...blocks);
      }
    }

    if (calendarEntries.length > 0) {
      await ProductionCalendar.insertMany(calendarEntries);
    }

    res.status(200).json({
      success: true,
      message: `Generated ${calendarEntries.length} calendar blocks.`,
      count: calendarEntries.length,
    });
  } catch (error) {
    console.error("Planning Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const getProductionCalendar = async (req, res) => {
  try {
    const { startDate, endDate, machineId } = req.query;
    let query = {};

    if (startDate && endDate) {
      query.date = {
        $gte: moment(startDate).startOf("day").toDate(),
        $lte: moment(endDate).endOf("day").toDate(),
      };
    }

    if (machineId) {
      query.machineId = machineId;
    }

    const calendar = await ProductionCalendar.find(query)
      .populate(
        "machineId",
        "name type setupTimeDefault practicalRunRate efficiencyFactor standardShiftHours",
      )
      .populate("jobOrderId", "joNo itemName companyName shiftHistory")
      .sort({ date: 1, startTime: 1 });

    res.status(200).json(calendar);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const planJob = async (req, res) => {
  try {
    const { jobOrderId, assignments, startDate } = req.body;

    if (
      !jobOrderId ||
      !Array.isArray(assignments) ||
      assignments.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "jobOrderId and assignments required",
      });
    }

    const job = await JobOrder.findById(jobOrderId);
    if (!job)
      return res
        .status(404)
        .json({ success: false, message: "Job order not found" });

    const machineIds = assignments.map((a) => a.machineId).filter(Boolean);
    const machines = await MachineMaster.find({ _id: { $in: machineIds } });
    const machineMap = {};
    machines.forEach((m) => {
      machineMap[m._id.toString()] = m;
    });

    const DAY_NAMES = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];

    const entries = [];
    let processStart = moment(startDate || new Date()).startOf("day");

    for (const { process, machineId } of assignments) {
      if (!machineId) continue;
      const machine = machineMap[machineId.toString()];
      if (!machine || !machine.practicalRunRate) continue;

      const shiftHrs = machine.standardShiftHours || 8; 
      const otCapHours = machine.overtimeAllowed
        ? machine.maxOvertimeHours || 3
        : 0; 
      const numShifts = machine.maxShiftsAllowed || 1;
      const nightShiftHours = numShifts >= 2 ? shiftHrs : 0; 

      const machineShiftStart = machine.shiftStartTime || "09:00";
      const machineShiftEnd = machine.shiftEndTime || "17:30";

      const setupTime =
        machine.setupTimeDefault !== undefined ? machine.setupTimeDefault : 0.5;
      const runRate =
        (machine.practicalRunRate || 1000) * (machine.efficiencyFactor || 0.95);

      const workingDays = machine.workingDays?.length
        ? machine.workingDays
        : ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const weeklyOff = machine.weeklyOff?.length
        ? machine.weeklyOff
        : ["Sunday"];

      
      const existingEntries = await ProductionCalendar.find({
        machineId: { $in: machineIds },
        date: { $gte: processStart.toDate() },
        jobOrderId: { $ne: jobOrderId },
      });

      const machineUsage = {};
      existingEntries.forEach((e) => {
        const d = moment(e.date).format("YYYY-MM-DD");
        const mId = e.machineId.toString();
        if (!machineUsage[mId]) machineUsage[mId] = {};
        machineUsage[mId][d] =
          (machineUsage[mId][d] || 0) + (e.scheduledHours || 0);
      });

      let remaining = job.orderQty;
      let current = moment(processStart);
      let lastDay = null;
      let safety = 0;

      while (remaining > 0 && safety < 90) {
        safety++;
        const dayName = DAY_NAMES[current.day()];

        if (workingDays.includes(dayName) && !weeklyOff.includes(dayName)) {
          const dateStr = current.format("YYYY-MM-DD");
          const mIdStr = machineId.toString();

          
          const usedAlready = (machineUsage[mIdStr] || {})[dateStr] || 0;
          const dayAvailable = Math.max(0, shiftHrs - usedAlready);

          if (dayAvailable > setupTime && runRate > 0) {
            const qtyPossible = (dayAvailable - setupTime) * runRate;
            const normalQty = Math.min(remaining, qtyPossible);
            if (normalQty > 0) {
              const normalScheduledHours = normalQty / runRate + setupTime;
              remaining -= normalQty;

              if (!machineUsage[mIdStr]) machineUsage[mIdStr] = {};
              machineUsage[mIdStr][dateStr] =
                usedAlready + normalScheduledHours;

              entries.push({
                machineId: machine._id,
                date: current.toDate(),
                shift: "Morning",
                startTime: machineShiftStart,
                endTime: machineShiftEnd,
                jobOrderId: job._id,
                jobCardNo: job.joNo,
                process,
                scheduledHours: normalScheduledHours,
                setupTime: setupTime,
                runTime: normalScheduledHours - setupTime,
                scheduledQty: normalQty,
                isOvertime: false,
                status: "Scheduled",
                plannedStart: current.toDate(),
                plannedEnd: current.clone().endOf("day").toDate(),
              });
            }
          }

          
          if (remaining > 0 && otCapHours > 0 && runRate > 0) {
            const usedAfterDay = (machineUsage[mIdStr] || {})[dateStr] || 0;
            const otAvailable = Math.max(
              0,
              shiftHrs + otCapHours - usedAfterDay,
            );

            if (otAvailable > 0) {
              const qtyPossibleOT = otAvailable * runRate;
              const otQty = Math.min(remaining, qtyPossibleOT);

              if (otQty > 0) {
                remaining -= otQty;
                const otScheduledHours = otQty / runRate;

                if (!machineUsage[mIdStr]) machineUsage[mIdStr] = {};
                machineUsage[mIdStr][dateStr] = usedAfterDay + otScheduledHours;

                const otStartTime = machineShiftEnd; 
                const otEndTime = addHoursToTime(otStartTime, otScheduledHours);

                entries.push({
                  machineId: machine._id,
                  date: current.toDate(),
                  shift: "OT",
                  startTime: otStartTime,
                  endTime: otEndTime,
                  jobOrderId: job._id,
                  jobCardNo: job.joNo,
                  process,
                  scheduledHours: otScheduledHours,
                  setupTime: 0,
                  runTime: otScheduledHours,
                  scheduledQty: otQty,
                  isOvertime: true,
                  overtimeNeeded: true,
                  overtimeHours: otScheduledHours,
                  status: "Pending Approval",
                  plannedStart: current.toDate(),
                  plannedEnd: current.clone().endOf("day").toDate(),
                });
              }
            }
          }

          
          if (remaining > 0 && nightShiftHours > 0 && runRate > 0) {
            const usedAfterOT = (machineUsage[mIdStr] || {})[dateStr] || 0;
            const nightAvailable = Math.max(
              0,
              shiftHrs + otCapHours + nightShiftHours - usedAfterOT,
            );

            if (nightAvailable > 0) {
              const qtyPossibleNight = nightAvailable * runRate;
              const nightQty = Math.min(remaining, qtyPossibleNight);

              if (nightQty > 0) {
                remaining -= nightQty;
                const nightScheduledHours = nightQty / runRate;

                if (!machineUsage[mIdStr]) machineUsage[mIdStr] = {};
                machineUsage[mIdStr][dateStr] =
                  usedAfterOT + nightScheduledHours;

                
                const nightStartTime = addHoursToTime(
                  machineShiftEnd,
                  otCapHours,
                );
                const nightEndTime = addHoursToTime(
                  nightStartTime,
                  nightScheduledHours,
                );

                entries.push({
                  machineId: machine._id,
                  date: current.toDate(),
                  shift: "Night",
                  startTime: nightStartTime,
                  endTime: nightEndTime,
                  jobOrderId: job._id,
                  jobCardNo: job.joNo,
                  process,
                  scheduledHours: nightScheduledHours,
                  setupTime: 0,
                  runTime: nightScheduledHours,
                  scheduledQty: nightQty,
                  isOvertime: true,
                  overtimeNeeded: true,
                  overtimeHours: nightScheduledHours,
                  status: "Pending Approval",
                  plannedStart: current.toDate(),
                  plannedEnd: current.clone().endOf("day").toDate(),
                });
              }
            }
          }

          lastDay = current.clone();
        }

        current.add(1, "day");
      }

      if (lastDay) processStart = lastDay.clone().add(1, "day");
    }

    await ProductionCalendar.deleteMany({
      jobOrderId: job._id,
      locked: { $ne: true },
    });

    if (entries.length > 0) {
      await ProductionCalendar.insertMany(entries);
    }

    res.json({
      success: true,
      message: `Planned ${entries.length} entries for ${job.joNo}`,
      count: entries.length,
    });
  } catch (error) {
    console.error("planJob error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const recalcJobCalendar = async (jobId) => {
  const job = await JobOrder.findById(jobId);
  if (!job || ["Completed", "Cancelled"].includes(job.status)) return 0;
  if (!job.process || job.process.length === 0) return 0;

  const machines = await MachineMaster.find({ status: "Active" });
  const today = moment().startOf("day");

  await ProductionCalendar.deleteMany({
    jobOrderId: job._id,
    date: { $gte: today.toDate() },
    locked: { $ne: true },
  });

  // Pre-load holidays for next 180 days to skip during scheduling
  const horizonEnd = today.clone().add(180, "days").toDate();
  const holidaySet = await getHolidaySet(today.toDate(), horizonEnd);

  // Seed machine usage from other jobs already in the calendar
  const machineIds = machines.map((m) => m._id);
  const existing = await ProductionCalendar.find({
    machineId: { $in: machineIds },
    date: { $gte: today.toDate() },
    jobOrderId: { $ne: job._id },
  });
  const existingUsage = {};
  existing.forEach((e) => {
    const mId = e.machineId.toString();
    const d = moment(e.date).format("YYYY-MM-DD");
    if (!existingUsage[mId]) existingUsage[mId] = {};
    existingUsage[mId][d] = (existingUsage[mId][d] || 0) + (e.scheduledHours || 0);
  });

  const machineStateMap = {};
  machines.forEach((m) => {
    const shiftHrs = m.standardShiftHours || 8;
    const otHours = m.overtimeAllowed ? m.maxOvertimeHours || 3 : 0;
    const numShifts = m.maxShiftsAllowed || 1;
    const nightShiftHours = numShifts >= 2 ? shiftHrs : 0;
    const workingDays = m.workingDays?.length
      ? m.workingDays
      : ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const weeklyOff = m.weeklyOff?.length ? m.weeklyOff : ["Sunday"];
    machineStateMap[m._id.toString()] = {
      machine: m,
      shiftHrs,
      otHours,
      nightShiftHours,
      setupTime: m.setupTimeDefault !== undefined ? m.setupTimeDefault : 0.5,
      changeoverTime: m.changeoverTimeDefault || 0,
      workingDays,
      weeklyOff,
      effectiveRunRate: (m.practicalRunRate || 1000) * (m.efficiencyFactor || 0.95),
      dailyUsedHours: { ...(existingUsage[m._id.toString()] || {}) },
      lastJobByDate: {},
    };
  });

  const orderQty = job.orderQty || 0;
  const noOfSheets = job.noOfSheets || orderQty;
  const calendarEntries = [];
  let previousStageMinStart = today.clone();
  let previousProcess = null;

  for (const processType of job.process) {
    const compatibleMachines = machines.filter((m) => m.type === processType);
    if (compatibleMachines.length === 0) {
      previousProcess = processType;
      continue;
    }

    let selectedMachine = compatibleMachines[0];
    if (job.machineAssignments?.get(processType)) {
      const assignedId = job.machineAssignments.get(processType);
      const found = compatibleMachines.find((m) => m._id.toString() === assignedId);
      if (found) selectedMachine = found;
    }

    let stageQty = orderQty;
    if (
      processType.includes("Printing") ||
      processType.includes("Die Cut") ||
      processType === "Varnish" ||
      processType === "Sheet Cutting"
    ) {
      stageQty = noOfSheets;
    }

    const alreadyDone = job.stageQtyMap?.get(processType) || 0;
    let remaining = Math.max(0, stageQty - alreadyDone);

    if (remaining === 0) {
      previousStageMinStart = today.clone();
      previousProcess = processType;
      continue;
    }

    let bufferDays = 0;
    if (previousProcess === "Printing" && processType.includes("Die Cut")) bufferDays = 1;
    if (previousProcess?.includes("Die Cut") && processType === "Formation") bufferDays = 2;

    const state = machineStateMap[selectedMachine._id.toString()];
    let currentDate = previousStageMinStart.clone().add(bufferDays, "days");
    let blocks = [];
    let safety = 0;

    const shiftTiers = [
      { shift: "Morning", start: 0, end: state.shiftHrs, isOT: false },
      { shift: "OT", start: state.shiftHrs, end: state.shiftHrs + state.otHours, isOT: true },
      { shift: "Night", start: state.shiftHrs + state.otHours, end: state.shiftHrs + state.otHours + state.nightShiftHours, isOT: true },
    ];

    while (remaining > 0 && safety++ < 300) {
      const dateStr = currentDate.format("YYYY-MM-DD");
      const dayName = currentDate.format("dddd");

      if (
        state.workingDays.includes(dayName) &&
        !state.weeklyOff.includes(dayName) &&
        !holidaySet.has(dateStr)
      ) {
        const machineShiftStart = selectedMachine.shiftStartTime || "09:00";
        const dueDate = moment(job.internalDueDate || job.deliveryDate);
        const daysToDeadline = dueDate.isValid() ? dueDate.diff(currentDate, "days") : 999;
        const deliveryFeasible =
          daysToDeadline > 2 ? "GREEN" : daysToDeadline >= 0 ? "ORANGE" : "RED";

        const isFirstJobOnDate = (state.dailyUsedHours[dateStr] || 0) === 0;
        const lastJobOnDate = state.lastJobByDate[dateStr];
        const needsChangeover =
          !isFirstJobOnDate &&
          lastJobOnDate &&
          lastJobOnDate !== job._id.toString() &&
          state.changeoverTime > 0;
        let jobSetupApplied = false;

        for (const tier of shiftTiers) {
          if (remaining <= 0) break;
          const tierCapacity = tier.end - tier.start;
          if (tierCapacity <= 0) continue;
          const currentUsed = state.dailyUsedHours[dateStr] || 0;
          if (currentUsed >= tier.end) continue;
          if (!jobSetupApplied && needsChangeover && tier.shift !== "Morning") continue;

          const usedInTier = Math.max(0, currentUsed - tier.start);
          const availableInTier = tierCapacity - usedInTier;
          const effectiveSetup = (() => {
            if (tier.shift !== "Morning") return 0;
            if (usedInTier === 0) return state.setupTime;
            if (!jobSetupApplied && needsChangeover) return state.changeoverTime;
            return 0;
          })();

          if (availableInTier <= effectiveSetup || state.effectiveRunRate <= 0) continue;

          const workHrs = availableInTier - effectiveSetup;
          const qtyPossible = Math.floor(workHrs * state.effectiveRunRate);
          if (qtyPossible <= 0) continue;

          const qtyToSchedule = Math.min(remaining, qtyPossible);
          const scheduledHrs = qtyToSchedule / state.effectiveRunRate + effectiveSetup;
          const blockStartOffset = Math.max(currentUsed, tier.start);
          const startTime = addHoursToTime(machineShiftStart, blockStartOffset);
          const endTime = addHoursToTime(machineShiftStart, blockStartOffset + scheduledHrs);

          blocks.push({
            machineId: selectedMachine._id,
            date: currentDate.toDate(),
            shift: tier.shift,
            startTime,
            endTime,
            jobOrderId: job._id,
            jobCardNo: job.joNo,
            process: processType,
            scheduledHours: scheduledHrs,
            setupTime: effectiveSetup,
            runTime: scheduledHrs - effectiveSetup,
            scheduledQty: qtyToSchedule,
            dailyTarget: Math.round(qtyToSchedule),
            isOvertime: tier.isOT,
            overtimeNeeded: tier.isOT,
            overtimeHours: tier.isOT ? scheduledHrs : 0,
            deliveryFeasible,
            status: tier.isOT ? "Pending Approval" : "Scheduled",
            plannedStart: currentDate.clone().set({
              hour: parseInt(startTime.split(":")[0]),
              minute: parseInt(startTime.split(":")[1]),
            }).toDate(),
            plannedEnd: currentDate.clone().set({
              hour: parseInt(endTime.split(":")[0]),
              minute: parseInt(endTime.split(":")[1]),
            }).toDate(),
          });

          state.dailyUsedHours[dateStr] = (state.dailyUsedHours[dateStr] || 0) + scheduledHrs;
          remaining -= qtyToSchedule;
          if (effectiveSetup > 0) jobSetupApplied = true;
          state.lastJobByDate[dateStr] = job._id.toString();
        }
      }

      if (remaining > 0) currentDate.add(1, "days");
    }

    previousStageMinStart = currentDate.clone();
    previousProcess = processType;
    calendarEntries.push(...blocks);
  }

  if (calendarEntries.length > 0) {
    await ProductionCalendar.insertMany(calendarEntries);
  }
  return calendarEntries.length;
};

const cascadeAffectedJobs = async (triggerJobId) => {
  const today = moment().startOf("day").toDate();

  // Which machines does the trigger job occupy going forward?
  const affectedMachineIds = await ProductionCalendar.find({
    jobOrderId: triggerJobId,
    date: { $gte: today },
  }).distinct("machineId");

  if (affectedMachineIds.length === 0) return;

  // All other non-locked future entries on those machines
  const conflicting = await ProductionCalendar.find({
    machineId: { $in: affectedMachineIds },
    jobOrderId: { $ne: triggerJobId },
    date: { $gte: today },
    locked: { $ne: true },
  }).populate("jobOrderId", "deliveryDate status");

  // Deduplicate jobs and sort earliest delivery date first
  const seen = new Set();
  const affectedJobs = [];
  conflicting.forEach((e) => {
    const jo = e.jobOrderId;
    if (!jo || ["Completed", "Cancelled"].includes(jo.status)) return;
    const id = jo._id.toString();
    if (seen.has(id)) return;
    seen.add(id);
    affectedJobs.push({ jobId: jo._id, deliveryDate: jo.deliveryDate });
  });

  affectedJobs.sort((a, b) =>
    moment(a.deliveryDate).diff(moment(b.deliveryDate))
  );

  // Re-plan each affected job in priority order. Each call seeds from the
  // current DB state so jobs cascade forward naturally.
  for (const { jobId } of affectedJobs) {
    await recalcJobCalendar(jobId);
  }
};

const shiftEntry = async (req, res) => {
  try {
    const { entryId, reason } = req.body;
    if (!entryId) {
      return res.status(400).json({ success: false, message: "entryId required" });
    }

    const entry = await ProductionCalendar.findById(entryId).populate(
      "machineId",
      "workingDays weeklyOff"
    );
    if (!entry) {
      return res.status(404).json({ success: false, message: "Entry not found" });
    }
    if (entry.locked) {
      return res.status(400).json({ success: false, message: "Entry is locked and cannot be shifted" });
    }

    const workingDays = entry.machineId?.workingDays?.length
      ? entry.machineId.workingDays
      : ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const weeklyOff = entry.machineId?.weeklyOff?.length
      ? entry.machineId.weeklyOff
      : ["Sunday"];

    // Find the next working day from today (not just +1 from entry date)
    const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    let nextDate = moment().startOf("day");
    // If entry is already in the future, shift from next day after its date
    if (moment(entry.date).isSameOrAfter(moment().startOf("day"))) {
      nextDate = moment(entry.date).add(1, "days");
    }
    let safety = 0;
    while (safety++ < 14) {
      const dayName = DAY_NAMES[nextDate.day()];
      if (workingDays.includes(dayName) && !weeklyOff.includes(dayName)) break;
      nextDate.add(1, "days");
    }

    // Fetch job for history + deliveryFeasible
    const job = await JobOrder.findById(entry.jobOrderId);
    const dueDate = moment(job?.internalDueDate || job?.deliveryDate);
    const daysToDeadline = dueDate.isValid() ? dueDate.diff(nextDate, "days") : 999;
    const deliveryFeasible =
      daysToDeadline > 2 ? "GREEN" : daysToDeadline >= 0 ? "ORANGE" : "RED";

    const fromDate = entry.date;
    const shiftReasonCode = reason || "Manual";

    // Record shift history on this calendar entry
    entry.shiftHistory = entry.shiftHistory || [];
    entry.shiftHistory.push({
      fromDate,
      toDate: nextDate.toDate(),
      reason: shiftReasonCode,
      shiftedAt: new Date(),
    });
    entry.shiftCount = (entry.shiftCount || 0) + 1;

    // Mark entry as Rescheduled and record reason
    entry.status = "Rescheduled";
    entry.rescheduleReasonCode = shiftReasonCode;
    await entry.save();

    // Record shift in the JobOrder's shiftHistory for job-level tracking
    if (job) {
      job.shiftHistory = job.shiftHistory || [];
      job.shiftHistory.push({
        fromDate,
        process: entry.process,
        reason: shiftReasonCode,
        shiftedAt: new Date(),
      });
      await job.save();
    }

    // Recalculate the full calendar for this job from today — cascades all stages
    await recalcJobCalendar(entry.jobOrderId.toString());

    // Get total shift count for this job across all entries
    const totalShifts = job ? job.shiftHistory.length : 1;

    res.json({
      success: true,
      message: `Shifted to ${nextDate.format("DD MMM YYYY")} (shifted ${totalShifts} time${totalShifts !== 1 ? "s" : ""} total)`,
      newDate: nextDate.format("YYYY-MM-DD"),
      deliveryFeasible,
      totalShifts,
    });
  } catch (error) {
    console.error("shiftEntry error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const shiftMissed = async (req, res) => {
  try {
    const today = moment().startOf("day").toDate();

    // Find distinct jobOrderIds for past entries that weren't completed
    const missedEntries = await ProductionCalendar.find({
      date: { $lt: today },
      status: { $nin: ["Completed", "Cancelled", "Rescheduled"] },
      locked: { $ne: true },
    }).select("jobOrderId");

    const affectedJobIds = [
      ...new Set(missedEntries.map((e) => e.jobOrderId.toString())),
    ];

    if (affectedJobIds.length === 0) {
      return res.json({
        success: true,
        message: "No missed entries found",
        affectedJobs: 0,
        newEntries: 0,
      });
    }

    // Mark past missed entries as Rescheduled (keep history)
    await ProductionCalendar.updateMany(
      {
        date: { $lt: today },
        status: { $nin: ["Completed", "Cancelled", "Rescheduled"] },
        locked: { $ne: true },
      },
      { $set: { status: "Rescheduled" } }
    );

    // Recalculate calendar for each affected job from today
    let totalNew = 0;
    for (const jobId of affectedJobIds) {
      const count = await recalcJobCalendar(jobId);
      totalNew += count;
    }

    res.json({
      success: true,
      message: `Shifted ${affectedJobIds.length} job(s) forward — ${totalNew} new entries created`,
      affectedJobs: affectedJobIds.length,
      newEntries: totalNew,
    });
  } catch (error) {
    console.error("shiftMissed error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const approveRush = async (req, res) => {
  try {
    const { jobOrderId, approvedBy } = req.body;
    if (!jobOrderId) {
      return res.status(400).json({ success: false, message: "jobOrderId required" });
    }

    const job = await JobOrder.findById(jobOrderId);
    if (!job) return res.status(404).json({ success: false, message: "Job not found" });
    if (!["Rush", "Critical"].includes(job.orderPriorityOverride)) {
      return res.status(400).json({ success: false, message: "Job is not Rush or Critical priority" });
    }

    // Mark as rush-approved
    job.rushApproved = true;
    job.rushApprovedBy = approvedBy || null;
    job.rushApprovedAt = new Date();
    await job.save();

    // Recalc this job first (it starts from today, no dependencies changed)
    await recalcJobCalendar(jobOrderId);

    // Then cascade all other jobs that share machines with this rush job
    await cascadeAffectedJobs(jobOrderId);

    res.json({
      success: true,
      message: `Rush order ${job.joNo} approved — jobs cascaded forward`,
      joNo: job.joNo,
    });
  } catch (error) {
    console.error("approveRush error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const setupPreventiveMaintenance = async (req, res) => {
  try {
    // Generate PM windows for the next 6 months: 2h on the 2nd Saturday of each month
    const machines = await MachineMaster.find({ status: "Active" });
    if (machines.length === 0) {
      return res.json({ success: true, message: "No active machines found", created: 0 });
    }

    const today = moment().startOf("day");
    const hoursBlocked = 2;
    const records = [];

    for (let m = 0; m < 6; m++) {
      const monthStart = today.clone().add(m, "months").startOf("month");
      // Find the 2nd Saturday of this month
      let satCount = 0;
      let secondSat = null;
      for (let d = 0; d < 31; d++) {
        const day = monthStart.clone().add(d, "days");
        if (day.month() !== monthStart.month()) break;
        if (day.day() === 6) { // Saturday
          satCount++;
          if (satCount === 2) {
            secondSat = day;
            break;
          }
        }
      }
      if (!secondSat) continue;

      // PM window: 08:00 – 10:00 (2 hours before shift starts)
      const startDT = secondSat.clone().set({ hour: 8, minute: 0, second: 0 }).toDate();
      const endDT = secondSat.clone().set({ hour: 10, minute: 0, second: 0 }).toDate();

      for (const machine of machines) {
        // Skip if already exists
        const exists = await MachineMaintenance.findOne({
          machineId: machine._id,
          startDateTime: startDT,
        });
        if (!exists) {
          records.push({
            machineId: machine._id,
            startDateTime: startDT,
            endDateTime: endDT,
            type: "PM Inspection",
            reason: "Auto-scheduled 2nd Saturday preventive maintenance",
            hoursBlocked,
          });
        }
      }
    }

    if (records.length > 0) {
      await MachineMaintenance.insertMany(records);
    }

    res.json({
      success: true,
      message: `Created ${records.length} PM windows across ${machines.length} machines for next 6 months`,
      created: records.length,
    });
  } catch (error) {
    console.error("setupPreventiveMaintenance error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  generateProductionCalendar,
  getProductionCalendar,
  planJob,
  recalcJobCalendar,
  cascadeAffectedJobs,
  shiftEntry,
  shiftMissed,
  approveRush,
  setupPreventiveMaintenance,
};
