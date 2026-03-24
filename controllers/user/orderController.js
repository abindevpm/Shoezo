const Order = require("../../models/orderSchema")
const Product = require("../../models/productSchema")
const User = require("../../models/userSchema")
const PDFDocument = require("pdfkit")
const StatusCodes = require("../../routes/utils/statusCodes")

const loadorders = async (req, res) => {
  try {
    const userId = req.user._id;
    const { search } = req.query

    let query = {
      userId,
      paymentStatus: { $in: ["Paid", "Refunded", "Failed", "Pending"] }
    };

    if (search) {
      const productIds = await Product.find({ name: { $regex: search, $options: "i" } }).distinct("_id")

      query.$or = [
        { orderId: { $regex: search, $options: "i" } },
        { "items.productId": { $in: productIds } }
      ]

      query.$or.push({ "address.fullName": { $regex: search, $options: "i" } })

      if (!isNaN(search)) {
        query.$or.push({ totalAmount: Number(search) })
      }
    }

    const orders = await Order.find(query)
      .populate("items.productId")
      .sort({ createdAt: -1 })

    const user = await User.findById(userId);
    res.render("orders", {
      orders,
      searchQuery: search || "",
      user,
      razorpayKey: process.env.RAZORPAY_KEY_ID
    })

  } catch (error) {
    console.log(error, "Error Occured in load Orders")
    res.status(StatusCodes.NOT_FOUND).redirect("pageNotFound")
  }
}

const getOrderDetails = async (req, res) => {
  try {
    const userId = req.user._id;

    const order = await Order.findOne({ _id: req.params.id, userId }).populate("items.productId")
    if (!order) return res.redirect("/orders")

    const user = await User.findById(userId);
    res.render("order-details", {
      order,
      user,
      razorpayKey: process.env.RAZORPAY_KEY_ID
    })
  } catch (error) {
    console.log(error)
    res.status(StatusCodes.NOT_FOUND).redirect("/orders")
  }
}

const cancelOrder = async (req, res) => {
  try {
    const userId = req.session.user
    const { orderId } = req.params
    const { reason } = req.body

    if (!reason || reason.trim() === "") {
      return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: "Cancellation reason is mandatory" })
    }

    const order = await Order.findOne({ _id: orderId, userId })
    if (!order || ["Cancelled", "Shipped", "Delivered", "Returned", "Return Requested"].includes(order.status)) {
      return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: "Order cannot be cancelled at its current stage" })
    }


    for (const item of order.items) {
      if (item.itemStatus !== "Cancelled") {
        await Product.updateOne(
          { _id: item.productId, "variants.size": item.size },
          { $inc: { "variants.$.stock": item.quantity } }
        )
      }
    }

    order.status = "Cancelled"
    order.cancelReason = reason
    order.items.forEach(item => {
      item.itemStatus = "Cancelled"
      item.cancelReason = reason
    })

    const originalTotal = order.totalAmount;
    if (order.paymentStatus === "Paid" && order.totalAmount > 0) {
      const user = await User.findById(userId);
      if (!user.wallet || Array.isArray(user.wallet)) {
        user.wallet = { balance: 0, transactions: [] };
      }

      const refundAmount = order.totalAmount;
      user.wallet.balance += refundAmount;
      user.wallet.transactions.push({
        type: "credit",
        amount: order.totalAmount,
        description: `Refund for cancelled order (${order.orderId})`,
        orderId: order._id,
        date: new Date()
      });
      await user.save({ validateBeforeSave: false });

      order.paymentStatus = "Refunded";
    }

    const refundAmount = (order.paymentStatus === "Refunded") ? originalTotal : 0;
    order.totalAmount = 0;
    await order.save()

    let message = "Order cancelled successfully.";
    if (refundAmount > 0) {
      message += ` ₹${refundAmount} has been credited to your wallet.`;
    }

    res.json({
      success: true,
      message: message
    });


  } catch (error) {
    console.log(error)
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: "Internal server error" })
  }
}

