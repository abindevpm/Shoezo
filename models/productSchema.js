const mongoose = require("mongoose");

const productSchema  = new mongoose.Schema({

  name:{
    type:String,
    requires:true
  },
  brand:{
    type:String,
    required:true
  },
  category:{
    type:mongoose.Schema.Types.ObjectId,
    ref:"Category",
    required:true
  },
  price:{
    type:Number,
    required:true
  },
  stock:{
      type:Number,
      required:true
  },
  images:{
    type:[String],
    required:true
  },
  isDeleted:{
    type:Boolean,
    default:false
  }

},{timestamps:true})


 module.exports = mongoose.model("Product".productSchema)

