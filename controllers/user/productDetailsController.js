
const Product = require("../../models/productSchema");
const Review = require("../../models/reviewSchema");
const Wishlist = require("../../models/wishlist");
const StatusCodes = require("../../routes/utils/statusCodes")

const loadProductDetails = async (req, res) => {
  try {
    const { id } = req.params;


    const reviews = await Review.find({ product: id })
      .populate("user", "name")
      .sort({ createdAt: -1 });


    const product = await Product.findOne({
      _id: id,
      isDeleted: false,
      isListed: true
    })
      .populate("category")
      .populate("brand")
      .populate("productOffer")
      .populate({ path: "category", populate: { path: "categoryOffer" } });

    if (!product || !product.category || !product.category.isListed || !product.brand || !product.brand.isListed) {
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


    const categoryId = product.category?._id;

      let similarProducts = [];

       if(categoryId){
        similarProducts = await Product.find({
          category:categoryId,
          _id:{$ne:product._id},
          isDeleted:false,
          isListed:true
        })
        .limit(4)
        .populate("category")
        .populate("brand");
       }

        let isInWishlist = false;
        const sessionUser = req.session.user;
        if (sessionUser) {
          const userId = sessionUser._id || sessionUser;
          const wishlist = await Wishlist.findOne({ userId });
          if (wishlist) {
            isInWishlist = wishlist.products.some(pId => pId.toString() === id);
          }
        }

         console.log(similarProducts)




    res.render("productDetails", {
      product,
      reviews,
      similarProducts,
      isInWishlist
    });

  } catch (error) {
    console.log("Product Details Error:", error);
    res.status(StatusCodes.NOT_FOUND).redirect("/productlist");
  }
};

module.exports = { loadProductDetails };
