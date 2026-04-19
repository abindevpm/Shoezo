const Order = require("../../models/orderSchema");
const PDFDocument = require("pdfkit");
const ExcelJS = require("exceljs");
const StatusCodes = require("../../routes/utils/statusCodes")



const getMatchCondition = (reportType, fromDate, toDate) => {
  
  let matchCondition = { "items.itemStatus": "Delivered" };

  const now = new Date();
  let startDate;
  let endDate = new Date();
  endDate.setHours(23, 59, 59, 999);

  switch (reportType) {
    case "daily":
      startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
      matchCondition.createdAt = { $gte: startDate, $lte: endDate };
      break;
    case "weekly":
      startDate = new Date();
      startDate.setDate(now.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
      matchCondition.createdAt = { $gte: startDate, $lte: endDate };
      break;
    case "monthly":
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      matchCondition.createdAt = { $gte: startDate, $lte: endDate };
      break;
    case "yearly":
      startDate = new Date(now.getFullYear(), 0, 1);
      matchCondition.createdAt = { $gte: startDate, $lte: endDate };
      break;
       case "custom":

  if (!fromDate || !toDate) {
    throw new Error("Please select both From Date and To Date");
  }

  startDate = new Date(fromDate);
  endDate = new Date(toDate);
  endDate.setHours(23, 59, 59, 999);

  const today = new Date();
  today.setHours(23, 59, 59, 999);

  if (startDate > endDate) {
    throw new Error("From Date cannot be greater than To Date");
  }

  if (startDate > today || endDate > today) {
    throw new Error("Future dates are not allowed");
  }

  matchCondition.createdAt = { $gte: startDate, $lte: endDate };

  break;
    default:

      break;
  }
  return matchCondition;
};

const getDeliveredTotals = (order) => {
  const deliveredItems = (order.items || []).filter(
    item => item.itemStatus === "Delivered"
  );
  const totalItems = order.items ? order.items.length : 0;
  const deliveredCount = deliveredItems.length;

  
  if (deliveredCount === totalItems && totalItems > 0) {
    return {
      salesAmount: order.totalAmount || 0,
      couponDiscount: order.totalCouponDiscount || 0,
      offerDiscount: order.totalOfferDiscount || 0,
      deliveredCount
    };
  }

  
  const salesAmount = deliveredItems.reduce(
    (sum, item) => sum + (item.finalPrice || (item.price * item.quantity) || 0), 0
  );
  const couponDiscount = deliveredItems.reduce(
    (sum, item) => sum + (item.couponDiscount || 0), 0
  );
  const offerDiscount = deliveredItems.reduce(
    (sum, item) => sum + (item.offerDiscount || 0), 0
  );

  return { salesAmount, couponDiscount, offerDiscount, deliveredCount };
};


const loadSalesReport = async (req, res) => {
  try {

    const page = parseInt(req.query.page) || 1;
    const limit = 7;
    const skip = (page - 1) * limit;

    const { reportType, fromDate, toDate } = req.query;
    const matchCondition = getMatchCondition(reportType, fromDate, toDate);

    const totalOrders = await Order.countDocuments(matchCondition);

    const orders = await Order.find(matchCondition)
      .populate("userId")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)


      
    
    const reportTotals = await Order.aggregate([
      { $match: matchCondition },
      { $unwind: "$items" },
      { $match: { "items.itemStatus": "Delivered" } },
      {
        $group: {
          _id: null,
          totalSalesAmount: { $sum: "$items.finalPrice" },
          totalCouponDiscount: { $sum: "$items.couponDiscount" },
          totalOfferDiscount: { $sum: "$items.offerDiscount" }
        }
      }
    ]);

    const totals = reportTotals[0] || {
      totalSalesAmount: 0,
      totalCouponDiscount: 0,
      totalOfferDiscount: 0
    };

    const { totalSalesAmount, totalCouponDiscount, totalOfferDiscount } = totals;

    const totalPages = Math.ceil(totalOrders / limit);


    res.render("salesReport", {
      orders,
      totalOrders,
      totalSalesAmount,
      totalCouponDiscount,
      totalOfferDiscount,
      currentPage: page,
      totalPages,
      reportType: reportType || "all",
      fromDate: fromDate || "",
      toDate: toDate || "",
    });

  } catch (error) {
    console.log("Load SalesReport Error", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).send("Internal Server Error");
  }
};

