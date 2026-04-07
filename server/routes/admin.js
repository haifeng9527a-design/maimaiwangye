const express = require("express");
const bcrypt = require("bcryptjs");
const db = require("../db");
const { requireAdmin } = require("../auth");
const { requireEnv, sanitizeSettings, signAdminToken } = require("../utils");
const { sendMail, buildShippingEmail } = require("../mailer");

const router = express.Router();

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

router.get("/dashboard", requireAdmin, async (_req, res) => {
  try {
    const [orders, settings] = await Promise.all([
      db.listOrders(),
      db.getSettings()
    ]);

    res.json({
      orders,
      settings: sanitizeSettings(settings)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
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
