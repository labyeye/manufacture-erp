const JobOrder = require("../models/JobOrder");
const MachineMaster = require("../models/MachineMaster");
const ProductionCalendar = require("../models/ProductionCalendar");
const CompanyMaster = require("../models/CompanyMaster");
const moment = require("moment");

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
      const numShifts = m.maxShiftsAllowed || 1;
      const efficiency = m.efficiencyFactor || 0.85;
      const runRate = m.practicalRunRate || 1000;
      
      const effectiveRunRate = runRate * efficiency;
      const dailyCap = effectiveRunRate * shiftHrs * numShifts;
      const dailyCapHours = shiftHrs * numShifts;

      const workingDays = m.workingDays?.length
        ? m.workingDays
        : ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const weeklyOff = m.weeklyOff?.length ? m.weeklyOff : ["Sunday"];

      machineState[m._id.toString()] = {
        machine: m,
        dailyCap,
        dailyCapHours,
        setupTime: m.setupTimeDefault !== undefined ? m.setupTimeDefault : 0.5,
        workingDays,
        weeklyOff,
        shiftHrs,
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

        while (remaining > 0 && safety++ < 300) {
          const dateStr = currentDate.format("YYYY-MM-DD");
          const dayName = currentDate.format("dddd");

          if (
            state.workingDays.includes(dayName) &&
            !state.weeklyOff.includes(dayName)
          ) {
            const usedHoursToday = state.dailyUsedHours[dateStr] || 0;
            const availableHoursToday = state.dailyCapHours - usedHoursToday;
            const setupTime = state.setupTime;

            if (availableHoursToday > setupTime) {
              const runRate = state.effectiveRunRate;
              if (runRate > 0) {
                const availableWorkHours = availableHoursToday - setupTime;
                const qtyPossible = Math.floor(availableWorkHours * runRate);
                
                if (qtyPossible <= 0) {
                   // Not enough time left for even 1 unit after setup
                   currentDate.add(1, "days");
                   continue;
                }

                const qtyToSchedule = Math.min(remaining, qtyPossible);

                let deliveryFeasible = "GREEN";
                const dueDate = moment(job.internalDueDate || job.deliveryDate);
                if (dueDate.isValid()) {
                  const daysToDeadline = dueDate.diff(currentDate, "days");
                  deliveryFeasible =
                    daysToDeadline > 2
                      ? "GREEN"
                      : daysToDeadline >= 0
                        ? "ORANGE"
                        : "RED";
                }

                const actualWorkHours = qtyToSchedule / runRate;
                const totalHoursToBook = actualWorkHours + setupTime;
                
                // Final safety check to avoid exceeding dailyCapHours due to float precision
                const finalHours = Math.min(totalHoursToBook, availableHoursToday);
                const scheduledHours = finalHours;

                const startMoment = currentDate
                  .clone()
                  .set({
                    hour: parseInt(
                      (selectedMachine.shiftStartTime || "08:00").split(":")[0],
                    ),
                    minute: 0,
                  })
                  .add(usedHoursToday, "hours");
                const endMoment = startMoment
                  .clone()
                  .add(scheduledHours, "hours");

                blocks.push({
                  machineId: selectedMachine._id,
                  date: currentDate.toDate(),
                  shift: usedHoursToday + scheduledHours > state.shiftHrs ? "Night" : "Day",
                  startTime: startMoment.format("HH:mm"),
                  endTime: endMoment.format("HH:mm"),
                  jobOrderId: job._id,
                  jobCardNo: job.joNo,
                  process: processType,
                  scheduledHours: scheduledHours,
                  scheduledQty: qtyToSchedule,
                  dailyTarget: Math.round(qtyToSchedule),
                  isOvertime: usedHoursToday + scheduledHours > state.shiftHrs,
                  overtimeNeeded: usedHoursToday + scheduledHours > state.shiftHrs,
                  overtimeHours: Math.max(0, (usedHoursToday + scheduledHours) - state.shiftHrs),
                  deliveryFeasible,
                  status: "Scheduled",
                  plannedStart: startMoment.toDate(),
                  plannedEnd: endMoment.toDate(),
                });

                state.dailyUsedHours[dateStr] =
                  usedHoursToday + scheduledHours;
                remaining -= qtyToSchedule;
              }
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
      .populate("machineId", "name type")
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

      const shiftHrs = machine.standardShiftHours || 8;
      const numShifts = machine.maxShiftsAllowed || 1;
      const dailyCapHours = shiftHrs * numShifts;
      const setupTime =
        machine.setupTimeDefault !== undefined ? machine.setupTimeDefault : 0.5;

      const maxOTHours = machine.maxOvertimeHours || 4;
      const otCapHours = machine.overtimeAllowed ? maxOTHours : 0;

      const workingDays = machine.workingDays?.length
        ? machine.workingDays
        : ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const weeklyOff = machine.weeklyOff?.length
        ? machine.weeklyOff
        : ["Sunday"];

      // Get existing usage for these machines to avoid overbooking during manual planning
      const existingEntries = await ProductionCalendar.find({
        machineId: { $in: machineIds },
        date: { $gte: processStart.toDate() },
        jobOrderId: { $ne: jobOrderId }
      });

      const machineUsage = {};
      existingEntries.forEach(e => {
        const d = moment(e.date).format("YYYY-MM-DD");
        const mId = e.machineId.toString();
        if (!machineUsage[mId]) machineUsage[mId] = {};
        machineUsage[mId][d] = (machineUsage[mId][d] || 0) + (e.scheduledHours || 0);
      });

      let remaining = job.orderQty;
      let current = moment(processStart);
      let lastDay = null;
      let safety = 0;

      while (remaining > 0 && safety < 90) {
        safety++;
        const dayName = DAY_NAMES[current.day()];

        if (workingDays.includes(dayName) && !weeklyOff.includes(dayName)) {
          const runRate = (machine.practicalRunRate || 1000) * (machine.efficiencyFactor || 0.85);
          let normalQty = 0;
          let normalScheduledHours = 0;

          const usedAlready = (machineUsage[machineId.toString()] || {})[current.format("YYYY-MM-DD")] || 0;
          const availableHours = Math.max(0, dailyCapHours - usedAlready);

          if (availableHours > setupTime && runRate > 0) {
            const qtyPossible = (availableHours - setupTime) * runRate;
            normalQty = Math.min(remaining, qtyPossible);
            normalScheduledHours = normalQty / runRate + setupTime;
          }
          
          if (normalQty > 0) {
            remaining -= normalQty;
            // Update local usage tracker
            if (!machineUsage[machineId.toString()]) machineUsage[machineId.toString()] = {};
            machineUsage[machineId.toString()][current.format("YYYY-MM-DD")] = usedAlready + normalScheduledHours;

            entries.push({
              machineId: machine._id,
              date: current.toDate(),
              shift: "Day",
              startTime: machine.shiftStartTime || "08:00",
              endTime: machine.shiftEndTime || "16:00",
              jobOrderId: job._id,
              jobCardNo: job.joNo,
              process,
              scheduledHours: normalScheduledHours,
              scheduledQty: normalQty,
              isOvertime: false,
              status: "Scheduled",
              plannedStart: current.toDate(),
              plannedEnd: current.clone().endOf("day").toDate(),
            });
          }

          if (remaining > 0 && otCapHours > 0 && runRate > 0) {
            const usedAlreadyAfterDay = (machineUsage[machineId.toString()] || {})[current.format("YYYY-MM-DD")] || 0;
            const availableOTHours = Math.max(0, (dailyCapHours + otCapHours) - usedAlreadyAfterDay);
            
            if (availableOTHours > 0) {
              const qtyPossibleOT = availableOTHours * runRate;
              const otQty = Math.min(remaining, qtyPossibleOT);
              
              if (otQty > 0) {
                remaining -= otQty;
                const otScheduledHours = otQty / runRate;
                
                // Update local usage tracker
                if (!machineUsage[machineId.toString()]) machineUsage[machineId.toString()] = {};
                machineUsage[machineId.toString()][current.format("YYYY-MM-DD")] = usedAlreadyAfterDay + otScheduledHours;

                const otStart = machine.shiftEndTime || "16:00";
                const otEndHr = parseInt(otStart.split(":")[0]) + Math.ceil(otScheduledHours);
                const otEnd = `${String(otEndHr).padStart(2, "0")}:00`;

                entries.push({
                  machineId: machine._id,
                  date: current.toDate(),
                  shift: "OT",
                  startTime: otStart,
                  endTime: otEnd,
                  jobOrderId: job._id,
                  jobCardNo: job.joNo,
                  process,
                  scheduledHours: otScheduledHours,
                  scheduledQty: otQty,
                  isOvertime: true,
                  overtimeNeeded: true,
                  overtimeHours: otScheduledHours,
                  status: "Scheduled",
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
