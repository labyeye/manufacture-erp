require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const app = express();


app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('dev'));


mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => console.log('✓ MongoDB connected'))
  .catch(err => {
    console.error('✗ MongoDB connection error:', err);
    process.exit(1);
  });


const authRoutes = require('./routes/auth');
const purchaseOrderRoutes = require('./routes/purchaseOrders');
const materialInwardRoutes = require('./routes/materialInward');
const categoryMasterRoutes = require('./routes/categoryMaster');
const clientMasterRoutes = require('./routes/clientMaster');
const vendorMasterRoutes = require('./routes/vendorMaster');
const companyMasterRoutes = require('./routes/companyMaster');
const salesOrderRoutes = require('./routes/salesOrders');
const jobOrderRoutes = require('./routes/jobOrders');
const dispatchRoutes = require('./routes/dispatch');
const itemMasterRoutes = require('./routes/itemMaster');
const machineMasterRoutes = require('./routes/machineMaster');
const sizeMasterRoutes = require('./routes/sizeMaster');
const printingDetailMasterRoutes = require('./routes/printingDetailMaster');
const rawMaterialStockRoutes = require('./routes/rawMaterialStock');
const fgStockRoutes = require('./routes/fgStock');
const consumableStockRoutes = require('./routes/consumableStock');


app.use('/api/auth', authRoutes);
app.use('/api/purchase-orders', purchaseOrderRoutes);
app.use('/api/material-inward', materialInwardRoutes);
app.use('/api/category-master', categoryMasterRoutes);
app.use('/api/client-master', clientMasterRoutes);
app.use('/api/vendor-master', vendorMasterRoutes);
app.use('/api/company-master', companyMasterRoutes);
app.use('/api/sales-orders', salesOrderRoutes);
app.use('/api/job-orders', jobOrderRoutes);
app.use('/api/dispatch', dispatchRoutes);
app.use('/api/item-master', itemMasterRoutes);
app.use('/api/machine-master', machineMasterRoutes);
app.use('/api/size-master', sizeMasterRoutes);
app.use('/api/printing-detail-master', printingDetailMasterRoutes);
app.use('/api/raw-material-stock', rawMaterialStockRoutes);
app.use('/api/fg-stock', fgStockRoutes);
app.use('/api/consumable-stock', consumableStockRoutes);


app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});


app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});


app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

const PORT = process.env.PORT || 2500;

app.listen(PORT, () => {
  console.log(`\n🚀 ManufactureIQ ERP Backend`);
  console.log(`📡 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 API: http://localhost:${PORT}/api`);
  console.log(`\nReady to accept requests!\n`);
});

module.exports = app;
