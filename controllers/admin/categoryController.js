const Category = require("../../models/categorySchema");

 const categoryInfo = async(req,res)=>{
    try{
        let search = req.query.search || "";
        let page = parseInt(req.query.page) || 1;
         let limit = 5;

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


 const addCategory = async(req,res)=>{

    try {

        const {name,brand,description,categoryOffer} = req.body


        if (!name || !brand || !description) {
            return res.json({
                success: false,
                message: "All fields are required"
            });
        }




        const exists = await Category.findOne({name})

        if(exists)return res.json({success:false,message:"Category already exists"})
        
    await Category.create({
    name,
    brand,
    description,
    categoryOffer,
    isListed: true,   // or false
    isDeleted: false
});

     res.json({success:true,message:"Category added Successfully"})


    } catch (error) {
        console.log(error);
        res.json({success:false,message:"Internal Server error"})
        
    }

 }

  const deleteCategory = async(req,res)=>{


    try {

          const id = req.params.id;

          const category = await Category.findById(id)

          if(!category){
            return res.json({success:false,message:"Category not found"})


          }
           await Category.findByIdAndUpdate(id,{isDeleted:true});
           
           res.json({
            success:true,
            message:"Category Deleted Successfully"
           })

        
    } catch (error) {

      console.log("Delete Category Error"+error)

      res.json({
        success:false,
        message:"Internal Server Error"
      })
        
    }



  }
const editCategory = async (req, res) => {
    try {
        const id = req.params.id;
        let { name, brand, description, categoryOffer } = req.body;

        // Trim input values
        name = name?.trim();
        brand = brand?.trim();
        description = description?.trim();

        // VALIDATION
        if (!name || !brand || !description || categoryOffer === "") {
            return res.json({
                success: false,
                message: "All fields are required"
            });
        }

        // UPDATE CATEGORY
        await Category.findByIdAndUpdate(id, {
            name,
            brand,
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
    deleteCategory,
    editCategory

 };
