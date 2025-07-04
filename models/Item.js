const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  price: { type: Number, required: true },
  category: String,
  image: String,
  inStock: { type: Boolean, default: true },
  sold: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  isNew: { type: Boolean, default: false },
  onSale: { type: Boolean, default: false }
});

module.exports = mongoose.model('Item', itemSchema);
