const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({

  name: {
    type: String,
    required: true
  },

  brand: {
    type:mongoose.Schema.Types.ObjectId,
    type: String,
    required: true
  },

  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category",
    required: true
  },

  description: {
    type: String,
    required: true
  },

  price: {
    type: Number,
    required: true
  },

  offerPrice: {
    type: Number,
    default: 0
  },

  images: {
    type: [String],
    required: true
  },

  variants: [
    {
      size: { type: Number, required: true },
      color: { type: String, required: true },
      stock: { type: Number, required: true }
    }
  ],

  isDeleted: {
    type: Boolean,
    default: false
  }

}, { timestamps: true });

module.exports = mongoose.model("Product", productSchema);
