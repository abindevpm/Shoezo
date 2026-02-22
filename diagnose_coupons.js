const mongoose = require('mongoose');
const Coupon = require('./models/couponSchema');
require('dotenv').config();

async function checkCoupons() {
    try {
        await mongoose.connect('mongodb://127.0.0.1:27017/shoezo');
        console.log('Connected to MongoDB');

        const today = new Date();
        const coupons = await Coupon.find({
            isActive: true,
            expiryDate: { $gt: today }
        });

        console.log('Active and Not Expired Coupons count:', coupons.length);
        coupons.forEach(c => {
            console.log(`- Code: ${c.code}, Type: ${c.couponType}, Expiry: ${c.expiryDate}`);
        });

        const allCoupons = await Coupon.find({});
        console.log('Total Coupons in DB:', allCoupons.length);

        await mongoose.connection.close();
    } catch (err) {
        console.error('Error:', err);
    }
}

checkCoupons();
