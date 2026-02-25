const coupon = require("../../models/couponSchema")
const { find } = require("../../models/orderSchema")


const loadCouponPage = async (req, res) => {
    try {

        const {search,status,type,startDate,endDate} = req.query
        

        let query = {}

        if(search){
            query.code = {$regex:search,$options:"i"}
        }


  const today = new Date();

if (status === "Active") {
  query.isActive = true;
  query.expiryDate = { $gte: today };
}

else if (status === "Cancelled") {
  query.isActive = false;
}

else if (status === "Expired") {
  query.expiryDate = { $lt: today };
}



     
        if(type){
            query.couponType = type
        }
        
        if(startDate && endDate){
            query.startDate = {
                $gte:new Date(startDate),
               $lte:new Date(endDate)
            }
        }


        const page = parseInt(req.query.page) || 1;
        const limit = 5;
        const skip = (page-1)*limit

        const total = await coupon.countDocuments(query)


        const coupons = await coupon.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)


        res.render("admin-coupon", {
            coupons,
            currentPage:page,
            totalPages : Math.ceil(total/limit),
            queryParams:req.query
        })
    } catch (error) {
        console.log("Load Coupon page Error", error)
        return res.redirect("/dashboard")
    }
}



const createCoupon = async (req, res) => {
    try {
        const {
            code,
            discountType,
            discountValue,
            minPurchase,
            maxDiscount,
            startDate,
            expiryDate,
            usageLimit,
            couponType
        } = req.body;

        if (!code || !discountType || !discountValue || !startDate || !expiryDate) {
            return res.status(400).json({ message: "Required fields are missing" })
        }

        const existingCoupon = await coupon.findOne({ code: code.toUpperCase() })

        if (existingCoupon) {
            return res.status(400).json({ message: "Coupon Already Exists" })
        }

        const newcoupon = new coupon({
            code: code.trim().toUpperCase(),
            discountType,
            discountValue: Number(discountValue),
            minPurchase: minPurchase ? Number(minPurchase) : 0,
            maxDiscount: maxDiscount ? Number(maxDiscount) : null,
            startDate: new Date(startDate),
            expiryDate: new Date(expiryDate),
            usageLimit: usageLimit ? Number(usageLimit) : 1,
            couponType: couponType || "General"
        })

        await newcoupon.save()
        res.status(200).json({ message: "Coupon Created Successfully" })

    } catch (error) {
        console.log(error, "Create Coupon Error")
        res.status(500).json({ message: "Create Coupon error" })
    }
}

const updateCoupon = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            code,
            discountType,
            discountValue,
            minPurchase,
            maxDiscount,
            startDate,
            expiryDate,
            usageLimit,
            couponType
        } = req.body;

        if (!code || !discountType || !discountValue || !startDate || !expiryDate) {
            return res.status(400).json({ message: "Required fields are missing" })
        }

        const existingCoupon = await coupon.findOne({
            code: code.toUpperCase(),
            _id: { $ne: id }
        });

        if (existingCoupon) {
            return res.status(400).json({ message: "Coupon code already exists" })
        }

        const updatedCoupon = await coupon.findByIdAndUpdate(id, {
            code: code.trim().toUpperCase(),
            discountType,
            discountValue: Number(discountValue),
            minPurchase: minPurchase ? Number(minPurchase) : 0,
            maxDiscount: maxDiscount ? Number(maxDiscount) : null,
            startDate: new Date(startDate),
            expiryDate: new Date(expiryDate),
            usageLimit: usageLimit ? Number(usageLimit) : 1,
            couponType: couponType || "General"
        }, { new: true });

        if (!updatedCoupon) {
            return res.status(404).json({ message: "Coupon not found" });
        }

        res.status(200).json({ message: "Coupon Updated Successfully" })

    } catch (error) {
        console.log(error, "Update Coupon Error")
        res.status(500).json({ message: "Update Coupon error" })
    }
}

const toggleCouponStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const couponData = await coupon.findById(id);
        if (!couponData) {
            return res.status(404).json({ success: false, message: "Coupon not found" });
        }
        couponData.isActive = !couponData.isActive;
        await couponData.save();
        res.status(200).json({ success: true, message: `Coupon ${couponData.isActive ? 'Activated' : 'Cancelled'} Successfully` });
    } catch (error) {
        console.log(error, "Toggle Coupon Error");
        res.status(500).json({ success: false, message: "Toggle Coupon error" });
    }
}


const deleteCoupon = async(req,res)=>{
    try {
        const couponId = req.params.id

        await coupon.findByIdAndDelete(couponId);

        res.status(200).json({success:true})



        
    } catch (error) {
         console.log("Delete Coupon Error",error)
         res.status(500).json({success:false})
        
    }
}







module.exports = {
    createCoupon,
    loadCouponPage,
    toggleCouponStatus,
    updateCoupon,
    deleteCoupon
}