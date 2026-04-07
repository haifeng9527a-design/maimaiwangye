const crypto = require("crypto");
const express = require("express");
const db = require("../db");

const router = express.Router();

function hashIp(value) {
  if (!value) {
    return "";
  }

  return crypto.createHash("sha256").update(String(value)).digest("hex").slice(0, 24);
}

router.post("/events", async (req, res) => {
  const {
    sessionId = "",
    visitorId = "",
    eventType = "",
    pagePath = "",
    referrer = "",
    channel = "",
    orderNo = "",
    customerName = "",
    email = "",
    phone = "",
    metadata = {}
  } = req.body || {};

  if (!sessionId || !eventType) {
    return res.status(400).json({ error: "缺少基础统计参数。" });
  }

  const ip =
    req.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    "";
  const userAgent = req.headers["user-agent"]?.toString() || "";

  try {
    const analyticsEvent = await db.createAnalyticsEvent({
      session_id: sessionId,
      visitor_id: visitorId,
      event_type: eventType,
      page_path: pagePath,
      referrer,
      channel,
      order_no: orderNo,
      ip_hash: hashIp(ip),
      user_agent: userAgent,
      metadata
    });

    if (eventType === "contact_click") {
      await db.createContactEvent({
        session_id: sessionId,
        visitor_id: visitorId,
        channel,
        page_path: pagePath,
        order_no: orderNo,
        customer_name: customerName,
        email,
        phone,
        metadata
      });
    }

    return res.status(201).json({ ok: true, eventId: analyticsEvent.id });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;
