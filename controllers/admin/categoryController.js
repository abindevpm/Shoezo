const Category = require("../../models/categorySchema");
const Product = require("../../models/productSchema");
const Offer = require("../../models/offers");
const StatusCodes = require("../../routes/utils/statusCodes");

const categoryInfo = async (req, res) => {
  try {
    let search = req.query.search || "";
    const page = parseInt(req.query.page) || 1
    const limit = 3;
    const skip = (page-1)*limit


    const query = {
      isDeleted: false,
      name: { $regex: search, $options: "i" }
    }

  
      const totalCategory = await Category.countDocuments(query)
      const totalPages = Math.ceil(totalCategory/limit)


    const categories = await Category.find(query)
      .populate("categoryOffer")
      .sort({ createdAt: -1 })
       .skip(skip)
       .limit(limit)

    res.render("category", {
      categories,
       currentPage:page,
       totalPages,
       limit,
      search
    })



  } catch (error) {
    console.log("Category Info error", error)
    return res.status(StatusCodes.BAD_REQUEST)

  }
}


const addCategory = async (req, res) => {
  try {

    let { name, description } = req.body;


    name = name?.trim();
    description = description?.trim();

    if (!name || !description) {
      return res.json({
        success: false,
        message: "All fields are required"
      });
    }

    if (description.length < 10) {
      return res.json({
        success: false,
        message: "Description must be at least 10 characters"
      });
    }


    const exists = await Category.findOne({
      name: { $regex: `^${name}$`, $options: "i" }
    });

    if (exists) {
      return res.json({
        success: false,
        message: "Category already exists"
      });
    }

    await Category.create({
      name,
      description,
      isListed: true,
      isDeleted: false
    });

    return res.json({
      success: true,
      message: "Category added successfully"
    });

  } catch (error) {
    console.log(error,"ADD category Error");
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false });
  }
};




const toggleCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findById(id);
    if (!category) {
      return res.json({ success: false });
    }

    category.isListed = !category.isListed;
    await category.save();

    return res.json({
      success: true,
      isListed: category.isListed
    });

  } catch (err) {
    console.log("Toggle Category Error:", err);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false });
  }
};


const editCategory = async (req, res) => {
  try {

    const id = req.params.id;
    let { name, description } = req.body;

    name = name?.trim();
    description = description?.trim();

    if (!name || !description) {
      return res.json({
        success: false,
        message: "All fields are required"
      });
    }

    await Category.findByIdAndUpdate(id, {
      name,
      description
    });

    return res.json({
      success: true,
      message: "Category updated successfully"
    });

  } catch (error) {
    console.log(error);
    return res.json({
      success: false,
      message: "Internal Server Error"
    });
  }
};


const manageCategoryOffer = async (req, res) => {
  try {
    const { categoryId, discountValue, startDate, endDate } = req.body;
    const discount = Number(discountValue);

    const category = await Category.findById(categoryId).populate("categoryOffer");

    if (!category) {
      return res.json({ success: false, message: "Category not found" });
    }




     const today = new Date();
     today.setHours(0,0,0,0)

     const start = new Date(startDate)
     const end = new Date(endDate)

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
  return res.json({ success: false, message: "Invalid date format" });
}





if (discount <= 0 || discount > 100) {
  return res.json({ success: false, message: "Invalid discount value" });
}


      
     if(start<today){
      return res.json({success:false,message:"Start date cannot be in the past"})
     }

     if(end<=start){
      return res.json({success:false,message:"End date must be after start date"})
     }


     


    if (category.categoryOffer) {
      await Offer.findByIdAndUpdate(category.categoryOffer._id, {
        discountValue: discount,
       startDate: start,
       endDate: end,
        isActive: true
      });
    } else {
      const newOffer = await Offer.create({
        offerType: "category",
        discountType: "percentage",
        discountValue: discount,
        category: categoryId,
       startDate: start,
       endDate: end,
        isActive: true
      });
      category.categoryOffer = newOffer._id;
      await category.save();
    }

    const products = await Product.find({ category: categoryId }).populate("productOffer");

    for (const product of products) {
      if (product.variants && product.variants.length > 0) {
        let productDiscount = 0;
        if (product.productOffer && product.productOffer.isActive) {
          productDiscount = Number(product.productOffer.discountValue) || 0;
        }

        const finalDiscount = Math.max(discount, productDiscount);

        product.variants.forEach(variant => {
      
          if (!variant.salePrice) {
            variant.salePrice = variant.offerPrice || variant.price;
          }
          const base = Number(variant.salePrice);
          variant.offerPrice = Math.floor(base * (1 - finalDiscount / 100));
        });
        product.markModified('variants');
        await product.save();
      }
    }

    return res.json({ success: true, message: "Category offer updated successfully" });

  } catch (error) {
    console.log(error, "Manage Category error")
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: "Manage Category Offer Error" });
  }
}



const removeCategoryOffer = async (req, res) => {
  try {
    const { categoryId } = req.body;
    const category = await Category.findById(categoryId);

    if (!category) {
      return res.json({ success: false, message: "Category not found" });
    }

    category.categoryOffer = null;
    await category.save();

    const products = await Product.find({ category: categoryId }).populate("productOffer");

    for (const product of products) {
      if (product.variants && product.variants.length > 0) {
        let productDiscount = 0;
        if (product.productOffer && product.productOffer.isActive) {
          productDiscount = Number(product.productOffer.discountValue) || 0;
        }

        product.variants.forEach(variant => {
          const base = Number(variant.salePrice || variant.price);
          variant.offerPrice = productDiscount > 0
            ? Math.floor(base * (1 - productDiscount / 100))
            : (variant.salePrice || variant.price);
        });
        product.markModified('variants');
        await product.save();
      }
    }

    return res.json({ success: true, message: "Category offer removed successfully" });

  } catch (error) {
    console.error("Remove Category Offer Error:", error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: "Remove Category Error" });
  }
}


module.exports = {
  categoryInfo,
  addCategory,
  toggleCategory,
  editCategory,
  manageCategoryOffer,
  removeCategoryOffer

};
