require("dotenv").config();
const mongoose = require("mongoose");
const JobOrder = require("./models/JobOrder");
const FGStock = require("./models/FGStock");
const SalesOrder = require("./models/SalesOrder");

async function syncFGWithJobOrders() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✓ Connected");

    const jobOrders = await JobOrder.find({});
    console.log(`Found ${jobOrders.length} Job Orders to process.`);

    let syncedCount = 0;

    for (const jo of jobOrders) {
      // Find formation stages
      const formationStages = (jo.process || []).filter((s) =>
        s.toLowerCase().includes("formation"),
      );

      let totalGoodQty = 0;
      if (formationStages.length > 0) {
        // Use the quantity from the first formation stage found (usually there's only one)
        totalGoodQty = jo.stageQtyMap.get(formationStages[0]) || 0;
      } else if (jo.status === "Completed") {
        // If no explicit formation stage but the job is completed, use the last stage yield
        const lastStage = jo.process[jo.process.length - 1];
        totalGoodQty = jo.stageQtyMap.get(lastStage) || 0;
      }

      if (totalGoodQty > 0) {
        console.log(
          `Syncing JO: ${jo.joNo} | Item: ${jo.itemName} | Qty: ${totalGoodQty}`,
        );

        // Fetch price from Sales Order
        let price = 0;
        if (jo.soRef) {
          const so = await SalesOrder.findOne({ soNo: jo.soRef });
          if (so) {
            const item = so.items.find((i) => i.itemName === jo.itemName);
            if (item) price = item.price || 0;
          }
        }

        await FGStock.findOneAndUpdate(
          {
            joNo: jo.joNo,
            itemName: jo.itemName,
          },
          {
            itemName: jo.itemName,
            joNo: jo.joNo,
            soRef: jo.soRef || "",
            clientName: jo.clientName || "",
            qty: totalGoodQty,
            price: price,
            lastUpdated: new Date(),
          },
          { upsert: true },
        );
        syncedCount++;
      }
    }

    console.log(`\n✅ Sync Complete!`);
    console.log(
      `📊 Successfully synced ${syncedCount} Job Orders to FG Stock.`,
    );
    process.exit(0);
  } catch (err) {
    console.error("❌ Sync Error:", err);
    process.exit(1);
  }
}

syncFGWithJobOrders();
