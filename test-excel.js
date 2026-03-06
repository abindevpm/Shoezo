const ExcelJS = require("exceljs");
const fs = require("fs");

async function testExcel() {
    try {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Sales Report");

        worksheet.columns = [
            { header: "Order ID", key: "orderId", width: 25 },
            { header: "User", key: "user", width: 20 },
            { header: "Date", key: "date", width: 20 },
            { header: "Final Amount", key: "amount", width: 15 }
        ];

        worksheet.addRow({
            orderId: "123456",
            user: "Test User",
            date: new Date().toDateString(),
            amount: 1000
        });

        await workbook.xlsx.writeFile("test-report.xlsx");
        console.log("Excel generated successfully");
    } catch (error) {
        console.error("Excel generation failed:", error);
    }
}

testExcel();
