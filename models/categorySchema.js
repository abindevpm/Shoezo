const mongoose = require("mongoose")

const categorySchema = new mongoose.Schema({

    
     name: {
        type: String,
        required: true,
        unique: true
    },
    description: {
        type: String,
        default: ""
    },
    isListed: {
        type: Boolean,
        default: true
    },
    isDeleted:{
        type:Boolean,
        default:false
    },
   categoryOffer: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "Offer",
  default: null
}
}, { timestamps: true })

module.exports = mongoose.model("Category", categorySchema)
