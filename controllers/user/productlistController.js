
const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const User = require("../../models/userSchema");
const Brand = require("../../models/brandSchema")



const loadShopPage = async (req, res) => {
    try {
        const userId = req.session.user;
        let userData = await User.findById(userId);
        
        let filter = {isDeleted:false,isListed:true};

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
                name: { $in: selected.map(c => new RegExp("^" + c + "$", "i")) },
                isDeleted:false,
                isListed:true
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

  const brandDocs = await Brand.find({
    name: { $in: selectedBrands.map(b => new RegExp("^" + b + "$", "i")) },
    isDeleted: false,
    isListed: true
  });

  const brandIds = brandDocs.map(b => b._id);
  if (brandIds.length > 0) {
    filter.brand = { $in: brandIds };
  }
}




       




        const page = parseInt(req.query.page) || 1;
        const limit = 6; // products per page
        const skip = (page - 1) * limit;



        const selectedSort = req.query.sort || "latest";

let pipeline = [
  { $match: filter },

  {
    $addFields: {
      effectivePrice: {
        $min: {
          $map: {
            input: "$variants",
            as: "v",
            in: {
              $cond: [
                { $ifNull: ["$$v.offerPrice", false] },
                "$$v.offerPrice",
                "$$v.price"
              ]
            }
          }
        }
      }
    }
  }
];

// 🔥 SORT BASED ON VARIANTS
if (selectedSort === "low_to_high") {
  pipeline.push({ $sort: { effectivePrice: 1 } });
} else if (selectedSort === "high_to_low") {
  pipeline.push({ $sort: { effectivePrice: -1 } });
} else {
  pipeline.push({ $sort: { createdAt: -1 } });
}

// pagination
pipeline.push(
  { $skip: skip },
  { $limit: limit }
);





let products = await Product.aggregate(pipeline);

products = await Product.populate(products, [
  { path: "category" },
  { path: "brand" }
]);








        const totalProducts = await Product.countDocuments(filter);
        const totalPages = Math.ceil(totalProducts / limit);

        // const products = await Product.find(filter)
        //     .populate("category")
        //     .populate("brand")
        //     .sort(sortOption)
        //     .skip(skip)
        //     .limit(limit);



            const categories = await Category.find({
  isDeleted: false,
  isListed: true
});

const brands = await Brand.find({
  isDeleted: false,
  isListed: true
});


        res.render("productlist", {
            products,
            selectedCategory: req.query.category ? [].concat(req.query.category) : [],
            selectedBrand: req.query.brand ? [].concat(req.query.brand) : [],
            selectedSort: req.query.sort || "latest",
            search: req.query.search || "",
            page,
            totalPages,
            user: userData,
            categories,
            brands
        });

    } catch (err) {
        console.log("Filter Error:", err);
        res.status(500).send("Internal Server Error");
    }
};

module.exports = { loadShopPage };