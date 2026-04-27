const mongoose = require("mongoose");
require("dotenv").config();
const Coupon = require("./models/couponSchema");

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    const coupons = await Coupon.find({});
    console.log("All coupons:", coupons);
    process.exit();
  })
  .catch(err => console.error(err));
