const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const Brand = require("../../models/brandSchema");
const Offer = require("../../models/offers")
  
const fs = require("fs")

const sharp = require("sharp");
const path = require("path");
const StatusCodes = require("../../routes/utils/statusCodes");

const loadProducts = async (req, res) => {
  try {
    const search = req.query.search || "";
    const categoryFilter = req.query.category || "";
    const minPrice = req.query.minPrice ? Number(req.query.minPrice) : null;
    const maxPrice = req.query.maxPrice ? Number(req.query.maxPrice) : null;


    let page = search ? 1 : parseInt(req.query.page) || 1;
    let limit = 5;
    let skip = (page - 1) * limit;


    let query = { isDeleted: false,
  
    };


    if (search) {
      query.name = { $regex: search, $options: "i" };
    }

    if (categoryFilter) {
      const listedCategoryIds = await Category.find({
        isDeleted: false,
        isListed: true
      }).distinct("_id");

      if (listedCategoryIds.includes(categoryFilter)) {
        query.category = categoryFilter;
      }
    }

    if (minPrice !== null || maxPrice !== null) {
      query.price = {};
      if (minPrice !== null) query.price.$gte = minPrice;
      if (maxPrice !== null) query.price.$lte = maxPrice;
    }

    const totalProducts = await Product.countDocuments(query);
    const totalPages = Math.ceil(totalProducts / limit);



    const products = await Product.find(query)
      .populate({
        path: "category",
        match: { isListed: true, isDeleted: false }
      })
      .populate("brand")
      .populate("productOffer")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

      let totalStock = 0;
   
         



    const categories = await Category.find({ isDeleted: false, isListed: true });

    res.render("products", {
      products,
      categories,
      currentPage: page,
      totalPages,
      search,
      categoryFilter,
      minPrice: req.query.minPrice || "",
      maxPrice: req.query.maxPrice || "",
    totalStock
    });

  } catch (error) {
    console.log("Load Products Error:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).send("Load Product Error");
  }
};








const AddProducts = async (req, res) => {
  try {
    const data = req.body;

    if (!data.category) {
      return res.redirect("/admin/add-products?status=error");
    }

    const categoryExists = await Category.findById(data.category);
    if (!categoryExists) {
      return res.redirect("/admin/add-products?status=error");
    }

    const productExists = await Product.findOne({ name: data.name });
    if (productExists) {
      return res.redirect("/admin/add-products?status=exists");
    }


    const images = [];
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => images.push(file.filename));
    }

    const rawVariants = data.variants
      ? Object.values(data.variants)
      : [];

    if (rawVariants.length === 0) {
      return res.redirect("/admin/add-products?status=error");
    }


    const variants = rawVariants.map(v => ({
      ...v,
      salePrice: Number(v.offerPrice) || Number(v.price)
    }));

    const newProduct = new Product({
      name: data.name,
      brand: data.brand,
      category: data.category,
      description: data.description,
      images: images,
      variants: variants,
      isDeleted: false,
      isListed: true
    });

    await newProduct.save();

    return res.redirect("/admin/add-products?status=success");




  } catch (error) {
    console.log("Add product error:", error);
    return res.redirect("/admin/add-products?status=error");
  }
};




const loadAddProducts = async (req, res) => {
  try {
    const categories = await Category.find({ isDeleted: false, isListed: true });
    const brands = await Brand.find({ isDeleted: false, isListed: true });

    res.render("add-products", {
      categories,
      brands
    });

  } catch (error) {
    console.log("Load Add product Error:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).send("Load Add product Error");
  }
};



const loadEditProduct = async (req, res) => {
  try {
    const id = req.params.id;

    const product = await Product.findOne({
      _id: id,
      isDeleted: false,

    })
      .populate("category")
      .populate("brand");

    if (!product) {
      return res.status(404).send("Product not found");
    }

    const categories = await Category.find({
      isDeleted: false,
      isListed: true
    });

    const brands = await Brand.find({
      isDeleted: false,
      isListed: true
    });

    res.render("edit-product", {
      product,
      categories,
      brands
    });

  } catch (error) {
    console.log("Edit product error:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).send("Internal Server Error");
  }
};




const updateProduct = async (req, res) => {
  try {
    const id = req.params.id;
    const data = req.body;

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).send("Product not found");
    }


    let variants = [];

    if (data.variants) {
      const rawVariants = Array.isArray(data.variants)
        ? data.variants
        : Object.values(data.variants);

    
      variants = rawVariants.map(v => ({
        ...v,
        salePrice: Number(v.offerPrice) || Number(v.price)
      }));
    }

    const updateData = {
      name: data.name,
      brand: data.brand,
      description: data.description,
      price: data.price,
      offerPrice: data.offerPrice,
      category: data.category,
      variants: variants
    };


    if (req.files && req.files.length > 0) {
      const newImages = req.files.map(file => file.filename);
      updateData.images = [...product.images, ...newImages];
    }

    await Product.findByIdAndUpdate(id, updateData);

    res.redirect("/admin/products");

  } catch (error) {
    console.log("Product Update Error:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).send("Internal Server Error");
  }
};



const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    await Product.findByIdAndUpdate(id, {
      isDeleted: true,
      isListed: false
    });

    res.json({ success: true });

  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false });
  }
};





