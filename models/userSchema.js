const mongoose = require("mongoose")
const { Schema } = mongoose;

const userSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    phone: {
        type: String,
        required: false,

        sparse: true,
        default: null
    },
    googleId: {
        type: String,
        sparse: true,
        unique: true
    },

    password: {
        type: String,
        required: true,
    },
    isBlocked: {
        type: Boolean,
        default: false
    },
    isAdmin: {
        type: Boolean,
        default: false
    },

    cart: [{
        type: Schema.Types.ObjectId,
        ref: "Cart",
    }],
    wallet: [{
        type: Schema.Types.ObjectId,
        ref: "Wallet",
    }],
    orderHistory: [{
        type: Schema.Types.ObjectId,
        ref: "Order"
    }],
    createdOn: {
        type: Date,
        default: Date.now,
    },
    referalCode: {
        type: String
    },
    redeemed: {
        type: Boolean
    }, redeemedUsers: [{
        type: Schema.Types.ObjectId,
        ref: "User"
    }],
    searchHistory: [{
        category: {
            type: Schema.Types.ObjectId,
            ref: "category",
        },
        brand: {
            type: String
        },
        searchOn: {
            type: Date,
            default: Date.now
        }
    }],
    lastLogin: {
        type: Date,
        default: null
    },
    emailChange: {
  newEmail: {
    type: String
  },
  otp: {
    type: String
  },
  expiresAt: {
    type: Date
  }
},
profileImage: {
  type: String,
  default: ""
}









})

const User = mongoose.model("User", userSchema);

module.exports = User;