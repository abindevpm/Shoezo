const Cart = require("../../models/cartSchema")
const Product = require("../../models/productSchema")
const StatusCodes = require("../../routes/utils/statusCodes")

const loadCart = async (req, res) => {
  try {
    const userId = req.user._id;

    if (!userId) {
      return res.redirect("/login");
    }

    const cart = await Cart.findOne({ userId })
      .populate({
        path: "items.productId",
        populate: [
          { path: "productOffer" },
          { path: "category", populate: { path: "categoryOffer" } }
        ]
      });

    if (!cart || cart.items.length === 0) {
      return res.render("cart", {
        cartItems: [],
        summary: null
      });
    }

    const today = new Date();
    let baseSubtotal = 0;
    const cartItems = cart.items.map(item => {
      const product = item.productId;
      const variant = product.variants.find(
        v => String(v.size) === String(item.size)
      );

      if (!variant) return null;

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

      const saleBase = variant.salePrice || variant.offerPrice || variant.price;
      baseSubtotal += item.quantity * saleBase;

      return {
        _id: item._id,
        product: product,
        size: item.size,
        quantity: item.quantity,
        price: currentPrice,
        total: item.quantity * currentPrice
      };
    }).filter(Boolean);

    const actualSubtotal = cartItems.reduce(
      (sum, item) => sum + item.total,
      0
    );

    const offerDiscount = baseSubtotal - actualSubtotal;
    const grandTotal = actualSubtotal;

    res.render("cart", {
      cartItems,
      summary: {
        itemsCount: cartItems.length,
        subtotal: baseSubtotal,
        gst: 0,
        discount: offerDiscount,
        grandTotal
      }
    });

  } catch (error) {
    console.log("Load cart have error", error);
  }
};


const addToCart = async (req, res) => {
  try {
    const productId = req.params.id;
    const userId = req.user._id;

    const { variant } = req.body;
    if (!variant) {
      return res.status(400).json({
        success: false,
        message: "Please select a size"
      });
    }

    const parsedVariant = JSON.parse(variant);
    const size = String(parsedVariant.size);
    console.log("ADDING SIZE:", typeof size, size);




    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    const matchedVariant = product.variants.find(
      v => String(v.size) === String(size)
    );

    if (!matchedVariant) {
      console.log("Variant not found");
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: "Selected size not found"
      });
    }



    const price = Number(matchedVariant.offerPrice || matchedVariant.price);

    let cart = await Cart.findOne({ userId });

    if (!cart) {
      cart = new Cart({
        userId,
        items: [{
          productId,
          size,
          quantity: 1,
          price
        }]
      });
    } else {
      const existingItem = cart.items.find(
        item =>
          item.productId.toString() === productId &&
          String(item.size) === String(size)
      );

      if (existingItem) {
        return res.status(400).json({
          success: false,
          message: "Product is already in your cart"
        });
      } else {
        if (matchedVariant.stock < 1) {
          return res.status(400).json({
            success: false,
            message: "This item is out of stock"
          });
        }

        cart.items.push({
          productId,
          size,
          quantity: 1,
          price
        });
      }
    }

    await cart.save();
    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Product successfully added to cart"
    });

  } catch (err) {
    console.log("Add to cart error:", err);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).send("Server Error");
  }
};





