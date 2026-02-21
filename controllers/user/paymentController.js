const razorpay = require("../../config/razorpay");
const crypto = require("crypto");
const Cart = require("../../models/cartSchema");
const Order = require("../../models/orderSchema");
const Product = require("../../models/productSchema");
const User = require("../../models/userSchema");





const createOrder = async (req, res) => {
  try {
    const userId = req.session.user;
    const { addressId } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Login required" });
    }

    if (!addressId) {
      return res.status(400).json({ success: false, message: "Address is required" });
    }

    const cart = await Cart.findOne({ userId }).populate({
      path: "items.productId",
      populate: [
        { path: "productOffer" },
        { path: "category", populate: { path: "categoryOffer" } }
      ]
    });

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ success: false, message: "Cart is empty" });
    }

    const today = new Date();
    let subtotal = 0;
    let orderItems = [];

    for (const item of cart.items) {
      const product = item.productId;
      const variant = product.variants.find(
        v => Number(v.size) === Number(item.size)
      );

      if (!variant) continue;

      let appliedDiscount = 0;
      // Check Product Offer
      if (product.productOffer &&
        product.productOffer.isActive &&
        product.productOffer.startDate <= today &&
        product.productOffer.endDate >= today) {
        appliedDiscount = Math.max(appliedDiscount, Number(product.productOffer.discountValue) || 0);
      }

      // Check Category Offer
      if (product.category &&
        product.category.categoryOffer &&
        product.category.categoryOffer.isActive &&
        product.category.categoryOffer.startDate <= today &&
        product.category.categoryOffer.endDate >= today) {
        appliedDiscount = Math.max(appliedDiscount, Number(product.category.categoryOffer.discountValue) || 0);
      }

      const currentPrice = appliedDiscount > 0
        ? Math.floor(variant.price * (1 - appliedDiscount / 100))
        : variant.price;

      subtotal += currentPrice * item.quantity;

      orderItems.push({
        productId: product._id,
        size: item.size,
        quantity: item.quantity,
        price: currentPrice
      });
    }

    const gstAmount = Math.round(subtotal * 0.18);
    // Note: Removed the hardcoded 30% discount to rely on dynamic offers + potentially coupons
    const discountAmount = req.session.discountAmount || 0;
    const totalAmount = subtotal + gstAmount - discountAmount;

    const options = {
      amount: totalAmount * 100,
      currency: "INR",
      receipt: "order_" + Date.now(),
    };

    const razorpayOrder = await razorpay.orders.create(options);


    const newOrder = new Order({
      orderId: razorpayOrder.id,
      userId: userId,
      items: orderItems,
      address: {
        fullName: selectedAddress.fullName,
        phone: selectedAddress.phone,
        city: selectedAddress.city,
        state: selectedAddress.state,
        pincode: selectedAddress.pincode,
        addressLine: selectedAddress.addressLine
      },
      paymentMethod: "ONLINE",
      paymentStatus: "Pending",
      totalAmount,
      subtotal,
      gstAmount,
      discountAmount,
      status: "Placed"
    });

    await newOrder.save();

    res.json({
      success: true,
      order: razorpayOrder,
      dbOrderId: newOrder._id
    });

  } catch (error) {
    console.log("Create Order Error:", error);
    res.status(500).json({ success: false });
  }
};


const verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    } = req.body;

    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      await Order.findOneAndUpdate(
        { orderId: razorpay_order_id },
        { paymentStatus: "Failed" }
      );
      return res.status(400).json({ success: false, message: "Invalid signature" });
    }

    const userId = req.session.user;
    if (!userId) {
      return res.status(401).json({ success: false, message: "User not authenticated" });
    }


    const updatedOrder = await Order.findOneAndUpdate(
      { orderId: razorpay_order_id },
      { paymentStatus: "Paid" },
      { new: true }
    );

    if (!updatedOrder) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }


    for (const item of updatedOrder.items) {
      await Product.updateOne(
        { _id: item.productId, "variants.size": item.size },
        { $inc: { "variants.$.stock": -item.quantity } }
      );
    }

    await Cart.deleteOne({ userId });

    return res.json({ success: true });

  } catch (error) {
    console.log("Verify Payment Error:", error);
    return res.status(500).json({ success: false });
  }
};


module.exports = {
  createOrder,
  verifyPayment
}

