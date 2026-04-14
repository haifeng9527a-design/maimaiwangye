const fs = require("fs");
const path = require("path");
const express = require("express");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const db = require("../db");
const { requireAdmin } = require("../auth");
const { requireEnv, sanitizeSettings, sanitizeProduct, signAdminToken } = require("../utils");
const { sendMail, buildShippingEmail } = require("../mailer");

const router = express.Router();
const productUploadDir = path.join(__dirname, "..", "..", "assets", "uploads", "products");

fs.mkdirSync(productUploadDir, { recursive: true });

const productImageUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, productUploadDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname || "").toLowerCase() || ".jpg";
      const safeBase = path.basename(file.originalname || "product-image", ext)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 60) || "product-image";

      cb(null, `${Date.now()}-${safeBase}${ext}`);
    }
  }),
  limits: {
    fileSize: 8 * 1024 * 1024
  },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    const allowedExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);
    const isImageMime = file.mimetype && file.mimetype.startsWith("image/");
    if (!isImageMime && !allowedExtensions.has(ext)) {
      cb(new Error("仅支持上传图片文件。"));
      return;
    }

    cb(null, true);
  }
});

router.post("/login", async (req, res) => {
  const { username = "", password = "" } = req.body || {};

  const expectedUsername = requireEnv("ADMIN_USERNAME", "admin");
  const expectedPassword = requireEnv("ADMIN_PASSWORD", "change-me");

  const passwordMatches = await bcrypt.compare(
    password,
    await bcrypt.hash(expectedPassword, 10)
  );

  if (username !== expectedUsername || !passwordMatches) {
    return res.status(401).json({ error: "用户名或密码错误。" });
  }

  const token = signAdminToken({ username });
  return res.json({ token });
});

router.post("/upload-image", requireAdmin, (req, res) => {
  productImageUpload.single("image")(req, res, (error) => {
    if (error) {
      return res.status(400).json({ error: error.message || "图片上传失败。" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "请选择要上传的图片。" });
    }

    return res.status(201).json({
      url: `/assets/uploads/products/${req.file.filename}`
    });
  });
});

router.get("/dashboard", requireAdmin, async (_req, res) => {
  try {
    const [orders, settings, dashboardSummary, contactEvents, products] = await Promise.all([
      db.listOrders(),
      db.getSettings(),
      db.getDashboardSummary(),
      db.listContactEvents({ limit: 50 }),
      db.listProducts()
    ]);

    res.json({
      summary: dashboardSummary,
      orders,
      contactEvents,
      products: products.map(sanitizeProduct),
      settings: sanitizeSettings(settings)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/analytics", requireAdmin, async (_req, res) => {
  try {
    const [summary, events] = await Promise.all([
      db.getDashboardSummary(),
      db.listAnalyticsEvents({ limit: 200 })
    ]);

    return res.json({
      summary,
      events
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.get("/contact-events", requireAdmin, async (_req, res) => {
  try {
    const contactEvents = await db.listContactEvents({ limit: 200 });
    return res.json({ contactEvents });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.get("/products", requireAdmin, async (_req, res) => {
  try {
    const products = await db.listProducts();
    return res.json({ products: products.map(sanitizeProduct) });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.post("/products", requireAdmin, async (req, res) => {
  const payload = req.body || {};

  try {
    const product = await db.createProduct({
      slug: payload.slug,
      name: payload.name,
      subtitle: payload.subtitle || "",
      price_usd: Number(payload.priceUsd || 0),
      compare_price_usd: payload.comparePriceUsd === "" || payload.comparePriceUsd === null || payload.comparePriceUsd === undefined
        ? null
        : Number(payload.comparePriceUsd),
      summary: payload.summary || "",
      description: payload.description || "",
      primary_image_url: payload.primaryImageUrl || "",
      gallery_image_urls: Array.isArray(payload.galleryImageUrls)
        ? payload.galleryImageUrls
        : String(payload.galleryImageUrls || "")
          .split("\n")
          .map((item) => item.trim())
          .filter(Boolean),
      is_active: payload.isActive !== false,
      sort_order: Number(payload.sortOrder || 0)
    });

    return res.status(201).json({ product: sanitizeProduct(product) });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.patch("/products/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const payload = req.body || {};

  try {
    const product = await db.updateProductById(id, {
      slug: payload.slug,
      name: payload.name,
      subtitle: payload.subtitle,
      price_usd: payload.priceUsd === undefined ? undefined : Number(payload.priceUsd),
      compare_price_usd: payload.comparePriceUsd === undefined
        ? undefined
        : (payload.comparePriceUsd === "" || payload.comparePriceUsd === null ? null : Number(payload.comparePriceUsd)),
      summary: payload.summary,
      description: payload.description,
      primary_image_url: payload.primaryImageUrl,
      gallery_image_urls: payload.galleryImageUrls === undefined
        ? undefined
        : (Array.isArray(payload.galleryImageUrls)
          ? payload.galleryImageUrls
          : String(payload.galleryImageUrls || "")
            .split("\n")
            .map((item) => item.trim())
            .filter(Boolean)),
      is_active: payload.isActive,
      sort_order: payload.sortOrder === undefined ? undefined : Number(payload.sortOrder)
    });

    if (!product) {
      return res.status(404).json({ error: "商品不存在。" });
    }

    return res.json({ product: sanitizeProduct(product) });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.delete("/products/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    await db.deleteProductById(id);
    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.patch("/orders/:orderNo", requireAdmin, async (req, res) => {
  const { orderNo } = req.params;
  const {
    orderStatus,
    paymentStatus,
    shippingCarrier,
    trackingNumber,
    trackingUrl,
    paymentReference,
    adminNote,
    sendShippingEmail
  } = req.body || {};

  try {
    let order = await db.updateOrderByNo(orderNo, {
      order_status: orderStatus || undefined,
      payment_status: paymentStatus || undefined,
      shipping_carrier: shippingCarrier ?? undefined,
      tracking_number: trackingNumber ?? undefined,
      tracking_url: trackingUrl ?? undefined,
      payment_reference: paymentReference ?? undefined,
      admin_note: adminNote ?? undefined,
      shipped_at: orderStatus === "shipped" ? new Date().toISOString() : undefined
    });

    if (!order) {
      return res.status(404).json({ error: "订单不存在。" });
    }

    if (sendShippingEmail && order.email) {
      try {
        const emailPayload = buildShippingEmail(order);
        const result = await sendMail({
          to: order.email,
          ...emailPayload
        });

        if (!result.skipped) {
          order = await db.updateOrderByNo(orderNo, {
            shipping_email_sent: true
          });
        }
      } catch (_error) {
        // Keep the order update even if notification sending fails.
      }
    }

    return res.json({ order });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;