const cancelOrderItem = async (req, res) => {
  try {
    const userId = req.session.user
    const { orderId, itemId } = req.params
    const { reason } = req.body

    if (!reason || reason.trim() === "") {
      return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: "Cancellation reason is mandatory" })
    }

    const order = await Order.findOne({ _id: orderId, userId }).populate("items.productId")
    if (!order) return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: "Order not found" })

    const itemIndex = order.items.findIndex(item => item._id.toString() === itemId)
    if (itemIndex === -1) {
      return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: "Item not found in this order" })
    }

    const item = order.items[itemIndex]

    if (["Shipped", "Delivered", "Returned", "Return Requested", "Cancelled"].includes(item.itemStatus)) {
      return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: "Item cannot be cancelled at its current stage" })
    }


    await Product.updateOne(
      { _id: item.productId, "variants.size": item.size },
      { $inc: { "variants.$.stock": item.quantity } }
    )

    item.itemStatus = "Cancelled"
    item.cancelReason = reason


    const reductionAmount = Math.min(item.finalPrice, order.totalAmount);
    order.totalAmount -= reductionAmount;

    if (order.paymentStatus === "Paid" && reductionAmount > 0) {
      const user = await User.findById(userId);
      if (!user.wallet || Array.isArray(user.wallet)) {
        user.wallet = { balance: 0, transactions: [] };
      }

      user.wallet.balance += reductionAmount;
      user.wallet.transactions.push({
        type: "credit",
        amount: reductionAmount,
        description: `Refund for cancelled item: ${item.productId.name || 'Product'} (${order.orderId})`,
        orderId: order._id,
        date: new Date()
      });
      await user.save({ validateBeforeSave: false });
    }

    const allCancelled = order.items.every(i => i.itemStatus === "Cancelled")
    if (allCancelled) {
      order.status = "Cancelled"
      order.cancelReason = "All items cancelled: " + (reason || "")
      order.totalAmount = 0;
      if (order.paymentStatus === "Paid") {
        order.paymentStatus = "Refunded"
      }
    }

    await order.save()

    let message = "Item cancelled successfully.";
    if (order.paymentStatus === "Paid" && reductionAmount > 0) {
      message += ` ₹${reductionAmount} has been credited to your wallet.`;
    } else if (allCancelled && order.paymentStatus === "Refunded") {

    }

    res.json({ success: true, message: message })
  } catch (error) {
    console.log(error)
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: "Internal server error" })
  }
}

const returnOrder = async (req, res) => {
  try {
    const userId = req.session.user
    const { orderId } = req.params
    const { reason } = req.body

    if (!reason || reason.trim() === "") {
      return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: "Return reason is mandatory" })
    }

    const order = await Order.findOne({ _id: orderId, userId })
    if (!order) {
      return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: "Order not found" })
    }

    if (order.status !== "Delivered") {
      return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: "Only delivered orders can be returned" })
    }

    const deliveryDate = order.deliveredAt || order.updatedAt;
    const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
    if (new Date() - new Date(deliveryDate) > sevenDaysInMs) {
      return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: "Return window has expired (7 days from delivery)" })
    }

    order.status = "Return Requested"
    order.returnReason = reason

    order.items.forEach(item => {
      if (item.itemStatus === "Delivered") {
        item.itemStatus = "Return Requested"
        item.returnReason = reason
      }
    })

    await order.save()
    res.json({ success: true, message: "Return request submitted successfully. Waiting for admin approval." })
  } catch (error) {
    console.log(error, "AN ERROR OCCURED IN RETURN ORDER")
    res.status(StatusCodes.NOT_FOUND).json({ success: false, message: "Internal server error" })
  }
}

const returnOrderItem = async (req, res) => {
  try {
    const userId = req.session.user
    const { orderId, itemId } = req.params
    const { reason } = req.body

    if (!reason || reason.trim() === "") {
      return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: "Return reason is mandatory" })
    }

    const order = await Order.findOne({ _id: orderId, userId })
    if (!order) {
      return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: "Order not found" })
    }

    const itemIndex = order.items.findIndex(item => item._id.toString() === itemId)
    if (itemIndex === -1) {
      return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: "Item not found in this order" })
    }

    const item = order.items[itemIndex]
    if (item.itemStatus !== "Delivered") {
      return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: "Only delivered items can be returned" })
    }

    const deliveryDate = order.deliveredAt || order.updatedAt;
    const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
    if (new Date() - new Date(deliveryDate) > sevenDaysInMs) {
      return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: "Return window has expired (7 days from delivery)" })
    }

    item.itemStatus = "Return Requested"
    item.returnReason = reason


    if (order.status === "Delivered") {
      order.status = "Return Requested"
    }

    await order.save()
    res.json({ success: true, message: "Item return request submitted successfully." })
  } catch (error) {
    console.log(error, "ERROR OCCURED IN RETURN ITEM")
    res.status(StatusCodes.NOT_FOUND).json({ success: false, message: "Return item error" })
  }
}

