const express = require("express");
const Stripe = require("stripe");
const db = require("../db");
const { createOrderNumber, requireEnv } = require("../utils");
const { formatUsdtAmount, findMatchingIncomingUsdtPayment } = require("../crypto");
const {
  sendMail,
  buildOrderConfirmationEmail,
  buildSupportOrderAlertEmail,
  buildPaymentConfirmedEmail
} = require("../mailer");

const router = express.Router();

function getStripeClient() {
  const secretKey = requireEnv("STRIPE_SECRET_KEY", "");
  if (!secretKey) {
    return null;
  }
  return new Stripe(secretKey);
}

function getManualPaymentInstructions(settings, paymentMethod) {
  return {
    bank_transfer: settings.bankTransferText || "请联系客服获取银行转账收款信息。",
    crypto: settings.cryptoPaymentText || "请使用 USDT-TRC20 地址完成付款，付款后提交 TXID 自动核单。",
    wechat_pay: settings.wechatPaymentText || "请联系客服获取微信付款方式。",
    alipay: settings.alipayPaymentText || "请联系客服获取支付宝付款方式。"
  }[paymentMethod] || "";
}

function buildCryptoPaymentWindow() {
  const now = Date.now();
  const expiresAt = new Date(now + (10 * 60 * 1000)).toISOString();
  return { now, expiresAt };
}

function buildUniqueUsdtAmount(amountCents, orderNo) {
  const baseAmount = Number(amountCents || 0) / 100;
  const numericPart = String(orderNo || "").replace(/[^\d]/g, "");
  const suffix = Number(numericPart.slice(-3) || "0") / 1000;
  return Number((baseAmount + suffix).toFixed(3));
}

async function sendPaymentConfirmedEmailIfNeeded(orderNo, order) {
  if (!order?.email || order?.payment_confirmed_email_sent) {
    return order;
  }

  try {
    const emailPayload = buildPaymentConfirmedEmail(order);
    const result = await sendMail({
      to: order.email,
      ...emailPayload
    });

    if (!result.skipped) {
      return await db.updateOrderByNo(orderNo, {
        payment_confirmed_email_sent: true
      });
    }
  } catch (_error) {
    return order;
  }

  return order;
}

function formatPaymentMethodLabel(method) {
  return {
    stripe: "Stripe 在线支付",
    crypto: "加密货币付款",
    bank_transfer: "银行转账",
    wechat_pay: "微信付款",
    alipay: "支付宝付款"
  }[method] || method;
}

function normalizeWhatsappHref(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    return "";
  }

  if (/^https?:\/\//i.test(raw)) {
    return raw;
  }

  const digits = raw.replace(/[^\d]/g, "");
  return digits ? `https://wa.me/${digits}` : "";
}

function normalizeTelegramHref(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    return "";
  }

  if (/^https?:\/\//i.test(raw)) {
    return raw;
  }

  const username = raw.replace(/^@+/, "").trim();
  return username ? `https://t.me/${username}` : "";
}

function normalizeEmailHref(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    return "";
  }

  return raw.startsWith("mailto:") ? raw : `mailto:${raw}`;
}

function buildMailtoHref(value, subject, body) {
  const base = normalizeEmailHref(value);
  if (!base) {
    return "";
  }

  return `${base}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function normalizePhoneHref(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    return "";
  }

  const normalized = raw.replace(/\s+/g, "");
  return normalized.startsWith("tel:") ? normalized : `tel:${normalized}`;
}

function buildSupportMessage(order) {
  return [
    "你好，我刚提交了订单，想获取付款方式。",
    `订单号：${order.order_no}`,
    `姓名：${order.customer_name}`,
    `产品：${order.product_name} x ${order.quantity}`,
    `付款方式：${formatPaymentMethodLabel(order.payment_method)}`,
    `手机号：${order.phone}`,
    `邮箱：${order.email}`
  ].join("\n");
}

function appendQuery(url, key, value) {
  if (!url || !key || !value) {
    return url;
  }

  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}${key}=${encodeURIComponent(value)}`;
}

function buildSupportContacts(options, order) {
  const message = buildSupportMessage(order);
  return [
    {
      type: "whatsapp",
      label: "WhatsApp",
      value: String(options.whatsapp || "").trim(),
      href: appendQuery(normalizeWhatsappHref(options.whatsapp), "text", message)
    },
    {
      type: "telegram",
      label: "Telegram",
      value: String(options.telegram || "").trim(),
      href: appendQuery(normalizeTelegramHref(options.telegram), "text", message)
    },
    {
      type: "email",
      label: "邮箱",
      value: String(options.email || "").trim(),
      href: buildMailtoHref(options.email, `订单付款咨询 ${order.order_no}`, message)
    },
    {
      type: "phone",
      label: "电话",
      value: String(options.phone || "").trim(),
      href: normalizePhoneHref(options.phone)
    }
  ].filter((item) => item.href);
}

