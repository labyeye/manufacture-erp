const mongoose = require('mongoose');
const FGStock = require('./models/FGStock');
const SalesOrder = require('./models/SalesOrder');
require('dotenv').config();

async function fixFGPrices() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to DB.');

    const itemsToFix = await FGStock.find({ $or: [{ price: 0 }, { price: null }] });
    console.log(`Found ${itemsToFix.length} items with missing price.`);

    for (const fg of itemsToFix) {
      if (!fg.soRef) continue;

      const so = await SalesOrder.findOne({ soNo: fg.soRef });
      if (!so) continue;

      const joName = (fg.itemName || "").trim().toLowerCase();
      const item = so.items.find(i => (i.itemName || "").trim().toLowerCase() === joName);

      if (item && item.price) {
        fg.price = item.price;
        await fg.save();
        console.log(`✅ Fixed price for ${fg.itemName} (${fg.joNo}): ${fg.price}`);
      } else {
        console.log(`❌ Still could not find price for ${fg.itemName} in SO ${fg.soRef}`);
      }
    }

    console.log('Done.');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

fixFGPrices();
