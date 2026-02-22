const User = require("../../models/userSchema");
const Cart = require("../../models/cartSchema");
const Order = require("../../models/orderSchema")


const loadCheckout = async (req, res) => {
  try {
    const userId = req.session.user;

    if (!userId) {
      return res.redirect("/login");
    }

    const user = await User.findById(userId);
    const cart = await Cart.findOne({ userId }).populate({
      path: "items.productId",
      populate: [
        { path: "productOffer" },
        { path: "category", populate: { path: "categoryOffer" } }
      ]
    });

    if (!cart || cart.items.length === 0) {
      return res.redirect("/cart");
    }

    const today = new Date();
    let subtotal = 0;
    let baseSubtotal = 0;
    let totalItems = 0;

    cart.items.forEach(item => {
      const product = item.productId;
      const variant = product.variants.find(
        v => Number(v.size) === Number(item.size)
      );

      if (!variant) return;

      let appliedDiscount = 0;

      if (product.productOffer &&
        product.productOffer.isActive &&
        product.productOffer.startDate <= today &&
        product.productOffer.endDate >= today) {
        appliedDiscount = Math.max(appliedDiscount, Number(product.productOffer.discountValue) || 0);
      }


      if (product.category &&
        product.category.categoryOffer &&
        product.category.categoryOffer.isActive &&
        product.category.categoryOffer.startDate <= today &&
        product.category.categoryOffer.endDate >= today) {
        appliedDiscount = Math.max(appliedDiscount, Number(product.category.categoryOffer.discountValue) || 0);
      }

      const currentPrice = variant.offerPrice && variant.offerPrice > 0
  ? variant.offerPrice
  : variant.price;


      const quantity = Number(item.quantity);
      subtotal += currentPrice * quantity;
      baseSubtotal += Number(variant.price) * quantity;
      totalItems += quantity;
    });


    const discountAmount = req.session.discountAmount || 0;
    const offerDiscount = baseSubtotal - subtotal;
    const deliveryCharge = 0;
    const totalPrice = subtotal - discountAmount;

    req.session.subtotal = subtotal; 
    req.session.totalPrice = totalPrice;

    const addresses = user.addresses || [];






    res.render("checkout", {
      user,
      cartItems: cart.items,

      subtotal: baseSubtotal,
      offerDiscount,
      totalItems,
      discountAmount,
      deliveryCharge,
      totalPrice,
      addresses,
      razorpayKey: process.env.RAZORPAY_KEY_ID
    });


  } catch (error) {
    console.log("Checkout load error:", error);
    res.redirect("/500");
  }
};





