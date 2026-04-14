const mongoose = require('mongoose');
const MachineMaster = require('./models/MachineMaster');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://labhbother12_db_user:SrevRzss5zdxCQNS@cluster0.4bzbts5.mongodb.net/";

async function initializeRecords() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected.');

    console.log('Initializing "records" field for all machines...');
    const result = await MachineMaster.updateMany(
      { records: { $exists: false } }, // Only update if it doesn't exist
      { $set: { records: {} } }
    );

    console.log(`Success! Updated ${result.modifiedCount} machines.`);
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

initializeRecords();
