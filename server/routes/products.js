const express = require("express");
const db = require("../db");
const { sanitizeProduct } = require("../utils");

const router = express.Router();

router.get("/", async (_req, res) => {
  try {
    const products = await db.listProducts({ activeOnly: true });
    res.json({ products: products.map(sanitizeProduct) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/:slug", async (req, res) => {
  try {
    const product = await db.getProductBySlug(req.params.slug);
    if (!product || !product.is_active) {
      return res.status(404).json({ error: "商品不存在。" });
    }

    return res.json({ product: sanitizeProduct(product) });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;
