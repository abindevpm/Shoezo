const Order = require("../../models/orderSchema")
const Product = require("../../models/productSchema")
const User = require("../../models/userSchema")
const PDFDocument = require("pdfkit")

const loadorders = async (req, res) => {
  try {
    const userId = req.session.user
    if (!userId) return res.redirect("/login")

    const { search } = req.query
    let query = { userId }

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

    res.render("orders", { orders, searchQuery: search || "" })

  } catch (error) {
    console.log(error)
    res.redirect("/")
  }
}

const getOrderDetails = async (req, res) => {
  try {
    const userId = req.session.user
    if (!userId) return res.redirect("/login")

    const order = await Order.findOne({ _id: req.params.id, userId }).populate("items.productId")
    if (!order) return res.redirect("/orders")

    res.render("order-details", { order })
  } catch (error) {
    console.log(error)
    res.redirect("/orders")
  }
}

const cancelOrder = async (req, res) => {
  try {
    const userId = req.session.user
    const { orderId } = req.params
    const { reason } = req.body

    if (!reason || reason.trim() === "") {
      return res.status(400).json({ success: false, message: "Cancellation reason is mandatory" })
    }

    const order = await Order.findOne({ _id: orderId, userId })
    if (!order || ["Cancelled", "Shipped", "Delivered", "Returned", "Return Requested"].includes(order.status)) {
      return res.status(400).json({ success: false, message: "Order cannot be cancelled at its current stage" })
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
    order.items.forEach(item => item.itemStatus = "Cancelled")

    await order.save()
    res.json({ success: true, message: "Order cancelled successfully" })
  } catch (error) {
    console.log(error)
    res.status(500).json({ success: false, message: "Internal server error" })
  }
}

const cancelOrderItem = async (req, res) => {
  try {
    const userId = req.session.user
    const { orderId, itemId } = req.params
    const { reason } = req.body

    if (!reason || reason.trim() === "") {
      return res.status(400).json({ success: false, message: "Cancellation reason is mandatory" })
    }

    const order = await Order.findOne({ _id: orderId, userId })

    const item = order.items[itemIndex]

    if (["Shipped", "Delivered", "Returned", "Return Requested"].includes(item.itemStatus)) {
      return res.status(400).json({ success: false, message: "Item cannot be cancelled at its current stage" })
    }


    await Product.updateOne(
      { _id: item.productId, "variants.size": item.size },
      { $inc: { "variants.$.stock": item.quantity } }
    )

    item.itemStatus = "Cancelled"
    item.cancelReason = reason


    const allCancelled = order.items.every(i => i.itemStatus === "Cancelled")
    if (allCancelled) {
      order.status = "Cancelled"
      order.cancelReason = "All items cancelled: " + (reason || "")
    }

    await order.save()
    res.json({ success: true, message: "Item cancelled successfully" })
  } catch (error) {
    console.log(error)
    res.status(500).json({ success: false, message: "Internal server error" })
  }
}

const returnOrder = async (req, res) => {
  try {
    const userId = req.session.user
    const { orderId } = req.params
    const { reason } = req.body

    if (!reason || reason.trim() === "") {
      return res.status(400).json({ success: false, message: "Return reason is mandatory" })
    }

    const order = await Order.findOne({ _id: orderId, userId })
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" })
    }

    if (order.status !== "Delivered") {
      return res.status(400).json({ success: false, message: "Only delivered orders can be returned" })
    }

    order.status = "Return Requested"
    order.returnReason = reason

    order.items.forEach(item => {
      if (item.itemStatus === "Delivered") {
        item.itemStatus = "Return Requested"
      }
    })

    await order.save()
    res.json({ success: true, message: "Return request submitted successfully. Waiting for admin approval." })
  } catch (error) {
    console.log(error)
    res.status(500).json({ success: false, message: "Internal server error" })
  }
}

const returnOrderItem = async (req, res) => {
  try {
    const userId = req.session.user
    const { orderId, itemId } = req.params
    const { reason } = req.body

    if (!reason || reason.trim() === "") {
      return res.status(400).json({ success: false, message: "Return reason is mandatory" })
    }

    const order = await Order.findOne({ _id: orderId, userId })
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" })
    }

    const itemIndex = order.items.findIndex(item => item._id.toString() === itemId)
    if (itemIndex === -1) {
      return res.status(404).json({ success: false, message: "Item not found in this order" })
    }

    const item = order.items[itemIndex]
    if (item.itemStatus !== "Delivered") {
      return res.status(400).json({ success: false, message: "Only delivered items can be returned" })
    }

    item.itemStatus = "Return Requested"
    item.returnReason = reason


    if (order.status === "Delivered") {
      order.status = "Return Requested"
    }

    await order.save()
    res.json({ success: true, message: "Item return request submitted successfully." })
  } catch (error) {
    console.log(error)
    res.status(500).json({ success: false, message: "Internal server error" })
  }
}

const downloadInvoice = async (req, res) => {
  try {
    const userId = req.session.user
    const order = await Order.findOne({ _id: req.params.orderId, userId }).populate("items.productId")
    if (!order) return res.status(404).send("Order not found")

    const doc = new PDFDocument({ margin: 50 })
    const filename = `Invoice-${order.orderId}.pdf`

    res.setHeader("Content-Type", "application/pdf")
    res.setHeader("Content-Disposition", `attachment; filename=${filename}`)

    doc.pipe(res)


    doc.fontSize(25).text("SHOEZO INVOICE", { align: "center" }).moveDown()
    doc.fontSize(12).text(`Order ID: ${order.orderId}`)
    doc.text(`Order Date: ${new Date(order.createdAt).toLocaleDateString()}`)
    doc.text(`Payment Method: ${order.paymentMethod}`).moveDown()


    doc.fontSize(14).text("Shipping Address:", { underline: true })
    doc.fontSize(10).text(`${order.address.name}`)
    doc.text(`${order.address.city}, ${order.address.state}`)
    doc.text(`Phone: ${order.address.phone}`)
    doc.text(`Pincode: ${order.address.pincode}`).moveDown()


    const tableTop = 250
    doc.fontSize(12).text("Product", 50, tableTop)
    doc.text("Size", 250, tableTop)
    doc.text("Qty", 300, tableTop)
    doc.text("Price", 350, tableTop)
    doc.text("Total", 450, tableTop)

    doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke()

    let y = tableTop + 30
    order.items.forEach(item => {
      doc.fontSize(10).text(item.productId.name, 50, y)
      doc.text(item.size.toString(), 250, y)
      doc.text(item.quantity.toString(), 300, y)
      doc.text(`₹${item.price.toFixed(2)}`, 350, y)
      doc.text(`₹${(item.price * item.quantity).toFixed(2)}`, 450, y)
      y += 20
    })

    doc.moveTo(50, y).lineTo(550, y).stroke().moveDown()

    y += 20
    doc.fontSize(10).text(`Subtotal: ₹${order.subtotal.toFixed(2)}`, 400, y)
    y += 15
    doc.text(`GST (5%): ₹${order.gstAmount.toFixed(2)}`, 400, y)
    y += 15
    doc.text(`Discount: -₹${order.discountAmount.toFixed(2)}`, 400, y)
    y += 20
    doc.fontSize(14).text(`GRAND TOTAL: ₹${order.totalAmount.toFixed(2)}`, 350, y)

    doc.end()

  } catch (error) {
    console.log(error)
    res.status(500).send("Error generating invoice")
  }
}

const loadTrackOrder = async (req, res) => {
  try {
    const userId = req.session.user
    if (!userId) return res.redirect("/login")

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
    console.log(error)
    res.redirect("/orders")
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
