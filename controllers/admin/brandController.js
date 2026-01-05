const Brand = require("../../models/brandSchema");
const { search } = require("../../routes/adminRoute");


const loadBrands = async (req, res) => {
  try {

     let search = req.query.search || "";
    let page = parseInt(req.query.page) || 1;
    let limit = 3; 
    let skip = (page - 1) * limit;



    
    const query = {
      isDeleted: false,
      name: { $regex: search, $options: "i" }
    };

    const totalBrands = await Brand.countDocuments(query);
    const totalPages = Math.ceil(totalBrands / limit);

    const brands = await Brand.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.render("brand", {
      brands,
      currentPage: page,
      totalPages,
      search
    });

  } catch (error) {
    console.log("Load Brands Error:", error);
    res.status(500).send("Internal Server Error");
  }
};







const addBrand = async (req, res) => {
  try {
    let { name, description } = req.body;

        name = name ? name.trim() : "";
    description = description ? description.trim() : "";

    if (!name || !description ) {
      return res.json({
        success: false,
        message: "All fields are required"
      });
    }


      const nameRegex = /^[A-Za-z]+$/;
    if (!nameRegex.test(name)) {
      return res.json({
        success: false,
        message: "Brand name should contain only letters"
      });
    }



    name = name.trim();

    const exists = await Brand.findOne({
      name: { $regex: `^${name}$`, $options: "i" }
    });

    if (exists) {
      return res.json({
        success: false,
        message: "Brand already exists"
      });
    }

    await Brand.create({
      name,
      description,
      isDeleted: false
    });

    return res.json({
      success: true,
      message: "Brand added successfully"
    });

  } catch (error) {
    console.error("Add Brand error:", error);

    if (error.code === 11000) {
      return res.json({
        success: false,
        message: "Brand already exists"
      });
    }

    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};





const editBrand = async (req, res) => {
  try {
    const { id } = req.params;
    let { name, description } = req.body;

     name = name.trim();
    description = description.trim()

      const nameRegex = /^[A-Za-z]+$/;
    if (!nameRegex.test(name)) {
      return res.json({
        success: false,
        message: "Brand name should contain only letters"
      });
    }

    if (!name || !description) {
      return res.json({
        success: false,
        message: "All fields are required"
      });
    }

  


   
    const exists = await Brand.findOne({
      _id: { $ne: id },
      name: { $regex: `^${name}$`, $options: "i" },
      isDeleted: false
    });

    if (exists) {
      return res.json({
        success: false,
        message: "Brand already exists"
      });
    }

    await Brand.findByIdAndUpdate(id, {
      name,
      description
    });

    return res.json({
      success: true,
      message: "Brand updated successfully"
    });

  } catch (error) {
    console.log("Edit Brand Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};


const toggleBrand = async (req, res) => {
  try {
    const { id } = req.params;

    const brand = await Brand.findById(id);
    if (!brand) {
      return res.json({
        success: false,
        message: "Brand not found"
      });
    }

    // toggle
    brand.isListed = !brand.isListed;
    await brand.save();

    res.json({
      success: true,
      isListed: brand.isListed
       
    });

  } catch (error) {
    console.log("Toggle brand error:", error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};





module.exports = {
  loadBrands,
  addBrand,
  editBrand,
   toggleBrand
};