router.post("/", async (req, res) => {
  const {
    customerName = "",
    phone = "",
    email = "",
    country = "",
    addressLine1 = "",
    addressLine2 = "",
    city = "",
    region = "",
    postalCode = "",
    productName = "Ledger",
    productSlug = "",
    quantity = 1,
    remark = "",
    amountCents = 0,
    currency = "usd",
    paymentMethod = "stripe"
  } = req.body || {};

  if (!customerName || !phone || !email || !country || !addressLine1 || !city || !region || !postalCode) {
    return res.status(400).json({ error: "请完整填写收货信息。" });
  }

  const orderNo = createOrderNumber();

  const stripe = getStripeClient();

  try {
    const [settings, product] = await Promise.all([
      db.getSettings(),
      productSlug ? db.getProductBySlug(productSlug) : null
    ]);

    const resolvedProductName = product?.name || productName;
    const resolvedAmountCents = product
      ? Math.round(Number(product.price_usd || 0) * 100) * Math.max(Number(quantity || 1), 1)
      : amountCents;

    if (!resolvedProductName || !resolvedAmountCents) {
      return res.status(400).json({ error: "商品信息无效，请刷新页面后重试。" });
    }

    const normalizedPaymentMethod = String(paymentMethod || "stripe");
    const initialPaymentStatus = normalizedPaymentMethod === "stripe" ? "pending" : "manual_review";
    const cryptoPaymentWindow = normalizedPaymentMethod === "crypto" ? buildCryptoPaymentWindow() : null;
    const cryptoExpectedAmount = normalizedPaymentMethod === "crypto"
      ? buildUniqueUsdtAmount(resolvedAmountCents, orderNo)
      : null;
    const createdOrder = await db.createOrder({
      order_no: orderNo,
      customer_name: customerName,
      phone,
      email,
      country,
      address_line1: addressLine1,
      address_line2: addressLine2,
      city,
      region,
      postal_code: postalCode,
      product_name: resolvedProductName,
      quantity,
      remark,
      payment_method: normalizedPaymentMethod,
      payment_status: initialPaymentStatus,
      order_status: "pending",
      amount_cents: resolvedAmountCents,
      currency,
      stripe_session_id: "",
      payment_reference: "",
      shipping_carrier: "",
      tracking_number: "",
      tracking_url: "",
      admin_note: "",
      notification_email_sent: false,
      shipping_email_sent: false,
      crypto_txid: "",
      crypto_verified_at: null,
      crypto_expected_amount: cryptoExpectedAmount,
      crypto_payment_expires_at: cryptoPaymentWindow?.expiresAt || null,
      payment_confirmed_email_sent: false
    });

    let notificationEmailSent = false;
    try {
      const emailPayload = buildOrderConfirmationEmail(createdOrder, settings);
      const result = await sendMail({
        to: createdOrder.email,
        ...emailPayload
      });
      notificationEmailSent = !result.skipped;
    } catch (_error) {
      notificationEmailSent = false;
    }

    try {
      const supportEmail = String(settings.email || "").trim();
      if (supportEmail) {
        const supportPayload = buildSupportOrderAlertEmail(createdOrder, settings);
        await sendMail({
          to: supportEmail,
          ...supportPayload
        });
      }
    } catch (_error) {
      // 客服提醒发送失败不阻塞订单创建
    }

    const supportContacts = buildSupportContacts(settings, createdOrder);

    if (notificationEmailSent) {
      await db.updateOrderByNo(orderNo, {
        notification_email_sent: true
      });
    }

    if (normalizedPaymentMethod !== "stripe") {
      return res.status(201).json({
        orderNo,
        paymentUrl: null,
        manualPaymentInstructions: getManualPaymentInstructions(settings, normalizedPaymentMethod),
        supportContacts,
        cryptoExpectedAmount,
        cryptoPaymentExpiresAt: cryptoPaymentWindow?.expiresAt || null,
        message: normalizedPaymentMethod === "crypto"
          ? `订单已创建，请在 10 分钟内支付 ${formatUsdtAmount(cryptoExpectedAmount, 3)} USDT，系统会自动核对到账。`
          : "订单已创建，订单信息已同步给客服，请立即选择一种方式联系客服获取付款方式并完成支付。"
      });
    }

    if (!stripe) {
      return res.status(201).json({
        orderNo,
        paymentUrl: null,
        message: "Stripe 尚未配置，订单已创建，可先在后台查看。"
      });
    }

    const baseUrl = requireEnv("BASE_URL", "http://localhost:3000");
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: email,
      success_url: `${baseUrl}/success.html?orderNo=${orderNo}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/cancel.html?orderNo=${orderNo}`,
      line_items: [
        {
          price_data: {
            currency,
            product_data: {
              name: resolvedProductName
            },
            unit_amount: Math.round(Number(product?.price_usd || (resolvedAmountCents / Math.max(Number(quantity || 1), 1) / 100)) * 100)
          },
          quantity
        }
      ],
      metadata: {
        orderNo
      }
    });

    await db.updateOrderByNo(orderNo, {
      stripe_session_id: session.id
    });

    return res.status(201).json({
      orderNo,
      paymentUrl: session.url,
      supportContacts
    });
  } catch (error) {
    return res.status(500).json({
      error: "支付会话创建失败。",
      detail: error.message
    });
  }
});

