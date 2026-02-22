const mongoose = require('mongoose');
const userController = require('./controllers/user/userController');
require('dotenv').config();

const req = {};
const res = {
    json: function (data) {
        console.log('Response JSON:', JSON.stringify(data, null, 2));
    }
};

async function testGetCoupons() {
    try {
        await mongoose.connect('mongodb://127.0.0.1:27017/shoezo');
        console.log('Connected to MongoDB');

        await userController.getAvailableCoupons(req, res);

        await mongoose.connection.close();
    } catch (err) {
        console.error('Test Error:', err);
    }
}

testGetCoupons();
