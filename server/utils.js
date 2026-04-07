const jwt = require("jsonwebtoken");

function createOrderNumber() {
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `LD-${timestamp}-${random}`;
}

function requireEnv(name, fallback = "") {
  return process.env[name] || fallback;
}

function signAdminToken(payload) {
  return jwt.sign(payload, requireEnv("JWT_SECRET", "dev-secret"), {
    expiresIn: "12h"
  });
}

function verifyAdminToken(token) {
  return jwt.verify(token, requireEnv("JWT_SECRET", "dev-secret"));
}

function sanitizeSettings(row) {
  if (!row) {
    return null;
  }

  return {
    siteName: row.site_name,
    supportText: row.support_text,
    checkoutNotice: row.checkout_notice,
    whatsapp: row.whatsapp,
    telegram: row.telegram,
    wechat: row.wechat,
    email: row.email,
    phone: row.phone,
    instagram: row.instagram,
    stripePublishableKey: row.stripe_publishable_key,
    stripePriceId: row.stripe_price_id,
    bankTransferText: row.bank_transfer_text,
    cryptoPaymentText: row.crypto_payment_text,
    wechatPaymentText: row.wechat_payment_text,
    alipayPaymentText: row.alipay_payment_text,
    updatedAt: row.updated_at
  };
}

module.exports = {
  createOrderNumber,
  requireEnv,
  sanitizeSettings,
  signAdminToken,
  verifyAdminToken
};
