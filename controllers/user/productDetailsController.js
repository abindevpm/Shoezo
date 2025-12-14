const Product = require("../../models/productSchema");

const loadProductDetails = async (req, res) => {
  try {
    const id = req.params.id;

    const product = await Product.findById(id).populate("category");

    if (!product) {
      return res.redirect("/productlist");
    }

    
    res.render("productDetails", { 
        product, 
        reviews: [],          
        similarProducts: []   
    });

  } catch (err) {
    console.log("Product Details Error:", err);
    res.status(500).send("Internal Server Error");
  }
};

module.exports = { 
    
    loadProductDetails };
