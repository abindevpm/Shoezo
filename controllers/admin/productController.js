    const Product = require("../../models/productSchema");
    const Category = require("../../models/categorySchema");
    const Brand = require("../../models/brandSchema");

    const fs = require("fs")

    const sharp = require("sharp");
    const path = require("path");

    const loadProducts = async (req, res) => {
        try {
            const search = req.query.search || "";
            const categoryFilter = req.query.category || "";
            const minPrice = req.query.minPrice ? Number(req.query.minPrice) : null;
            const maxPrice = req.query.maxPrice ? Number(req.query.maxPrice) : null;

            
            let page = parseInt(req.query.page) || 1; 
            let limit = 5; // number of products per page
            let skip = (page - 1) * limit;

            
            let query = {};

            if (search) {
                query.name = { $regex: search, $options: "i" };
            }

            if (categoryFilter) {
                query.category = categoryFilter;
            }

        
            if (minPrice !== null || maxPrice !== null) {
                query.price = {};
                if (minPrice !== null) query.price.$gte = minPrice;
                if (maxPrice !== null) query.price.$lte = maxPrice;
            }

            
            const totalProducts = await Product.countDocuments(query);
            const totalPages = Math.ceil(totalProducts / limit);

            
            const products = await Product.find(query)
                .populate("category")
                .populate("brand")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit);

            const categories = await Category.find({ isDeleted: false });

            res.render("products", {
                products,
                categories,
                currentPage: page,
                totalPages,
                search,
                categoryFilter,
                minPrice: req.query.minPrice || "",
                maxPrice: req.query.maxPrice || ""
            });

        } catch (error) {
            console.log("Load Products Error:", error);
            res.status(500).send("Internal Server Error");
        }
    };

    const AddProducts = async (req, res) => {
        try {
            const data = req.body;

            if (!data.category || data.category.trim() === "") {
                return res.status(400).send("Please select a category before submitting.");
            }

            const categoryExists = await Category.findById(data.category);
            if (!categoryExists) {
                return res.status(400).send("Invalid category");
            }

        
            const productExists = await Product.findOne({ name: data.name });
            if (productExists) {
                return res.status(400).send("Product already exists");
            }

            
            const images = [];

            if (req.files && req.files.length > 0) {
                req.files.forEach(file => {
                    images.push(file.filename); // <-- just push
                });
            }

            
            const newProduct = new Product({
                name: data.name,
                brand: data.brand,
                category: data.category,
                description: data.description,
                price: data.price,
                offerPrice: data.offerPrice,
                images: images,
                variants: [
                    {
                        size: data.size,
                        color: data.color,
                        stock: data.stock
                    }
                ],
                isDeleted: false
            });


            await newProduct.save();

            return res.redirect("/admin/products");

        } catch (error) {
            console.log("Product upload error:", error);
            return res.status(500).send("Internal Server Error");
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
    res.status(500).send("Internal Server Error");
  }
};

const loadEditProduct = async (req, res) => {
  try {
    const id = req.params.id;

    const product = await Product.findById(id)
      .populate("category")
      .populate("brand"); // ✅ IMPORTANT

    const categories = await Category.find({ isDeleted: false });
    const brands = await Brand.find({ isDeleted: false });

    res.render("edit-product", {
      product,
      categories,
      brands
    });

  } catch (error) {
    console.log("Edit product error:", error);
    res.status(500).send("Internal Server Error");
  }
};














    

    const updateProduct = async (req, res) => {
        try {
            const id = req.params.id;

            const updatedData = {
                name: req.body.name,
                brand: req.body.brand,
                description: req.body.description,
                price: req.body.price,
                offerPrice: req.body.offerPrice,
                category: req.body.category,
                variants: [
                    {
                        size: req.body.size,
                        color: req.body.color,
                        stock: req.body.stock
                    }
                ]
            };

            if (req.files && req.files.length > 0) {
                updatedData.images = req.files.map(file => file.filename);
            }

            await Product.findByIdAndUpdate(id, updatedData);
            res.redirect("/admin/products");

        } catch (error) {
            console.log("Product Update Error:", error);
            res.status(500).send("Internal Server Error");
        }
    };


    const deleteProduct = async(req,res)=>{


        try {
        const { id } = req.params;
        const { isDeleted } = req.body;

        await Product.findByIdAndUpdate(id, { isDeleted });

        res.json({ success: true });

    } catch (error) {
        console.log("Toggle product error:", error);
        res.status(500).json({ success: false });
    }
    
    }




    const deleteProductImage = async (req, res) => {
        try {
            const { productId, imgName } = req.params;

            // Remove image from product document
            const updatedProduct = await Product.findByIdAndUpdate(
                productId,
                { $pull: { images: imgName } },
                { new: true }
            );

            if (!updatedProduct) {
                return res.json({ success: false, message: "Product not found" });
            }

            // Delete image from folder
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








    module.exports = {
        loadProducts,
        loadAddProducts,
        AddProducts,
        loadEditProduct,
        updateProduct,
        deleteProduct,
        deleteProductImage
    };
