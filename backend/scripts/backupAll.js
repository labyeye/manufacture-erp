require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dir = path.join(__dirname, '..', '..', 'db-backups', stamp);
  fs.mkdirSync(dir, { recursive: true });
  const cols = await mongoose.connection.db.listCollections().toArray();
  for (const { name } of cols) {
    const docs = await mongoose.connection.db.collection(name).find({}).toArray();
    fs.writeFileSync(path.join(dir, `${name}.json`), JSON.stringify(docs, null, 2));
    console.log(name.padEnd(30), docs.length);
  }
  console.log('Saved to', dir);
  await mongoose.disconnect();
})().catch(e => { console.error(e.message); process.exit(1); });
