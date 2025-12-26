const Category = require("../../models/categorySchema");

 const categoryInfo = async(req,res)=>{
    try{
        let search = req.query.search || "";
        let page = parseInt(req.query.page) || 1;
         let limit = 3;

         const query = {
            isDeleted:false,
            name:{$regex:search,$options:"i"}
         }

         const total = await Category.countDocuments(query);
         const categories = await Category.find(query)
         .sort({createdAt:-1})
         .skip((page-1)*limit)
          .limit(limit);

          res.render("category",{
            categories,
            totalPages:Math.ceil(total/limit),
            currentPage:page,
            search
          })



    }catch(error){
        console.log("Category Info error",err)

    }
 }


 const addCategory = async (req, res) => {
  try {


    let { name, description, categoryOffer } = req.body;

       name = name ? name.trim() : "";
    description = description ? description.trim() : "";
    categoryOffer = categoryOffer ? categoryOffer.trim() : "";


    if (!name || !description) {
      return res.json({
        success: false,
        message: "All fields are required"
      });
    }

    name = name.trim();

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
      categoryOffer,
      isListed: true,
      isDeleted: false
    });

    return res.json({
      success: true,
      message: "Category added successfully"
    });

  } catch (error) {
    console.error("Add category error:", error);

    
    if (error.code === 11000) {
      return res.json({
        success: false,
        message: "Category already exists"
      });
    }

    return res.status(500).json({
      success: false,
      message: "Server error"
    });
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
        let { name, description, categoryOffer } = req.body;

      
        name = name?.trim();
    
        description = description?.trim();

        
        if (!name ||!description || categoryOffer === "") {
            return res.json({
                success: false,
                message: "All fields are required"
            });
        }

        
        await Category.findByIdAndUpdate(id, {
            name,
            description,
            categoryOffer
        });

        return res.json({
            success: true,
            message: "Category updated successfully"
        });

    } catch (error) {
        console.log("Error in updateCategory:", error);
        return res.json({
            success: false,
            message: "Internal Server Error"
        });
    }
};




module.exports = { 
    categoryInfo,
    addCategory,
    toggleCategory,
    editCategory

 };
