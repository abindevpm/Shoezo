
const Product = require("../../models/productSchema");

const loadProductDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findOne({
      _id: id,
      isDeleted: false,
      isListed: true
    })
      .populate("category")
      .populate("brand");

    
    if (!product) {
      return res.redirect("/productlist");
    }

    res.render("productDetails", {
      product,
      reviews: [],
      similarProducts: []
    });

  } catch (error) {
    console.log("Product Details Error:", error);
    return res.redirect("/productlist");
  }
};

module.exports = { loadProductDetails };
