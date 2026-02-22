const mongoose = require("mongoose");
const { Schema } = mongoose;


const addressSchema = new Schema({
  fullName: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: true
  },
  addressLine: {
    type: String,
    required: true
  },
  city: {
    type: String,
    required: true
  },
  state: {
    type: String,
    required: true
  },
  pincode: {
    type: String,
    required: true
  },
  addressType: {
    type: String,
    default: "HOME"
  },
  landmark: {
    type: String,
    default: ""
  },
  isDefault: {
    type: Boolean,
    default: false
  }
}, { _id: true });


const userSchema = new Schema({

  name: { type: String, required: true },

  email: { type: String, required: true, unique: true },

  phone: {
    type: String,
    sparse: true,
    default: null
  },

  googleId: {
    type: String,
    sparse: true,
    unique: true
  },

  password: { type: String, required: true },

  isBlocked: { type: Boolean, default: false },

  isAdmin: { type: Boolean, default: false },

  cart: [{ type: Schema.Types.ObjectId, ref: "Cart" }],


  wallet: {
    balance: {
      type: Number,
      default: 0
    },
    transactions: [
      {
        type: {
          type: String,
          enum: ["credit", "debit"]
        },
        amount: {
          type: Number,
          required: true
        },
        description: {
          type: String
        },
        orderId: {
          type: Schema.Types.ObjectId,
          ref: "Order"
        },
        date: {
          type: Date,
          default: Date.now
        }
      }
    ]
  },





  orderHistory: [{ type: Schema.Types.ObjectId, ref: "Order" }],

  createdOn: { type: Date, default: Date.now },

  referalCode: {
    type: String,
    unique: true,
    sparse: true
  },

  referredBy: {
    type: Schema.Types.ObjectId,
    ref: "User",
    default: null
  },

  redeemed: {
    type: Boolean,
    default: false
  },

  redeemedUsers: [{ type: Schema.Types.ObjectId, ref: "User" }],

  searchHistory: [{
    category: { type: Schema.Types.ObjectId, ref: "category" },
    brand: String,
    searchOn: { type: Date, default: Date.now }
  }],

  lastLogin: { type: Date, default: null },

  emailChange: {
    newEmail: String,
    otp: String,
    expiresAt: Date
  },

  profileImage: {
    type: String,
    default: ""
  },


  addresses: [addressSchema]

}, { timestamps: true });

const User = mongoose.model("User", userSchema);
module.exports = User;
