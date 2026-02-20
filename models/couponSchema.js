const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  couponType: {
    type: String,
    enum: ["New user Join", "Above 1000 order", "Above 5000 order", "General"],
    default: "General"
  },

  discountType: {
    type: String,
    enum: ["percentage", "fixed"],
    required: true
  },

  discountValue: {
    type: Number,
    required: true
  },

  minPurchase: {
    type: Number,
    default: 0
  },

  maxDiscount: {
    type: Number,
    default: null
  },

  startDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  expiryDate: {
    type: Date,
    required: true
  },

  usageLimit: {
    type: Number,
    default: 1
  },

  usedCount: {
    type: Number,
    default: 0
  },

  isActive: {
    type: Boolean,
    default: true
  }

}, { timestamps: true });

module.exports = mongoose.model("Coupon", couponSchema);
