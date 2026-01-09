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
    const cart = await Cart.findOne({ userId }).populate("items.productId");

    if (!cart || cart.items.length === 0) {
      return res.redirect("/cart");
    }

    let subtotal = 0;
let totalItems = 0;

cart.items.forEach(item => {
  const variant = item.productId.variants.find(
    v => Number(v.size) === Number(item.size)
  );

  if (!variant) return;

  const price = Number(variant.offerPrice || variant.price);
  const quantity = Number(item.quantity);

  subtotal += price * quantity;
  totalItems += quantity;
});



const gstRate = 0.05;        
const discountRate = 0.30;  

const gstAmount = +(subtotal * gstRate).toFixed(2);
const discountAmount = +(subtotal * discountRate).toFixed(2);
const deliveryCharge = 0;

const totalPrice = +(subtotal + gstAmount - discountAmount).toFixed(2);

 const addresses = user.address || [];






res.render("checkout", {
  user,
  cartItems: cart.items,

  subtotal,
  totalItems,
  gstAmount,
  discountAmount,
  deliveryCharge,
  totalPrice,

      addresses
});

    
  } catch (error) {
    console.log("Checkout load error:", error);
    res.redirect("/500");
  }
};





const placeOrder = async (req, res) => {
  try {
    const userId = req.session.user;
    const { addressId, paymentMethod } = req.body;

    if (!userId) return res.redirect("/login");

    const user = await User.findById(userId);
    const cart = await Cart.findOne({ userId }).populate("items.productId");

    if (!cart || cart.items.length === 0) {
      return res.redirect("/cart");
    }

    let subtotal = 0;
    let orderItems = [];

    for (const item of cart.items) {
      const variant = item.productId.variants.find(
        v => Number(v.size) === Number(item.size)
      );
      if (!variant) continue;

      const price = Number(variant.offerPrice || variant.price);
      subtotal += price * item.quantity;

      orderItems.push({
        productId: item.productId._id,
        size: item.size,
        quantity: item.quantity,
        price
      });

      variant.stock -= item.quantity;
      await item.productId.save();
    }

    const gstAmount = +(subtotal * 0.05).toFixed(2);
    const discountAmount = +(subtotal * 0.30).toFixed(2);
    const totalAmount = +(subtotal + gstAmount - discountAmount).toFixed(2);

    const selectedAddress = user.addresses.find(
      addr => addr._id.toString() === addressId
    );

    const order = new Order({
      userId,
      items: orderItems,
      address: selectedAddress,
      paymentMethod: paymentMethod || "COD",
      status: "Placed",
      subtotal,
      gstAmount,
      discountAmount,
      totalAmount
    });

    await order.save();
    await Cart.deleteOne({ userId });

    res.redirect("/order-success");

  } catch (err) {
    console.log(err);
    res.redirect("/checkout");
  }
};






const loadOrderSuccess = (req, res) => {
  res.render("order-success");
};








module.exports = {
  loadCheckout,
  placeOrder,
  loadOrderSuccess
};