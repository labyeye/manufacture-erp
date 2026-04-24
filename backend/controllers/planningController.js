const JobOrder = require("../models/JobOrder");
const MachineMaster = require("../models/MachineMaster");
const ProductionCalendar = require("../models/ProductionCalendar");
const CompanyMaster = require("../models/CompanyMaster");
const moment = require("moment");

// Shifts: Morning 09:00–17:30 (8 hrs effective), OT 17:30–20:30 (3 hrs), Night 17:30–01:30 (8 hrs)
// OT and Night both start at shiftEndTime; when both are used Night starts after OT.

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
      const shiftHrs = m.standardShiftHours || 8;          // Morning: 09:00–17:30 (8 effective hrs)
      const otHours = m.overtimeAllowed ? (m.maxOvertimeHours || 3) : 0; // OT: 17:30–20:30
      const numShifts = m.maxShiftsAllowed || 1;
      const nightShiftHours = numShifts >= 2 ? shiftHrs : 0; // Night: 17:30–01:30 (8 hrs)
      const efficiency = m.efficiencyFactor || 0.85;
      const runRate = m.practicalRunRate || 1000;

      const effectiveRunRate = runRate * efficiency;
      // Total daily capacity: Morning + OT + Night
      const dailyCapHours = shiftHrs + otHours + nightShiftHours;

      const workingDays = m.workingDays?.length
        ? m.workingDays
        : ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const weeklyOff = m.weeklyOff?.length ? m.weeklyOff : ["Sunday"];

      machineState[m._id.toString()] = {
        machine: m,
        dailyCapHours,
        setupTime: m.setupTimeDefault !== undefined ? m.setupTimeDefault : 0.5,
        workingDays,
        weeklyOff,
        shiftHrs,
        otHours,
        nightShiftHours,
        effectiveRunRate,
        dailyUsedHours: {},
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

        let remaining = stageQty;
        let blocks = [];
        let safety = 0;

        // Shift tiers in order: Morning → OT → Night
        // Each tier is defined as [startHrOffset, endHrOffset] from shiftStart (09:00)
        // When OT and Night are both used, Night starts after OT ends (not at 17:30)
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
            const machineShiftStart =
              selectedMachine.shiftStartTime || "09:00";

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

            for (const tier of shiftTiers) {
              if (remaining <= 0) break;

              const tierCapacity = tier.end - tier.start;
              if (tierCapacity <= 0) continue; // tier not enabled on this machine

              const currentUsed = state.dailyUsedHours[dateStr] || 0;
              if (currentUsed >= tier.end) continue; // already consumed past this tier

              const usedInTier = Math.max(0, currentUsed - tier.start);
              const availableInTier = tierCapacity - usedInTier;

              // Setup time only at the very start of the Morning shift
              const effectiveSetup =
                tier.shift === "Morning" && usedInTier === 0
                  ? state.setupTime
                  : 0;

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

              // Wall clock times: offset from shiftStartTime (09:00)
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
      .populate("machineId", "name type setupTimeDefault practicalRunRate efficiencyFactor standardShiftHours")
      .populate("jobOrderId", "joNo itemName companyName")
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

      const shiftHrs = machine.standardShiftHours || 8;   // Morning: 8 effective hrs
      const otCapHours = machine.overtimeAllowed ? (machine.maxOvertimeHours || 3) : 0; // OT: 3 hrs
      const numShifts = machine.maxShiftsAllowed || 1;
      const nightShiftHours = numShifts >= 2 ? shiftHrs : 0; // Night: 8 hrs

      const machineShiftStart = machine.shiftStartTime || "09:00";
      const machineShiftEnd = machine.shiftEndTime || "17:30";

      const setupTime =
        machine.setupTimeDefault !== undefined ? machine.setupTimeDefault : 0.5;
      const runRate =
        (machine.practicalRunRate || 1000) * (machine.efficiencyFactor || 0.85);

      const workingDays = machine.workingDays?.length
        ? machine.workingDays
        : ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const weeklyOff = machine.weeklyOff?.length
        ? machine.weeklyOff
        : ["Sunday"];

      // Get existing usage for these machines to avoid overbooking
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

          // --- MORNING SHIFT ---
          const usedAlready =
            (machineUsage[mIdStr] || {})[dateStr] || 0;
          const dayAvailable = Math.max(0, shiftHrs - usedAlready);

          if (dayAvailable > setupTime && runRate > 0) {
            const qtyPossible = (dayAvailable - setupTime) * runRate;
            const normalQty = Math.min(remaining, qtyPossible);
            if (normalQty > 0) {
              const normalScheduledHours = normalQty / runRate + setupTime;
              remaining -= normalQty;

              if (!machineUsage[mIdStr]) machineUsage[mIdStr] = {};
              machineUsage[mIdStr][dateStr] = usedAlready + normalScheduledHours;

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

          // --- OT SHIFT (17:30–20:30, 3 hrs) ---
          if (remaining > 0 && otCapHours > 0 && runRate > 0) {
            const usedAfterDay =
              (machineUsage[mIdStr] || {})[dateStr] || 0;
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
                machineUsage[mIdStr][dateStr] =
                  usedAfterDay + otScheduledHours;

                const otStartTime = machineShiftEnd; // 17:30
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

          // --- NIGHT SHIFT (starts after OT if OT used, else at 17:30; runs 8 hrs → 01:30) ---
          if (remaining > 0 && nightShiftHours > 0 && runRate > 0) {
            const usedAfterOT =
              (machineUsage[mIdStr] || {})[dateStr] || 0;
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

                // Night starts at shiftEnd + OT hours (after OT) or at shiftEnd if no OT
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

module.exports = {
  generateProductionCalendar,
  getProductionCalendar,
  planJob,
};