const deleteProductImage = async (req, res) => {
  try {
    const { productId, imgName } = req.params;


    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      { $pull: { images: imgName } },
      { new: true }
    );

    if (!updatedProduct) {
      return res.json({ success: false, message: "Product not found" });
    }


    const imagePath = path.join(__dirname, "../../public/uploads/product-images", imgName);

    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }

    return res.json({ success: true });

  } catch (error) {
    console.log("Delete product image error:", error);
    return res.json({ success: false });
  }
};


const toggleProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id);
    if (!product) {
      return res.json({ success: false });
    }

    product.isListed = !product.isListed;
    await product.save();

    res.json({ success: true, isListed: product.isListed });

  } catch (err) {
    console.log(err,"toggle Product Error Occured");
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false });
  }
};



const manageProductOffer = async (req, res) => {
  try {
    const { productId, discountValue, startDate, endDate } = req.body;
    const discount = Number(discountValue);

    if (isNaN(discount) || discount < 0 || discount > 100) {
      return res.json({ success: false, message: "Invalid discount value" });
    }

    const product = await Product.findById(productId).populate({ path: "category", populate: { path: "categoryOffer" } });
    if (!product) {
      return res.json({ success: false, message: "Product not found" });
    }

    const categoryOffer = product.category?.categoryOffer;
    const catDiscount = (categoryOffer && categoryOffer.isActive) ? Number(categoryOffer.discountValue) : 0;
    const finalDiscount = Math.max(discount, isNaN(catDiscount) ? 0 : catDiscount);
    if (product.variants && product.variants.length > 0) {
      product.variants.forEach(variant => {
        
        if (!variant.salePrice) {
          variant.salePrice = variant.offerPrice || variant.price;
        }
        const basePrice = Number(variant.salePrice);
        variant.offerPrice = Math.floor(basePrice * (1 - finalDiscount / 100));
      });
    }

    if (product.productOffer) {
      await Offer.findByIdAndUpdate(product.productOffer._id, {
        discountValue: discount,
        startDate,
        endDate,
        isActive: true
      });
    } else {
      const newOffer = await Offer.create({
        offerType: "product",
        discountType: "percentage",
        discountValue: discount,
        product: productId,
        startDate,
        endDate,
        isActive: true
      });
      product.productOffer = newOffer._id;
    }

    product.markModified('variants');
    await product.save();

    return res.json({ success: true, message: "Offer applied successfully" });

  } catch (error) {
    console.error("Product Offer Error:", error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: "Server error occurred" });
  }
}





const removeProductOffer = async (req, res) => {
  try {
    const { productId } = req.body;
    const product = await Product.findById(productId).populate("category");

    if (!product) {
      return res.json({ success: false, message: "Product not found" });
    }

    product.productOffer = null;


    const category = await Category.findById(product.category._id).populate("categoryOffer");

    if (category && category.categoryOffer && category.categoryOffer.isActive) {
      const discount = category.categoryOffer.discountValue;
      product.variants.forEach(variant => {
        const base = Number(variant.salePrice || variant.price);
        variant.offerPrice = Math.floor(base * (1 - discount / 100));
      });
    } else {
      product.variants.forEach(variant => {
    
        variant.offerPrice = variant.salePrice || variant.price;
      });
    }

    product.markModified('variants');
    await product.save();

    return res.json({ success: true, message: "Offer removed successfully" });

  } catch (error) {
    console.error("Remove Product Offer Error:", error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: "Server error occurred" });
  }
}

module.exports = {
  loadProducts,
  loadAddProducts,
  AddProducts,
  loadEditProduct,
  updateProduct,
  deleteProduct,
  deleteProductImage,
  toggleProduct,
  manageProductOffer,
  removeProductOffer
};
