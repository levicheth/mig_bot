// api_server.js
const express = require("express");
const bodyParser = require("body-parser");
const quoteRouter = require("./r-quote-utils");

const app = express();
const PORT = 3000;

app.use(bodyParser.json());

// 🔁 Register all your routers
app.use("/", quoteRouter);

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});