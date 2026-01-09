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
      }
    }
  ],

  address: {
    name: String,
    phone: String,
    city: String,
    state: String,
    pincode: String
  },

  paymentMethod: {
    type: String,
    default: "COD"
  },

  status: {
    type: String,
    enum: ["Placed", "Shipped", "Delivered", "Cancelled", "Returned"],
    default: "Placed"
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
  }

}, { timestamps: true });

module.exports = mongoose.model("Order", orderSchema);
