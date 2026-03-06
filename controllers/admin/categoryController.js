const Category = require("../../models/categorySchema");
const Product = require("../../models/productSchema");
const Offer = require("../../models/offers")

const categoryInfo = async (req, res) => {
  try {
    let search = req.query.search || "";
    let page = parseInt(req.query.page) || 1;
    let limit = 3;

    const query = {
      isDeleted: false,
      name: { $regex: search, $options: "i" }
    }

    const total = await Category.countDocuments(query);
    const categories = await Category.find(query)
      .populate("categoryOffer")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.render("category", {
      categories,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      search
    })



  } catch (error) {
    console.log("Category Info error", error)
    return res.status(404)

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
    console.log(error);
    return res.status(500).json({ success: false });
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
    res.status(500).json({ success: false });
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

    if (category.categoryOffer) {
      await Offer.findByIdAndUpdate(category.categoryOffer._id, {
        discountValue: discount,
        startDate,
        endDate,
        isActive: true
      });
    } else {
      const newOffer = await Offer.create({
        offerType: "category",
        discountType: "percentage",
        discountValue: discount,
        category: categoryId,
        startDate,
        endDate,
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
    return res.status(500).json({ success: false, message: "Internal server error" });
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
    return res.status(500).json({ success: false, message: "Server error occurred" });
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
