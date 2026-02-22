const mongoose = require("mongoose");
const Order = require("./models/orderSchema");
const User = require("./models/userSchema");
require("dotenv").config();

async function debug() {
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/Shoezo");
    const orderId = "ORD-1771757438580";
    const order = await Order.findOne({ orderId }).populate("userId");

    if (!order) {
        console.log("Order not found");
        process.exit();
    }

    console.log("Order found:", {
        id: order._id,
        orderId: order.orderId,
        status: order.status,
        paymentStatus: order.paymentStatus,
        totalAmount: order.totalAmount,
        userId: order.userId ? order.userId._id : "null"
    });

    if (order.userId) {
        const user = await User.findById(order.userId);
        console.log("User wallet:", user.wallet);
    }

    process.exit();
}

debug();
