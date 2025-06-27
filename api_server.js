// api_server.js
const express = require("express");
const bodyParser = require("body-parser");
const quoteRouter = require("./logic/shared/api/r-quote-utils");

const app = express();
const PORT = 3000;

app.use(bodyParser.json());

// 🔁 Register all your routers
app.use("/", quoteRouter);

console.log("[api] Starting Express gateway...");
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running at http://localhost:${PORT}`);
});