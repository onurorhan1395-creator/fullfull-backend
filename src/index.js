require("dotenv").config();
const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

const { apiKeyAuth } = require("./middleware/auth");
const recordsRouter = require("./routes/records");
const dashboardRouter = require("./routes/dashboard");

const app = express();

app.use(cors());
app.use(express.json());
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.get("/health", (req, res) => res.json({ durum: "ayakta" }));

app.use("/api/kayitlar", apiKeyAuth, recordsRouter);
app.use("/api/dashboard", apiKeyAuth, dashboardRouter);

app.use((req, res) => res.status(404).json({ hata: "Endpoint bulunamadi." }));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ hata: "Sunucu hatasi.", detay: err.message });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Full+Full Panel backend calisiyor: http://localhost:${PORT}`);
});
