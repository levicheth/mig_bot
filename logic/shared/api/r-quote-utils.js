// routes/quote.js
const express = require("express");
const router = express.Router();
const { calculateTimeSavings, countOutputLines } = require("../utils/quote-utils");

router.post("/calc-time-savings", (req, res) => {
  console.log("[API] POST /calc-time-savings invoked with body:", req.body);
  const { lineCount } = req.body;  

  if (typeof lineCount !== "number") {
    return res.status(400).json({ error: "lineCount must be a number" });
  }

  const result = calculateTimeSavings(lineCount);
  res.json({ result });
});

router.post("/count-output-lines", (req, res) => {
  console.log("[API] POST /count-output-lines invoked with body:", req.body);
  const { records } = req.body;
  if (!Array.isArray(records)) {
    return res.status(400).json({ error: "records must be an array" });
  }
  const result = countOutputLines(records);
  res.json({ result });
});

module.exports = router;