const placeOrder = async (req, res) => {
  try {
    const userId = req.session.user._id || req.session.user;
    const { addressId, paymentMethod } = req.body;
    const user = await User.findById(userId);

    if (!userId) {
      console.log("Order placement failed: No user ID in session");
      return res.redirect("/login");
    }

    const cart = await Cart.findOne({ userId }).populate({
      path: "items.productId",
      populate: [
        { path: "productOffer" },
        { path: "category", populate: { path: "categoryOffer" } }
      ]
    });

    if (!cart || cart.items.length === 0) {
      console.log("Order placement failed: Empty cart for user", userId);
      return res.redirect("/cart");
    }

    const today = new Date();
    let subtotal = 0;
    let baseSubtotal = 0;
    let orderItems = [];
    let totalOfferDiscount = 0;

    for (const item of cart.items) {
      const product = item.productId;
      const variant = product.variants.find(
        v => Number(v.size) === Number(item.size)
      );
      if (!variant) {
        console.log("Variant not found for product", product._id, "size", item.size);
        continue;
      }

      let appliedDiscount = 0;

      if (product.productOffer &&
        product.productOffer.isActive &&
        product.productOffer.startDate <= today &&
        product.productOffer.endDate >= today) {
        appliedDiscount = Math.max(appliedDiscount, Number(product.productOffer.discountValue) || 0);
      }


      if (product.category &&
        product.category.categoryOffer &&
        product.category.categoryOffer.isActive &&
        product.category.categoryOffer.startDate <= today &&
        product.category.categoryOffer.endDate >= today) {
        appliedDiscount = Math.max(appliedDiscount, Number(product.category.categoryOffer.discountValue) || 0);
      }

     const currentPrice = variant.offerPrice && variant.offerPrice > 0
  ? variant.offerPrice
  : variant.price;

      const offerDiscountAmount = (variant.price - currentPrice) * item.quantity;
      totalOfferDiscount += offerDiscountAmount;

      subtotal += currentPrice * item.quantity;
      baseSubtotal += Number(variant.price) * item.quantity;

      orderItems.push({
        productId: product._id,
        size: item.size,
        quantity: item.quantity,
        price: currentPrice
      });
    }

    const discountAmount = req.session.discountAmount || 0;
    const appliedCouponCode = req.session.appliedCoupon;

    if (appliedCouponCode) {
      const Coupon = require("../../models/couponSchema");
      const coupon = await Coupon.findOne({ code: appliedCouponCode, isActive: true });
      if (!coupon || coupon.usedCount >= coupon.usageLimit) {
        return res.redirect("/checkout?error=Applied coupon is no longer available");
      }
    }

    const totalAmount = subtotal - discountAmount;


    console.log(`Processing ${paymentMethod} order for user ${userId}. Total: ${totalAmount}`);

    const selectedAddress = user.addresses.find(
      addr => addr._id.toString() === addressId
    );

    if (!selectedAddress) {
      console.log("Order placement failed: Address not found", addressId);
      return res.redirect("/checkout?error=Please select a valid address");
    }


    if (paymentMethod && paymentMethod.toUpperCase() === "WALLET") {
      if (!user.wallet || Array.isArray(user.wallet)) {
        user.wallet = { balance: 0, transactions: [] };
      }

      if (user.wallet.balance < totalAmount) {
        console.log("Insufficient wallet balance for user", userId, "Balance:", user.wallet.balance, "Need:", totalAmount);
        return res.redirect(`/checkout?error=Insufficient Wallet Balance (Current: ₹${user.wallet.balance})`);
      }
    }

    for (const item of cart.items) {
      const variant = item.productId.variants.find(
        v => Number(v.size) === Number(item.size)
      );
      if (variant) {
        variant.stock -= item.quantity;
        await item.productId.save();
      }
    }

    const generatedOrderId = "ORD-" + Date.now();


    if (paymentMethod && paymentMethod.toUpperCase() === "WALLET") {
      user.wallet.balance -= totalAmount;
      user.wallet.transactions.push({
        type: "debit",
        amount: totalAmount,
        description: `Order Payment (${generatedOrderId})`,
        orderId: null,
        date: new Date()
      });
      await user.save({ validateBeforeSave: false });
      console.log("Wallet deducted for user", userId);
    }

    const order = new Order({
      orderId: generatedOrderId,
      userId,
      items: orderItems,
      address: {
        fullName: selectedAddress.fullName,
        phone: selectedAddress.phone,
        city: selectedAddress.city,
        state: selectedAddress.state,
        pincode: selectedAddress.pincode,
        addressLine: selectedAddress.addressLine
      },
      paymentMethod: paymentMethod || "COD",
      paymentStatus: (paymentMethod && paymentMethod.toUpperCase() === "WALLET") ? "Paid" : "Pending",
      status: "Placed",
      subtotal: baseSubtotal,
      offerDiscount: baseSubtotal - subtotal,
      discountAmount,


      couponCode: req.session.appliedCoupon || null,
      totalOfferDiscount,
 referal,
      totalAmount
    });

    await order.save();

    if (req.session.appliedCoupon) {
      const Coupon = require("../../models/couponSchema");
      await Coupon.updateOne(
        { code: req.session.appliedCoupon },
        { $inc: { usedCount: 1 } }
      );
    }


    if (paymentMethod && paymentMethod.toUpperCase() === "WALLET") {
      const lastTransaction = user.wallet.transactions[user.wallet.transactions.length - 1];
      lastTransaction.orderId = order._id;
      await user.save({ validateBeforeSave: false });
    }

    await Cart.deleteOne({ userId });

    req.session.discountAmount = 0;
    req.session.appliedCoupon = null;

    return res.json({ success: true });

  } catch (err) {
    console.error("Order placement error:", err);
    res.redirect("/checkout?error=Internal Server Error");
  }
};






const loadOrderSuccess = (req, res) => {
  res.render("order-success");
};

const addAddressCheckout = async (req, res) => {
  try {
    const userId = req.session.user;
    if (!userId) {
      return res.status(401).json({ success: false, message: "User not authenticated" });
    }

    const {
      fullName,
      phone,
      addressLine,
      city,
      state,
      pincode,
      addressType,
      landmark
    } = req.body;


    if (!fullName || !phone || !addressLine || !city || !state || !pincode) {
      return res.status(400).json({ success: false, message: "Required fields are missing" });
    }

    const newAddress = {
      fullName,
      phone,
      addressLine,
      city,
      state,
      pincode,
      addressType: addressType || "HOME",
      landmark: landmark || ""
    };

    const user = await User.findByIdAndUpdate(
      userId,
      { $push: { addresses: newAddress } },
      { new: true }
    );

    const createdAddress = user.addresses[user.addresses.length - 1];

    res.json({
      success: true,
      message: "Address added successfully",
      address: createdAddress
    });
  } catch (error) {
    console.error("Add address checkout error:", error);
    res.status(500).json({ success: false, message: "Failed to add address" });
  }
};





module.exports = {
  loadCheckout,
  placeOrder,
  loadOrderSuccess,
  addAddressCheckout
};