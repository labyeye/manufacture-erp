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
  return await getNextSequence('SO', 'SO-', 3);
}

async function generateJONo() {
  return await getNextSequence('JO', 'JO-', 3);
}

async function generatePONo() {
  return await getNextSequence("PO", "PO", 4);
}


async function generateGRNNo() {
  return await getNextSequence("GRN", "GRN", 4);
}


async function generateDCNo() {
  return await getNextSequence('DC', 'DC-', 3);
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
