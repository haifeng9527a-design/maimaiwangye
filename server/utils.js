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
    cryptoWalletAddress: row.crypto_wallet_address,
    cryptoQrCodeUrl: row.crypto_qr_code_url,
    wechatPaymentText: row.wechat_payment_text,
    wechatQrCodeUrl: row.wechat_qr_code_url,
    alipayPaymentText: row.alipay_payment_text,
    alipayQrCodeUrl: row.alipay_qr_code_url,
    updatedAt: row.updated_at
  };
}

function sanitizeProduct(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    subtitle: row.subtitle,
    priceUsd: Number(row.price_usd || 0),
    comparePriceUsd: row.compare_price_usd === null || row.compare_price_usd === undefined
      ? null
      : Number(row.compare_price_usd),
    summary: row.summary,
    description: row.description,
    primaryImageUrl: row.primary_image_url,
    galleryImageUrls: Array.isArray(row.gallery_image_urls) ? row.gallery_image_urls : [],
    isActive: Boolean(row.is_active),
    sortOrder: Number(row.sort_order || 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

module.exports = {
  createOrderNumber,
  requireEnv,
  sanitizeSettings,
  sanitizeProduct,
  signAdminToken,
  verifyAdminToken
};