router.get("/:orderNo", (req, res) => {
  const { orderNo } = req.params;
  db.getOrderByNo(orderNo)
    .then((order) => {
      if (!order) {
        return res.status(404).json({ error: "订单不存在。" });
      }

      return res.json({ order });
    })
    .catch((error) => {
      return res.status(500).json({ error: error.message });
    });
});

router.post("/confirm-session", async (req, res) => {
  const { sessionId = "" } = req.body || {};
  if (!sessionId) {
    return res.status(400).json({ error: "缺少支付会话 ID。" });
  }

  const stripe = getStripeClient();
  if (!stripe) {
    return res.status(400).json({ error: "Stripe 尚未配置。" });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const orderNo = session.metadata?.orderNo;

    if (!orderNo) {
      return res.status(400).json({ error: "无效的支付会话。" });
    }

    if (session.payment_status === "paid") {
      await db.updateOrderByNo(orderNo, {
        payment_status: "paid",
        order_status: "confirmed"
      });
    }

    const order = await db.getOrderByNo(orderNo);
    return res.json({ order });
  } catch (error) {
    return res.status(500).json({
      error: "支付状态确认失败。",
      detail: error.message
    });
  }
});

router.post("/:orderNo/verify-crypto", async (req, res) => {
  const { orderNo } = req.params;

  try {
    const [order, settings] = await Promise.all([
      db.getOrderByNo(orderNo),
      db.getSettings()
    ]);

    if (!order) {
      return res.status(404).json({ error: "订单不存在。" });
    }

    if (order.payment_method !== "crypto") {
      return res.status(400).json({ error: "当前订单不是加密货币付款订单。" });
    }

    if (order.payment_status === "paid") {
      return res.json({
        order,
        message: "该订单已确认付款，商家正在处理中。"
      });
    }

    const expiresAt = order.crypto_payment_expires_at ? new Date(order.crypto_payment_expires_at).getTime() : 0;
    const createdAt = order.created_at ? new Date(order.created_at).getTime() : Date.now();
    const minTimestamp = createdAt;
    const maxTimestamp = expiresAt || (createdAt + 10 * 60 * 1000);

    if (Date.now() > maxTimestamp) {
      return res.status(400).json({ error: "该订单的 USDT 支付时间窗口已过，请重新下单或联系客服处理。" });
    }

    const verification = await findMatchingIncomingUsdtPayment({
      receiverAddress: settings.crypto_wallet_address,
      expectedAmount: Number(order.crypto_expected_amount || 0),
      minTimestamp,
      maxTimestamp,
      excludeTxids: []
    });

    if (!verification.matched) {
      return res.status(400).json({ error: verification.detail });
    }

    let updatedOrder = await db.updateOrderByNo(orderNo, {
      payment_status: "paid",
      order_status: "confirmed",
      payment_reference: verification.txid,
      crypto_txid: verification.txid,
      crypto_verified_at: new Date().toISOString(),
      admin_note: [order.admin_note, `USDT-TRC20 唯一金额自动核单成功：${verification.detail}`].filter(Boolean).join("\n")
    });

    updatedOrder = await sendPaymentConfirmedEmailIfNeeded(orderNo, updatedOrder);

    return res.json({
      order: updatedOrder,
      message: "付款已确认，商家正在准备发货。"
    });
  } catch (error) {
    return res.status(500).json({
      error: "自动核单失败。",
      detail: error.message
    });
  }
});

module.exports = router;
