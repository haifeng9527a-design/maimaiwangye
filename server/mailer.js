const nodemailer = require("nodemailer");
const { requireEnv } = require("./utils");

function createTransporter() {
  const host = requireEnv("SMTP_HOST", "");
  const user = requireEnv("SMTP_USER", "");
  const pass = requireEnv("SMTP_PASS", "");

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port: Number(requireEnv("SMTP_PORT", "587")),
    secure: requireEnv("SMTP_SECURE", "false") === "true",
    auth: {
      user,
      pass
    }
  });
}

function getMailFrom() {
  return requireEnv("MAIL_FROM", requireEnv("SMTP_USER", ""));
}

async function sendMail({ to, subject, html, text }) {
  const transporter = createTransporter();
  const from = getMailFrom();

  if (!transporter || !from || !to) {
    return { skipped: true };
  }

  await transporter.sendMail({
    from,
    to,
    subject,
    text,
    html
  });

  return { skipped: false };
}

function buildOrderConfirmationEmail(order, settings) {
  const subject = `订单已收到：${order.order_no}`;
  const manualHint = {
    stripe: "你选择的是 Stripe 在线支付，完成付款后系统会自动更新订单状态。",
    crypto: settings.cryptoPaymentText || "你选择的是加密货币付款，请按站点说明联系确认收款地址。",
    bank_transfer: settings.bankTransferText || "你选择的是银行转账，请按站点说明完成付款并联系确认。",
    wechat_pay: settings.wechatPaymentText || "你选择的是微信付款，请联系客服获取收款信息。",
    alipay: settings.alipayPaymentText || "你选择的是支付宝付款，请联系客服获取收款信息。"
  }[order.payment_method] || "订单已收到，我们会尽快与你联系。";

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827;">
      <h2>订单已收到</h2>
      <p>你好，${order.customer_name}：</p>
      <p>我们已经收到你的订单，以下是订单信息。</p>
      <ul>
        <li>订单号：${order.order_no}</li>
        <li>产品：${order.product_name}</li>
        <li>数量：${order.quantity}</li>
        <li>付款方式：${order.payment_method}</li>
        <li>支付状态：${order.payment_status}</li>
      </ul>
      <p>${manualHint}</p>
      <p>如需帮助，可通过站点客服联系我们。</p>
    </div>
  `;

  const text = [
    "订单已收到",
    `订单号：${order.order_no}`,
    `产品：${order.product_name}`,
    `数量：${order.quantity}`,
    `付款方式：${order.payment_method}`,
    `支付状态：${order.payment_status}`,
    manualHint
  ].join("\n");

  return { subject, html, text };
}

function buildShippingEmail(order) {
  const subject = `订单已发货：${order.order_no}`;
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827;">
      <h2>订单已发货</h2>
      <p>你好，${order.customer_name}：</p>
      <p>你的订单已经发货，物流信息如下：</p>
      <ul>
        <li>订单号：${order.order_no}</li>
        <li>物流公司：${order.shipping_carrier || "待补充"}</li>
        <li>运单号：${order.tracking_number || "待补充"}</li>
        <li>查询链接：${order.tracking_url || "待补充"}</li>
      </ul>
      <p>请留意签收。</p>
    </div>
  `;

  const text = [
    "订单已发货",
    `订单号：${order.order_no}`,
    `物流公司：${order.shipping_carrier || "待补充"}`,
    `运单号：${order.tracking_number || "待补充"}`,
    `查询链接：${order.tracking_url || "待补充"}`
  ].join("\n");

  return { subject, html, text };
}

module.exports = {
  sendMail,
  buildOrderConfirmationEmail,
  buildShippingEmail
};
