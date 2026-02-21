const mongoose = require("mongoose")

const offerSchema = new mongoose.Schema({

    offerType:{
        type:String,
        enum:["product","category"],
        required:true
    },

    discountType:{
        type:String,
        enum:["percentage","fixed"],
        default:"percentage"
    },
    discountValue:{
        type:Number,
        required:true
    },
    product:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Product",
        default:null
    },
    category:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Category",
        default:null
    },
    isActive:{
        type:Boolean,
        default:true
    },
    startDate:{
        type:Date
    },
    endDate:{
        type:Date
    }

},{timestamps:true})

module.exports = mongoose.model("Offer",offerSchema)