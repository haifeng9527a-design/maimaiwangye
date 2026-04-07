const path = require("path");
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const settingsRouter = require("./routes/settings");
const ordersRouter = require("./routes/orders");
const adminRouter = require("./routes/admin");
const productsRouter = require("./routes/products");
const analyticsRouter = require("./routes/analytics");
const { stripeWebhookHandler } = require("./routes/stripe");

const app = express();
const port = Number(process.env.PORT || 3000);
const rootDir = path.join(__dirname, "..");

app.use(cors());
app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), stripeWebhookHandler);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(rootDir));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/settings", settingsRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/admin", adminRouter);
app.use("/api/products", productsRouter);
app.use("/api/analytics", analyticsRouter);

app.get("/admin", (_req, res) => {
  res.sendFile(path.join(rootDir, "admin.html"));
});

app.get("/checkout", (_req, res) => {
  res.sendFile(path.join(rootDir, "checkout.html"));
});

app.get("/success", (_req, res) => {
  res.sendFile(path.join(rootDir, "success.html"));
});

app.get("/cancel", (_req, res) => {
  res.sendFile(path.join(rootDir, "cancel.html"));
});

app.get("/product", (_req, res) => {
  res.sendFile(path.join(rootDir, "product.html"));
});

app.get("/guide", (_req, res) => {
  res.sendFile(path.join(rootDir, "guide.html"));
});

app.get("/story", (_req, res) => {
  res.sendFile(path.join(rootDir, "story.html"));
});

app.get("/", (_req, res) => {
  res.sendFile(path.join(rootDir, "index.html"));
});

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
