const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({

  orderId: {
    type: String,
    unique: true,
    required: true
  },

  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  items: [
    {
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true
      },

      size: Number,
      quantity: {
        type: Number,
        required: true
      },

      price: {
        type: Number,
        required: true
      },

      offerDiscount: {
        type: Number,
        default: 0
      },

      couponDiscount: {
        type: Number,
        default: 0
      },

      finalPrice: {
        type: Number,
        required: true
      },

      itemStatus: {
        type: String,
        enum: [
          "Placed",
          "Processing",
          "Shipped",
          "Delivered",
          "Cancelled",
          "Return Requested",
          "Return Approved",
          "Return Rejected",
          "Returned",
          "Failed"
        ],
        default: "Placed"
      },

      cancelReason: String,
      returnReason: String,

      refundAmount: {
        type: Number,
        default: 0
      },

      refundStatus: {
        type: String,
        enum: ["Pending", "Completed"],
        default: null
      },

      isRestocked: {
        type: Boolean,
        default: false
      }

    }
  ],

  address: {
    fullName: String,
    phone: String,
    city: String,
    state: String,
    pincode: String,
    addressLine: String
  },

  paymentMethod: {
    type: String,
    enum: ["COD", "ONLINE", "WALLET"],
    default: "COD"
  },

  paymentStatus: {
    type: String,
    enum: ["Pending", "Paid", "Failed", "Refunded"],
    default: "Pending"
  },

  subtotal: {
    type: Number,
    required: true
  },

  gstAmount: {
    type: Number,
    default: 0
  },

  totalOfferDiscount: {
    type: Number,
    default: 0
  },

  totalCouponDiscount: {
    type: Number,
    default: 0
  },

  couponCode: {
    type: String,
    default: null
  },

  totalAmount: {
    type: Number,
    required: true
  },

  status: {
    type: String,
    enum: [
      "Placed",
      "Processing",
      "Shipped",
      "Out for Delivery",
      "Delivered",
      "Cancelled",
      "Return Requested",
      "Return Approved",
      "Return Rejected",
      "Returned",
      "Failed"
    ],
    default: "Placed"
  },

  cancelReason: String,
  returnReason: String,

  retryUntil: Date

}, { timestamps: true });

module.exports = mongoose.model("Order", orderSchema);