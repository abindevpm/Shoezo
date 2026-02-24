const Cart = require("../models/cartSchema");

const cartCountMiddleware = async (req, res, next) => {
  try {
   res.locals.cartCount = 0;

    if (req.session.user) {
      const cart = await Cart.findOne({ userId: req.session.user._id });
      res.locals.cartCount = cart ? cart.items.length : 0;
    } else {
      res.locals.cartCount = 0;
    }
    next();
  } catch (err) {
    next();
  }
};

module.exports = cartCountMiddleware;