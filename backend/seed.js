require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const CategoryMaster = require('./models/CategoryMaster');
const MachineMaster = require('./models/MachineMaster');

const MACHINE_TYPES = [
  "Printing",
  "Cutting",
  "Die Cutting",
  "Bag Making",
  "Sheeting",
  "Sheet Cutting",
  "Formation",
  "Handmade",
  "Varnish",
  "Lamination"
];

const FG_CATEGORIES = [
  "Cake Box",
  "Corrugated Box",
  "Rigid Box",
  "Paper Bag with Handle",
  "Paper Bag without Handle",
  "Paper Cup",
  "Container",
  "Plate",
  "Thali",
  "Bowl",
  "Insert",
  "Flat Sheet",
  "Wrapping Paper"
];

const RM_CATEGORIES = [
  "Art Card Sheet",
  "Kraft Sheet",
  "Duplex Sheet",
  "Paper Reel",
  "Cardboard",
  "Specialty Paper"
];

const CONSUMABLE_CATEGORIES = [
  "Adhesive",
  "Ink",
  "Coating Material",
  "Packaging Material",
  "General Supplies"
];

const MACHINE_SPARE_CATEGORIES = [
  "Printing Parts",
  "Cutting Blades",
  "Electrical Components",
  "Mechanical Parts"
];

async function seed() {
  try {
    console.log('🌱 Starting database seeding...\n');

    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('✓ Connected to MongoDB');

    // 1. Create default admin user
    const existingAdmin = await User.findOne({ username: 'admin' });

    if (!existingAdmin) {
      const admin = new User({
        username: 'admin',
        password: 'admin123',
        name: 'Administrator',
        role: 'Admin',
        editableTabs: null, // null means all access
        allowedTabs: [
          'dashboard', 'search', 'purchase', 'inward', 'sales', 'jobs',
          'production', 'calendar', 'dispatch', 'rawstock', 'fg',
          'consumablestock', 'sizemaster', 'vendormaster', 'clientmaster',
          'itemmaster', 'machinemaster', 'printingmaster', 'users'
        ],
        isActive: true
      });

      await admin.save();
      console.log('✓ Created default admin user (username: admin, password: admin123)');
    } else {
      console.log('→ Admin user already exists');
    }

    // 2. Seed Category Masters
    const categories = [
      { type: 'Raw Material', categories: RM_CATEGORIES },
      { type: 'Finished Goods', categories: FG_CATEGORIES },
      { type: 'Consumable', categories: CONSUMABLE_CATEGORIES },
      { type: 'Machine Spare', categories: MACHINE_SPARE_CATEGORIES }
    ];

    for (const cat of categories) {
      await CategoryMaster.findOneAndUpdate(
        { type: cat.type },
        { type: cat.type, categories: cat.categories },
        { upsert: true }
      );
    }

    console.log('✓ Seeded category masters');

    // 3. Seed some default machines
    const machines = [
      { name: 'Heidelberg Press', type: 'Printing', capacity: 5000, capacityUnit: 'sheets/hr', workingHours: 8, shiftsPerDay: 2, status: 'Active' },
      { name: 'Komori Offset', type: 'Printing', capacity: 4500, capacityUnit: 'sheets/hr', workingHours: 8, shiftsPerDay: 2, status: 'Active' },
      { name: 'Die Cutter 1', type: 'Die Cutting', capacity: 3000, capacityUnit: 'pcs/hr', workingHours: 8, shiftsPerDay: 2, status: 'Active' },
      { name: 'Lamination Machine', type: 'Lamination', capacity: 2000, capacityUnit: 'sheets/hr', workingHours: 8, shiftsPerDay: 1, status: 'Active' },
      { name: 'Varnish Unit', type: 'Varnish', capacity: 2500, capacityUnit: 'sheets/hr', workingHours: 8, shiftsPerDay: 1, status: 'Active' },
      { name: 'Box Former 1', type: 'Formation', capacity: 1500, capacityUnit: 'pcs/hr', workingHours: 8, shiftsPerDay: 2, status: 'Active' },
      { name: 'Bag Making Machine', type: 'Bag Making', capacity: 1200, capacityUnit: 'pcs/hr', workingHours: 8, shiftsPerDay: 2, status: 'Active' }
    ];

    for (const machine of machines) {
      const existing = await MachineMaster.findOne({ name: machine.name });
      if (!existing) {
        await new MachineMaster(machine).save();
      }
    }

    console.log('✓ Seeded default machines');

    console.log('\n✅ Database seeding completed successfully!');
    console.log('\nDefault credentials:');
    console.log('  Username: admin');
    console.log('  Password: admin123\n');

    process.exit(0);
  } catch (error) {
    console.error('✗ Seeding error:', error);
    process.exit(1);
  }
}

seed();