const updateCartQty = async (req, res) => {
  try {
    const userId = req.user._id;
    const { itemId, action } = req.body;

    const cart = await Cart.findOne({ userId });
    if (!cart) return res.json({ success: false });



    const item = cart.items.id(itemId);
    if (!item) return res.json({ success: false });

    if (action === "inc") {

      const product = await Product.findById(item.productId)
      if (!product) return res.json({ success: false })

      const variant = product.variants.find(
        v => String(v.size) === String(item.size)
      )

      if (!variant) return res.json({ success: false })


      if (item.quantity + 1 > variant.stock) {
        return res.json({
          success: false,
          message: `Only ${variant.stock} items available`
        });
      }

      item.quantity += 1;
    }


    if (action === "dec") {
      if (item.quantity > 1) {
        item.quantity -= 1;
      }
    }


    await cart.save();

    const populatedCart = await Cart.findById(cart._id).populate({
      path: "items.productId",
      populate: [
        { path: "productOffer" },
        { path: "category", populate: { path: "categoryOffer" } }
      ]
    });

    const today = new Date();
    let baseSubtotal = 0;
    const actualSubtotal = populatedCart.items.reduce((sum, i) => {
      const product = i.productId;
      const variant = product.variants.find(v => String(v.size) === String(i.size));
      if (!variant) return sum;

      let appliedDiscount = 0;
      if (product.productOffer && product.productOffer.isActive &&
        product.productOffer.startDate <= today && product.productOffer.endDate >= today) {
        appliedDiscount = Math.max(appliedDiscount, Number(product.productOffer.discountValue) || 0);
      }
      if (product.category && product.category.categoryOffer &&
        product.category.categoryOffer.isActive &&
        product.category.categoryOffer.startDate <= today && product.category.categoryOffer.endDate >= today) {
        appliedDiscount = Math.max(appliedDiscount, Number(product.category.categoryOffer.discountValue) || 0);
      }

      const currentPrice = variant.offerPrice && variant.offerPrice > 0
        ? variant.offerPrice
        : variant.price;

      const saleBase = variant.salePrice || variant.offerPrice || variant.price;
      baseSubtotal += i.quantity * saleBase;
      return sum + (i.quantity * currentPrice);
    }, 0);

    const offerDiscount = baseSubtotal - actualSubtotal;
    const grandTotal = actualSubtotal;


    const updatedItem = populatedCart.items.find(i => i._id.toString() === itemId);

    let itemTotal = 0;
    if (updatedItem) {
      const p = updatedItem.productId;
      const v = p.variants.find(varnt => String(varnt.size) === String(updatedItem.size));
      let disc = 0;
      if (p.productOffer?.isActive && p.productOffer.startDate <= today && p.productOffer.endDate >= today)
        disc = Math.max(disc, Number(p.productOffer.discountValue) || 0);
      if (p.category?.categoryOffer?.isActive && p.category.categoryOffer.startDate <= today && p.category.categoryOffer.endDate >= today)
        disc = Math.max(disc, Number(p.category.categoryOffer.discountValue) || 0);
      const cp = v.offerPrice && v.offerPrice > 0
        ? v.offerPrice
        : v.price;

      itemTotal = updatedItem.quantity * cp;
    }

    res.json({
      success: true,
      quantity: updatedItem.quantity,
      subtotal: baseSubtotal,
      gst: 0,
      itemTotal,
      discount: offerDiscount,
      grandTotal
    });

  } catch (err) {
    console.log(err, "UpdateCartQty has error");
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).res.json({ success: false });
  }



}


const removeCartItem = async (req, res) => {
  try {
    const userId = req.user._id;
    const { itemId } = req.body;

    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return res.json({ success: false });
    }


    cart.items = cart.items.filter(
      item => item._id.toString() !== itemId
    );

    await cart.save();

    const populatedCart = await Cart.findById(cart._id).populate({
      path: "items.productId",
      populate: [
        { path: "productOffer" },
        { path: "category", populate: { path: "categoryOffer" } }
      ]
    });

    const today = new Date();
    let baseSubtotal = 0;
    const actualSubtotal = populatedCart.items.reduce((sum, i) => {
      const product = i.productId;
      const variant = product.variants.find(v => String(v.size) === String(i.size));
      if (!variant) return sum;

      let appliedDiscount = 0;
      if (product.productOffer && product.productOffer.isActive &&
        product.productOffer.startDate <= today && product.productOffer.endDate >= today) {
        appliedDiscount = Math.max(appliedDiscount, Number(product.productOffer.discountValue) || 0);
      }
      if (product.category && product.category.categoryOffer &&
        product.category.categoryOffer.isActive &&
        product.category.categoryOffer.startDate <= today && product.category.categoryOffer.endDate >= today) {
        appliedDiscount = Math.max(appliedDiscount, Number(product.category.categoryOffer.discountValue) || 0);
      }

      const currentPrice = variant.offerPrice && variant.offerPrice > 0
        ? variant.offerPrice
        : variant.price;

      const saleBase = variant.salePrice || variant.offerPrice || variant.price;
      baseSubtotal += i.quantity * saleBase;
      return sum + (i.quantity * currentPrice);
    }, 0);

    const offerDiscount = baseSubtotal - actualSubtotal;
    const grandTotal = actualSubtotal;

    res.json({
      success: true,
      subtotal: baseSubtotal,
      gst: 0,
      discount: offerDiscount,
      grandTotal,
      cartCount: cart.items.length
    });

  } catch (error) {
    console.log("Remove cart item error:", error);
    res.status(StatusCodes.NOT_FOUND).json({ success: false });
  }
};


module.exports = {
  loadCart,
  addToCart,
  updateCartQty,
  removeCartItem
}