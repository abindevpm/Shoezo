const Wishlist = require("../../models/wishlist")
const Cart = require("../../models/cartSchema")
const Product = require("../../models/productSchema")


const getWishlist = async (req, res) => {
  try {
    const sessionUser = req.session.user;
    if (!sessionUser) {
      return res.render("wishlist", { wishlistItems: [] });
    }

    const userId = sessionUser._id || sessionUser;

    const wishlist = await Wishlist.findOne({ userId })
      .populate({
        path: "products",
        populate: [
          { path: "productOffer" },
          { path: "category", populate: { path: "categoryOffer" } }
        ]
      });

    const today = new Date();
    const processedProducts = (wishlist ? wishlist.products : []).map(p => {
      const productObj = p.toObject();
      const v = productObj.variants && productObj.variants.length > 0 ? productObj.variants[0] : null;

      if (v) {
        let appliedDiscount = 0;
        // Check Product Offer
        if (productObj.productOffer &&
          productObj.productOffer.isActive &&
          productObj.productOffer.startDate <= today &&
          productObj.productOffer.endDate >= today) {
          appliedDiscount = Math.max(appliedDiscount, Number(productObj.productOffer.discountValue) || 0);
        }

        // Check Category Offer
        if (productObj.category &&
          productObj.category.categoryOffer &&
          productObj.category.categoryOffer.isActive &&
          productObj.category.categoryOffer.startDate <= today &&
          productObj.category.categoryOffer.endDate >= today) {
          appliedDiscount = Math.max(appliedDiscount, Number(productObj.category.categoryOffer.discountValue) || 0);
        }

        productObj.displayPrice = appliedDiscount > 0
          ? Math.floor(v.price * (1 - appliedDiscount / 100))
          : v.price;
      } else {
        productObj.displayPrice = 0;
      }
      return productObj;
    });

    res.render("wishlist", {
      wishlistItems: processedProducts
    });

  } catch (error) {
    console.log("Wishlist Error", error)
    res.redirect("/productlist");
  }
}

const addToWishlist = async (req, res) => {
  try {

    const sessionUser = req.session.user;
    if (!sessionUser) {
      return res.json({ success: false, message: "Login required" });
    }

    const userId = sessionUser._id || sessionUser;

    if (!userId) {
      return res.json({ success: false, message: "User ID not found" });
    }

    const { productId } = req.body;

    let wishlist = await Wishlist.findOne({ userId });

    if (!wishlist) {
      wishlist = new Wishlist({
        userId: userId,
        products: [productId]
      });
    } else {
      if (!wishlist.products.some(id => id.toString() === productId)) {
        wishlist.products.push(productId);
      }
    }

    await wishlist.save();

    res.json({ success: true });

  } catch (error) {
    console.log("Add to Wishlist Error:", error);
    res.json({ success: false });
  }
};



const removeFromWishlist = async (req, res) => {
  try {
    const sessionUser = req.session.user;
    if (!sessionUser) {
      return res.json({ success: false, message: "Login required" });
    }

    const userId = sessionUser._id || sessionUser;
    const { productId } = req.body;

    await Wishlist.updateOne(
      { userId },
      { $pull: { products: productId } }
    );

    res.json({ success: true });
  } catch (error) {
    console.log("RemoveFromWishlist Error", error);
    res.json({ success: false });
  }
};


const moveToCart = async (req, res) => {
  try {

    const sessionUser = req.session.user;
    if (!sessionUser) {
      return res.json({ success: false, message: "Please login" });
    }

    const userId = sessionUser._id || sessionUser;
    const { productId } = req.body;

    const product = await Product.findById(productId);
    if (!product || product.variants.length === 0) {
      return res.json({ success: false, message: "Product not found" });
    }

    const defaultVariant = product.variants[0];
    const size = defaultVariant.size;
    const price = defaultVariant.offerPrice || defaultVariant.price;

    let cart = await Cart.findOne({ userId });

    if (!cart) {
      cart = new Cart({
        userId,
        items: [{ productId, size, quantity: 1, price }]
      });
    } else {

      const existingItem = cart.items.find(
        item =>
          item.productId.toString() === productId &&
          String(item.size) === String(size)
      );

      if (existingItem) {
        existingItem.quantity += 1;
      } else {
        cart.items.push({ productId, size, quantity: 1, price });
      }
    }

    await cart.save();

    await Wishlist.updateOne(
      { userId },
      { $pull: { products: productId } }
    );

    res.json({ success: true });
  } catch (error) {
    console.log("Move to Cart Error:", error);
    res.json({ success: false });
  }
};





module.exports = {
  addToWishlist,
  removeFromWishlist,
  getWishlist,
  moveToCart
}