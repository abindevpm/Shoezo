
const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const User = require("../../models/userSchema");
const Brand = require("../../models/brandSchema")
const mongoose = require("mongoose")




const loadShopPage = async (req, res) => {
  try {
    const userId = req.session.user;
    let userData = await User.findById(userId);

    console.log("QUERY =>", req.query);


    let filter = { isDeleted: false, isListed: true };

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
        isDeleted: false,
        isListed: true
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
        name: {
          $in: selectedBrands.map(b =>
            new RegExp("^" + b.trim() + "$", "i")
          )
        },
        isDeleted: false,
        isListed: true
      });

      if (brandDocs.length > 0) {
        filter.brand = { $in: brandDocs.map(b => b._id) };
      }
    }



    console.log("FINAL FILTER OBJECT =>", JSON.stringify(filter, null, 2));




    // pagination

    const page = parseInt(req.query.page) || 1;
    const limit = 6;
    const skip = (page - 1) * limit;


    const nameSort = req.query.nameSort;
    const selectedSort = req.query.sort || "latest";

    let pipeline = [
      { $match: filter },

      {
        $addFields: {
          effectivePrice: {
            $min: {
              $map: {
                input: { $ifNull: ["$variants", []] },
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
      },

    ];


    if (nameSort === "name_asc") {
      pipeline.push({ $sort: { name: 1 } });
    }
    else if (nameSort === "name_desc") {
      pipeline.push({ $sort: { name: -1 } });
    }
    else if (selectedSort === "low_to_high") {
      pipeline.push({ $sort: { effectivePrice: 1 } });
    }
    else if (selectedSort === "high_to_low") {
      pipeline.push({ $sort: { effectivePrice: -1 } });
    }
    else {
      pipeline.push({ $sort: { createdAt: -1 } });
    }



    pipeline.push(
      { $skip: skip },
      { $limit: limit }
    );



    let products = await Product.aggregate(pipeline);

    products = await Product.populate(products, [
      { path: "category", populate: { path: "categoryOffer" } },
      { path: "brand" },
      { path: "productOffer" }
    ]);

    const today = new Date();

    // Calculate finalPrice and appliedDiscount for the frontend
    products.forEach(p => {
      const v = p.variants && p.variants.length > 0 ? p.variants[0] : null;

      if (v) {
        let appliedDiscount = 0;

        // Check Product Offer
        if (p.productOffer &&
          p.productOffer.isActive &&
          p.productOffer.startDate <= today &&
          p.productOffer.endDate >= today) {
          appliedDiscount = Math.max(appliedDiscount, Number(p.productOffer.discountValue) || 0);
        }

        // Check Category Offer
        if (p.category &&
          p.category.categoryOffer &&
          p.category.categoryOffer.isActive &&
          p.category.categoryOffer.startDate <= today &&
          p.category.categoryOffer.endDate >= today) {
          appliedDiscount = Math.max(appliedDiscount, Number(p.category.categoryOffer.discountValue) || 0);
        }

        if (appliedDiscount > 0) {
          p.finalPrice = Math.floor(v.price * (1 - appliedDiscount / 100));
          p.appliedDiscount = appliedDiscount;
        } else {
          p.finalPrice = v.price;
          p.appliedDiscount = 0;
        }
      } else {
        p.finalPrice = 0;
        p.appliedDiscount = 0;
      }
    });





    const totalProducts = await Product.countDocuments(filter);
    const totalPages = Math.ceil(totalProducts / limit);



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
      selectedNameSort: nameSort,
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







module.exports = {
  loadShopPage,


};