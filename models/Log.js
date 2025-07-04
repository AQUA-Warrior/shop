const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
  action: String,
  item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item' },
  admin: String,
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Log', logSchema);
