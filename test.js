const express = require("express");

const app = express();

app.get("/", (req, res) => {
  res.send("Working");
});

app.listen(4000, "0.0.0.0", () => {
  console.log("Running on 4000");
});