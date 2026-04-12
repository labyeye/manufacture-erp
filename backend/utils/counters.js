const Counter = require('../models/Counter');








async function getNextSequence(name, prefix = null, padLength = 3) {
  const counter = await Counter.findOneAndUpdate(
    { name },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  const number = String(counter.seq).padStart(padLength, '0');

  if (prefix) {
    return `${prefix}${number}`;
  }

  return number;
}




async function generateSONo() {
  const year = new Date().getFullYear();
  return await getNextSequence(`SO-${year}`, `SO-${year}`, 3);
}

async function generateJONo() {
  const year = new Date().getFullYear();
  return await getNextSequence(`JO-${year}`, `JO-${year}`, 3);
}

async function generatePONo() {
  const year = new Date().getFullYear();
  return await getNextSequence(`PO-${year}`, `PO-${year}`, 3);
}


async function generateGRNNo() {
  const year = new Date().getFullYear();
  return await getNextSequence(`GRN-${year}`, `GRN-${year}`, 3);
}


async function generateDCNo() {
  const year = new Date().getFullYear();
  return await getNextSequence(`DC-${year}`, `DC-${year}`, 3);
}

async function generateItemCode(type) {
  const prefixMap = {
    'Raw Material': 'RM',
    'Finished Goods': 'FG',
    'Consumable': 'CG',
    'Machine Spare': 'SP'
  };

  const prefix = prefixMap[type] || 'IT';
  return await getNextSequence(prefix, prefix, 4);
}

module.exports = {
  getNextSequence,
  generateSONo,
  generateJONo,
  generatePONo,
  generateGRNNo,
  generateDCNo,
  generateItemCode
};
