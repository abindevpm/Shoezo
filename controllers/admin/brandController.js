const Brand = require("../../models/brandSchema");

const loadBrands = async (req, res) => {
  try {
    const brands = await Brand.find({ isDeleted: false })
      .sort({ createdAt: -1 });
    res.render("brand", { brands });
  } catch (error) {
    console.log("Load Brands Error:", error);
  }
};

const addBrand = async (req, res) => {
  try {
    let { name, description } = req.body;

    if (!name || !description) {
      return res.json({
        success: false,
        message: "All fields are required"
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

    if (!name || !description) {
      return res.json({
        success: false,
        message: "All fields are required"
      });
    }

    name = name.trim();

    // check duplicate (except current brand)
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
      message: brand.isListed
        ? "Brand listed successfully"
        : "Brand unlisted successfully"
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
