
const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const User = require("../../models/userSchema");



const loadShopPage = async (req, res) => {
    try {
        const userId = req.session.user;
        let userData = await User.findById(userId);
        
        let filter = {};

        if (req.query.search && req.query.search.trim() !== "") {
            const searchText = req.query.search.trim();
            filter.$or = [
                { name: { $regex: searchText, $options: "i" } },
                { description: { $regex: searchText, $options: "i" } }
            ];
        }

        if (req.query.category) {
            const selected = Array.isArray(req.query.category)
                ? req.query.category
                : [req.query.category];

            const categoryDocs = await Category.find({
                name: { $in: selected.map(c => new RegExp("^" + c + "$", "i")) }
            });

            const categoryIds = categoryDocs.map(c => c._id);
            if (categoryIds.length > 0) {
                filter.category = { $in: categoryIds };
            }
        }

        if (req.query.brand) {
    const selectedBrands = Array.isArray(req.query.brand)
        ? req.query.brand
        : [req.query.brand];

    filter.brand = { 
        $in: selectedBrands.map(b => new RegExp("^" + b + "$", "i")) 
    };
}


        let sortOption = {};
        if (req.query.sort === "low_to_high") sortOption.offerPrice = 1;
        else if (req.query.sort === "high_to_low") sortOption.offerPrice = -1;
        else sortOption.createdAt = -1;


        const page = parseInt(req.query.page) || 1;
        const limit = 6; // products per page
        const skip = (page - 1) * limit;

        const totalProducts = await Product.countDocuments(filter);
        const totalPages = Math.ceil(totalProducts / limit);

        const products = await Product.find(filter)
            .populate("category")
            .populate("brand")
            .sort(sortOption)
            .skip(skip)
            .limit(limit);

        res.render("productlist", {
            products,
            selectedCategory: req.query.category ? [].concat(req.query.category) : [],
            selectedBrand: req.query.brand ? [].concat(req.query.brand) : [],
            selectedSort: req.query.sort || "latest",
            search: req.query.search || "",
            page,
            totalPages,
            user: userData,
        });

    } catch (err) {
        console.log("Filter Error:", err);
        res.status(500).send("Internal Server Error");
    }
};

module.exports = { loadShopPage };
