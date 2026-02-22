
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
      .populate("brand")
      .populate("productOffer")
      .populate({ path: "category", populate: { path: "categoryOffer" } });

    if (!product) {
      return res.redirect("/productlist");
    }

    const today = new Date();
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

    product.discount = appliedDiscount;

    if (product.variants && product.variants.length > 0) {
      product.variants.forEach(v => {
        const basePrice = Number(v.salePrice || v.price);
        if (appliedDiscount > 0) {
          v.offerPrice = Math.floor(basePrice * (1 - appliedDiscount / 100));
        } else {
          v.offerPrice = basePrice;
        }
      });
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
