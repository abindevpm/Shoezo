const PDFDocument = require("pdfkit");
const fs = require("fs");

try {
    const doc = new PDFDocument({ margin: 30, size: "A4" });
    const stream = fs.createWriteStream("test-report.pdf");
    doc.pipe(stream);

    doc.fontSize(20).font("Helvetica-Bold").text("TEST SALES REPORT", { align: "center" });
    doc.moveDown(0.5);
    doc.fontSize(10).font("Helvetica").text(`Report Period: ALL TIME`, { align: "center" });
    doc.text(`Generated On: ${new Date().toLocaleString()}`, { align: "center" });
    doc.moveDown(2);

    doc.fontSize(12).font("Helvetica-Bold").text("Summary Statistics:");
    doc.fontSize(10).font("Helvetica");
    doc.text(`Total Orders: 1`);
    doc.text(`Total Sales: Rs. 1,000`);
    doc.moveDown(2);

    const tableHeaderY = doc.y;
    doc.font("Helvetica-Bold");
    doc.text("Order ID", 30, tableHeaderY);
    doc.text("Date", 165, tableHeaderY);
    doc.text("Customer", 245, tableHeaderY);
    doc.text("Final Amount", 480, tableHeaderY, { width: 80, align: "right" });
    doc.moveTo(30, tableHeaderY + 15).lineTo(560, tableHeaderY + 15).stroke();
    doc.moveDown(1.5);

    doc.font("Helvetica");
    const order = { orderId: "123456", createdAt: new Date(), userId: { name: "Test User" }, totalAmount: 1000 };

    if (doc.y > 750) doc.addPage();
    const currentY = doc.y;
    doc.text(`#${order.orderId}`, 30, currentY);
    doc.text(new Date(order.createdAt).toLocaleDateString(), 165, currentY);
    doc.text(order.userId ? order.userId.name : "Guest", 245, currentY);
    doc.text(`Rs. ${(order.totalAmount || 0).toLocaleString()}`, 480, currentY, { width: 80, align: "right" });
    doc.moveDown();

    doc.end();
    stream.on('finish', () => {
        console.log("PDF generated successfully");
    });
} catch (error) {
    console.error("PDF generation failed:", error);
}
