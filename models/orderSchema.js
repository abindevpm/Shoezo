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
      quantity: Number,
      price: Number,


      itemStatus: {
        type: String,
        default: "Placed"
      },
      cancelReason: {
        type: String
      },
      returnReason: {
        type: String
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
    default: "COD"
  },

  paymentStatus: {
    type: String,
    enum: ["Pending", "Paid", "Failed", "Refunded"],
    default: "Pending"
  },

  cancelReason: {
    type: String
  },

  returnReason: {
    type: String
  },

  subtotal: Number,
  gstAmount: Number,
  discountAmount: Number,

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
      "Return Request Sent",
      "Return Approved",
      "Return Rejected",
      "Returned"
    ],
    default: "Placed"
  }

}, { timestamps: true });

module.exports = mongoose.model("Order", orderSchema);
