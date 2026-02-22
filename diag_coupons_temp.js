const mongoose = require('mongoose');
const Coupon = require('./models/couponSchema');
require('dotenv').config();

async function run() {
    try {
        await mongoose.connect('mongodb://127.0.0.1:27017/shoezo');
        console.log('Connected');
        const today = new Date();
        const coupons = await Coupon.find({
            isActive: true,
            expiryDate: { $gt: today }
        });
        console.log('Active coupons count:', coupons.length);
        coupons.forEach(c => console.log('Found:', c.code, 'isActive:', c.isActive, 'expiryDate:', c.expiryDate));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
run();
