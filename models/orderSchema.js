// const mongoose = require("mongoose");

// const orderSchema = new mongoose.Schema({
//   userId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: "User",
//     required: true
//   },

//   items: [
//     {
//       productId: {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: "Product",
//         required: true
//       },
//       size: String,
//       quantity: Number,
//       price: Number
//     }
//   ],

//   totalAmount: {
//     type: Number,
//     required: true
//   },

//   address: {
//     type: String,
//     required: true
//   },

//   paymentMethod: {
//     type: "String",
//     default: "COD"
//   },

//   status: {
//     type: String,
//     default: "Placed"
//   },

//   createdAt: {
//     type: Date,
//     default: Date.now
//   }
// });

// module.exports = mongoose.model("Order", orderSchema);

const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
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
      price: Number
    }
  ],

  // 🔹 Address should be OBJECT
  address: {
    name: String,
    phone: String,
    city: String,
    state: String,
    pincode: String
  },

  paymentMethod: {
    type: String,   // ✅ FIXED
    default: "COD"
  },

  status: {
    type: String,
    enum: ["Placed", "Shipped", "Delivered", "Cancelled"],
    default: "Placed"
  },

  // 🔹 Price breakdown (recommended)
  subtotal: Number,
  gstAmount: Number,
  discountAmount: Number,

  totalAmount: {
    type: Number,
    required: true
  }

}, { timestamps: true });

module.exports = mongoose.model("Order", orderSchema);
