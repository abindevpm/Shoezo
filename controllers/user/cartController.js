const Cart = require("../../models/cartSchema")
const Product = require("../../models/productSchema")
const loadCart = async (req, res) => {

  try{

    const userId = req.session.user?._id || req.session.user;

    if(!userId){
      return res.redirect("/login")

    }

    const cart = await Cart.findOne({userId})
    .populate("items.productId");

    if(!cart || cart.items.length === 0){
      return  res.render("cart",{
        cartItems:[],
        summary:null
      });

    }

     const cartItems = cart.items.map(items=>({
      _id:items._id,
      product:items.productId,
      size:items.size,
      quantity:items.quantity,
      price:items.price,
      total:items.quantity*items.price
     }))

     const subtotal = cartItems.reduce((sum,items)=>sum+items.total,0)

     const gst = Math.round(subtotal*0.10)
     const discount = Math.round(subtotal*0.30)
     const grandTotal = subtotal+gst-discount;

     res.render("cart",{
      cartItems,
      summary:{
        itemsCount:cartItems.length,
        subtotal,
        gst,
        discount,
        grandTotal

      }
     })

  }catch(error){
    console.log("Load cart have error",error)

  }


};



const addToCart = async (req, res) => {
  try {
    const productId = req.params.id;
    const userId = req.session.user?._id || req.session.user;

    if (!userId) return res.redirect("/login");

    const { variant } = req.body;
    if (!variant) return res.redirect(req.get("referer"));

    const parsedVariant = JSON.parse(variant);
    const size = parsedVariant.size;

    
    const product = await Product.findById(productId);
    if (!product) return res.redirect("/productlist");

    const matchedVariant = product.variants.find(
      v => String(v.size) === String(size)
    );

    if (!matchedVariant) {
      console.log("Variant not found");
      return res.redirect("/productlist");
    }

    const price = matchedVariant.price;

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
      
        if (existingItem.quantity < 10) {
          existingItem.quantity += 1;
        }
      } else {
        cart.items.push({
          productId,
          size,
          quantity: 1,
          price
        });
      }
    }

    await cart.save();
    res.redirect("/cart");

  } catch (err) {
    console.log("Add to cart error:", err);
    res.status(500).send("Server Error");
  }
};



const updateCartQty = async(req,res)=>{

  try{
    
        const userId = req.session.user?._id || req.session.user;
       const { itemId, action } = req.body;

      const cart = await Cart.findOne({ userId });
    if (!cart) return res.json({ success: false });


    
    const item = cart.items.id(itemId);
    if (!item) return res.json({ success: false });

    if (action === "inc") {
      if (item.quantity >= 10) {
        return res.json({
          success: false,
          message: "MAX_LIMIT"
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

      const subtotal = cart.items.reduce(
      (sum, i) => sum + i.quantity * i.price,
      0
    );

    const gst = Math.round(subtotal * 0.18);
    const discount = Math.round(subtotal * 0.30);
    const grandTotal = subtotal + gst - discount;
    const itemTotal = item.quantity * item.price;



        res.json({
      success: true,
      quantity: item.quantity,
      subtotal,
      gst,
      itemTotal,
      discount,
      grandTotal
    });

  } catch (err) {
    console.log(err,"UpdateCartQty has error");
    res.json({ success: false });
  }


    

}


const removeCartItem = async (req, res) => {
  try {
    const userId = req.session.user?._id || req.session.user;
    const { itemId } = req.body;

    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return res.json({ success: false });
    }

    // 🔥 remove item
    cart.items = cart.items.filter(
      item => item._id.toString() !== itemId
    );

    await cart.save();

    // 🔁 recalc totals
    const subtotal = cart.items.reduce(
      (sum, i) => sum + i.quantity * i.price,
      0
    );

    const gst = Math.round(subtotal * 0.18);
    const discount = Math.round(subtotal * 0.30);
    const grandTotal = subtotal + gst - discount;

    res.json({
      success: true,
      subtotal,
      gst,
      discount,
      grandTotal,
      cartCount: cart.items.length
    });

  } catch (error) {
    console.log("Remove cart item error:", error);
    res.json({ success: false });
  }
};











module.exports = {
    loadCart,
    addToCart,
    updateCartQty,
    removeCartItem
}