const MachineMaster = require("../models/MachineMaster");

exports.getAllMachines = async (req, res) => {
  try {
    const { type, status } = req.query;

    const filter = {};
    if (type) filter.type = type;
    if (status) filter.status = status;

    const machines = await MachineMaster.find(filter).sort({
      type: 1,
      name: 1,
    });

    res.json({ machines });
  } catch (error) {
    console.error("Get all machines error:", error);
    res.status(500).json({ error: "Failed to fetch machines" });
  }
};

exports.getMachineById = async (req, res) => {
  try {
    const machine = await MachineMaster.findById(req.params.id);

    if (!machine) {
      return res.status(404).json({ error: "Machine not found" });
    }

    res.json(machine);
  } catch (error) {
    console.error("Get machine error:", error);
    res.status(500).json({ error: "Failed to fetch machine" });
  }
};

exports.createMachine = async (req, res) => {
  try {
    const { name, type, capacity, capacityUnit, workingHours, shiftsPerDay } =
      req.body;

    if (!name || !type) {
      return res.status(400).json({ error: "Name and type are required" });
    }

    const existingMachine = await MachineMaster.findOne({
      name: { $regex: new RegExp(`^${name.trim()}$`, "i") },
    });

    if (existingMachine) {
      return res
        .status(400)
        .json({ error: "Machine with this name already exists" });
    }

    const machine = new MachineMaster({
      ...req.body,
      name: name.trim(),
    });

    await machine.save();

    res.status(201).json({ machine });
  } catch (error) {
    console.error("Create machine error:", error);
    res.status(500).json({ error: "Failed to create machine" });
  }
};

exports.updateMachine = async (req, res) => {
  try {
    const {
      name,
      type,
      capacity,
      capacityUnit,
      workingHours,
      shiftsPerDay,
      status,
    } = req.body;

    const machine = await MachineMaster.findById(req.params.id);
    if (!machine) {
      return res.status(404).json({ error: "Machine not found" });
    }

    if (name && name !== machine.name) {
      const existingMachine = await MachineMaster.findOne({
        name: { $regex: new RegExp(`^${name.trim()}$`, "i") },
        _id: { $ne: req.params.id },
      });

      if (existingMachine) {
        return res
          .status(400)
          .json({ error: "Machine with this name already exists" });
      }
      machine.name = name.trim();
    }

    const excludeFields = [
      "_id",
      "name",
      "records",
      "__v",
      "createdAt",
      "updatedAt",
    ];
    Object.keys(req.body).forEach((key) => {
      if (!excludeFields.includes(key)) {
        machine[key] = req.body[key];
      }
    });

    if (req.body.records) {
      console.log(
        "Saving records for machine:",
        machine.name,
        JSON.stringify(req.body.records),
      );
      machine.set("records", req.body.records || {});
      machine.markModified("records");
    }

    await machine.save();
    console.log("Machine saved successfully:", machine.name);

    res.json({ machine });
  } catch (error) {
    console.error("Update machine error:", error);
    res.status(500).json({ error: "Failed to update machine" });
  }
};

exports.deleteMachine = async (req, res) => {
  try {
    const machine = await MachineMaster.findByIdAndDelete(req.params.id);

    if (!machine) {
      return res.status(404).json({ error: "Machine not found" });
    }

    res.json({ message: "Machine deleted successfully" });
  } catch (error) {
    console.error("Delete machine error:", error);
    res.status(500).json({ error: "Failed to delete machine" });
  }
};

exports.updateMachineStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!status || !["Active", "Inactive"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const machine = await MachineMaster.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true },
    );

    if (!machine) {
      return res.status(404).json({ error: "Machine not found" });
    }

    res.json({ machine });
  } catch (error) {
    console.error("Update status error:", error);
    res.status(500).json({ error: "Failed to update status" });
  }
};
