const mongoose = require('mongoose');

const DiscountCodeSchema = new mongoose.Schema({
  code: {
    type: String,
    required: [true, 'Please add a discount code'],
    unique: true,
    uppercase: true,
    trim: true
  },
  discountType: {
    type: String,
    enum: ['percent', 'fixed'],
    default: 'percent'
  },
  discountValue: {
    type: Number,
    required: [true, 'Please add a discount value'],
    min: [1, 'Discount value must be at least 1']
  },
  expiresAt: {
    type: Date,
    required: [true, 'Please add an expiration date']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('DiscountCode', DiscountCodeSchema);