const downloadInvoice = async (req, res) => {
  try {
    const userId = req.session.user;
    const order = await Order.findOne({ _id: req.params.orderId, userId }).populate("items.productId");
    if (!order) return res.status(StatusCodes.NOT_FOUND).send("Order not found");

    const doc = new PDFDocument({ margin: 50 });
    const filename = `Invoice-${order.orderId}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=${filename}`);

    doc.pipe(res);    
    doc.fillColor("#444444")
       .fontSize(20)
       .text("SHOEZO", 50, 50)
       .fontSize(10)
       .text("High-Quality Footwear", 50, 75)
       .text("123 Shoe Street, Footwear City, CA 90210", 50, 90)
       .text("support@shoezo.com | (555) 123-SHOE", 50, 105)
       .moveDown();

    doc.fillColor("#000000")
       .fontSize(25)
       .text("INVOICE", 50, 130, { align: "right" });
    
    doc.fontSize(10)
       .text(`Invoice Number: INV-${order.orderId}`, 50, 160, { align: "right" })
       .text(`Order Date: ${new Date(order.createdAt).toLocaleDateString()}`, 50, 175, { align: "right" })
       .text(`Payment Method: ${order.paymentMethod}`, 50, 190, { align: "right" })
       .moveDown();

    
    const top = 220;
    doc.fontSize(12).text("Bill To:", 50, top, { underline: true });
    doc.fontSize(10)
       .text(order.address.fullName, 50, top + 20)
       .text(order.address.addressLine, 50, top + 35)
       .text(`${order.address.city}, ${order.address.state} - ${order.address.pincode}`, 50, top + 50)
       .text(`Phone: ${order.address.phone}`, 50, top + 65)
       .moveDown();

    
    let statusColor = "#3b82f6"; 
    if (order.status === "Delivered") statusColor = "#10b981"; 
    if (order.status === "Cancelled" || order.status === "Failed") statusColor = "#ef4444"; 
    
    doc.rect(400, top, 150, 25).fill(statusColor);
    doc.fillColor("#FFFFFF").fontSize(10).text(`STATUS: ${order.status.toUpperCase()}`, 400, top + 8, { align: "center", width: 150 });
    doc.fillColor("#000000");

    
    const tableTop = 320;
    doc.fontSize(10).font("Helvetica-Bold");
    doc.text("Sl", 50, tableTop);
    doc.text("Product Name", 80, tableTop);
    doc.text("Size", 280, tableTop);
    doc.text("Qty", 320, tableTop);
    doc.text("Price", 360, tableTop);
    doc.text("Status", 430, tableTop);
    doc.text("Total", 500, tableTop, { align: "right" });

    doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();
    doc.font("Helvetica");

    let y = tableTop + 30;
    order.items.forEach((item, index) => {
      const isCancelled = ["Cancelled", "Returned", "Failed", "Return Requested"].includes(item.itemStatus);
      const rowTotal = isCancelled ? 0 : (item.price * item.quantity);
      
      doc.fontSize(9)
         .text(index + 1, 50, y)
         .text(item.productId.name, 80, y, { width: 190 })
         .text(item.size.toString(), 280, y)
         .text(item.quantity.toString(), 320, y)
         .text(`₹${item.price.toLocaleString()}`, 360, y)
         .fillColor(isCancelled ? "#ef4444" : "#444444")
         .text(item.itemStatus, 430, y)
         .fillColor("#000000")
         .text(`₹${rowTotal.toLocaleString()}`, 500, y, { align: "right" });
      
      y += 25;
      if (y > 700) { doc.addPage(); y = 50; } 
    });

    
    doc.moveTo(50, y).lineTo(550, y).stroke();
    y += 20;

    const summaryX = 350;
    doc.fontSize(10).text("Subtotal:", summaryX, y);
    doc.text(`₹${order.subtotal.toLocaleString()}`, 500, y, { align: "right" });

    if (order.totalOfferDiscount > 0) {
      y += 15;
      doc.text("Offer Discount:", summaryX, y);
      doc.text(`-₹${order.totalOfferDiscount.toLocaleString()}`, 500, y, { align: "right" });
    }

    if (order.totalCouponDiscount > 0) {
      y += 15;
      doc.text("Coupon Discount:", summaryX, y);
      doc.text(`-₹${order.totalCouponDiscount.toLocaleString()}`, 500, y, { align: "right" });
    }

    y += 25;
    doc.rect(340, y - 5, 210, 30).fill("#f9f9f9");
    doc.fillColor("#000000")
       .font("Helvetica-Bold")
       .fontSize(12)
       .text("GRAND TOTAL:", 350, y)
       .text(`₹${order.totalAmount.toLocaleString()}`, 500, y, { align: "right" });

    
    y += 60;
    doc.font("Helvetica").fontSize(10).text("Payment Status:", 50, y);
    let payStatusColor = "#10b981"; 
    if (order.paymentStatus === "Pending") payStatusColor = "#f59e0b"; 
    if (order.paymentStatus === "Failed" || order.paymentStatus === "Refunded") payStatusColor = "#ef4444"; 
    
    doc.fillColor(payStatusColor).text(order.paymentStatus.toUpperCase(), 150, y);
    doc.fillColor("#000000");

    doc.fontSize(8)
       .text("Thank you for shopping with SHOEZO!", 50, 750, { align: "center", width: 500 })
       .text("This is a computer-generated invoice.", 50, 765, { align: "center", width: 500 });

    doc.end();

  } catch (error) {
    console.log(error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).send("Error generating invoice");
  }
}

const loadTrackOrder = async (req, res) => {
  try {
    const userId = req.user._id;

    const { id: orderId, itemId } = req.params
    const order = await Order.findOne({ _id: orderId, userId }).populate("items.productId")

    if (!order) return res.redirect("/orders")

    let focusedItem = null
    if (itemId) {
      focusedItem = order.items.find(item => item._id.toString() === itemId)
    }

    res.render("track-order", {
      order,
      user: req.user || { name: order.address.fullName },
      focusedItem
    })
  } catch (error) {
    console.log(error, "Load track order error occured")
    res.status(StatusCodes.NOT_FOUND).redirect("/orders")
  }
}

module.exports = {
  loadorders,
  getOrderDetails,
  cancelOrder,
  cancelOrderItem,
  returnOrder,
  returnOrderItem,
  downloadInvoice,
  loadTrackOrder
}
