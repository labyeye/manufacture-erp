const mongoose = require("mongoose");
const MachineMaster = require("./backend/models/MachineMaster");

mongoose.connect("mongodb://localhost:27017/erp", { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    const machines = await MachineMaster.find({ type: "Die Cutting" });
    machines.forEach(m => console.log(m.name, "RunRate:", m.practicalRunRate, "Shifts:", m.maxShiftsAllowed));
    process.exit(0);
  });