const SalesReportPDF = async (req, res) => {
  try {
    const { reportType, fromDate, toDate } = req.query;
    const matchCondition = getMatchCondition(reportType, fromDate, toDate);
    const orders = await Order.find(matchCondition).populate("userId").sort({ createdAt: -1 });

    const doc = new PDFDocument({ margin: 30, size: "A4" });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=sales-report.pdf");

    doc.pipe(res);


    doc.fontSize(20).font("Helvetica-Bold").text("SHOEZO SALES REPORT", { align: "center" });
    doc.moveDown(0.5);
    doc.fontSize(10).font("Helvetica").text(`Report Period: ${reportType ? reportType.toUpperCase() : "ALL TIME"}`, { align: "center" });
    doc.text(`Generated On: ${new Date().toLocaleString()}`, { align: "center" });
    doc.moveDown(2);

    let totalSales = 0;
    let totalCouponDisc = 0;
    let totalOfferDisc = 0;

    orders.forEach(order => {
      const totals = getDeliveredTotals(order);
      totalSales += totals.salesAmount;
      totalCouponDisc += totals.couponDiscount;
      totalOfferDisc += totals.offerDiscount;
    });

    doc.fontSize(12).font("Helvetica-Bold").text("Summary Statistics:");
    doc.fontSize(10).font("Helvetica");
    doc.text(`Total Orders: ${orders.length}`);
    doc.text(`Total Sales: Rs. ${totalSales.toLocaleString()}`);
    doc.text(`Total Offer Discount: Rs. ${totalOfferDisc.toLocaleString()}`);
    doc.text(`Total Coupon Deduction: Rs. ${totalCouponDisc.toLocaleString()}`);
    doc.moveDown(2);


    const tableHeaderY = doc.y;
    doc.font("Helvetica-Bold");
    doc.text("Order ID", 30, tableHeaderY);
    doc.text("Date", 165, tableHeaderY);
    doc.text("Customer", 245, tableHeaderY);
    doc.text("Offer", 355, tableHeaderY);
    doc.text("Coupon", 425, tableHeaderY);
    doc.text("Final Amount", 480, tableHeaderY, { width: 80, align: "right" });
    doc.moveTo(30, tableHeaderY + 15).lineTo(560, tableHeaderY + 15).stroke();
    doc.moveDown(1.5);


    doc.font("Helvetica");
    orders.forEach(order => {
      if (doc.y > 750) doc.addPage();
      const totals = getDeliveredTotals(order);
      const currentY = doc.y;
      doc.text(`#${order.orderId}`, 30, currentY);
      doc.text(new Date(order.createdAt).toLocaleDateString(), 165, currentY);
      doc.text(order.userId ? order.userId.name : "Guest", 245, currentY);
      doc.text(`Rs. ${totals.offerDiscount}`, 355, currentY);
      doc.text(`Rs. ${totals.couponDiscount}`, 425, currentY);
      doc.text(`Rs. ${totals.salesAmount.toLocaleString()}`, 480, currentY, { width: 80, align: "right" });
      doc.moveDown();
    });

    doc.end();

  } catch (error) {
    console.log("PDF Error", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).send("Error generating PDF");
  }
};

const downloadSalesReportExcel = async (req, res) => {
  try {
    const { reportType, fromDate, toDate } = req.query;
    const matchCondition = getMatchCondition(reportType, fromDate, toDate);
    const orders = await Order.find(matchCondition).populate("userId").sort({ createdAt: -1 });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Sales Report");

    worksheet.columns = [
      { header: "Order ID", key: "orderId", width: 25 },
      { header: "User", key: "user", width: 20 },
      { header: "Date", key: "date", width: 20 },
      { header: "Offer Discount", key: "offerDiscount", width: 15 },
      { header: "Coupon Deduction", key: "discount", width: 15 },
      { header: "Final Amount", key: "amount", width: 15 }
    ];

    let totalSales = 0;
    let totalCouponDiscount = 0;
    let totalOfferDiscount = 0;

    orders.forEach(order => {
      const totals = getDeliveredTotals(order);
      totalSales += totals.salesAmount;
      totalCouponDiscount += totals.couponDiscount;
      totalOfferDiscount += totals.offerDiscount;

      worksheet.addRow({
        orderId: order.orderId.toString(),
        user: order.userId?.name || "N/A",
        date: order.createdAt.toDateString(),
        offerDiscount: totals.offerDiscount,
        discount: totals.couponDiscount,
        amount: totals.salesAmount
      });
    });

    worksheet.addRow([]);
    worksheet.addRow({
      orderId: "TOTAL",
      amount: totalSales,
      discount: totalCouponDiscount,
      offerDiscount: totalOfferDiscount
    });

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(worksheet.rowCount).font = { bold: true };

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=SalesReport_${Date.now()}.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.log("Excel Error:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).send("Error generating Excel file");
  }
};

module.exports = {
  loadSalesReport,
  SalesReportPDF,
  downloadSalesReportExcel
};