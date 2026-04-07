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

function formatPaymentMethodLabel(method) {
  return {
    stripe: "Stripe 在线支付",
    crypto: "加密货币付款",
    bank_transfer: "银行转账",
    wechat_pay: "微信付款",
    alipay: "支付宝付款"
  }[method] || method;
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
    crypto: order.crypto_expected_amount
      ? `你选择的是 USDT-TRC20 付款，请在 10 分钟内支付 ${Number(order.crypto_expected_amount).toFixed(3)} USDT，系统会自动匹配到账。`
      : (settings.cryptoPaymentText || "你选择的是 USDT-TRC20 付款，请按站点说明完成付款。"),
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
        ${order.payment_method === "crypto" && order.crypto_expected_amount ? `<li>应付金额：${Number(order.crypto_expected_amount).toFixed(3)} USDT</li>` : ""}
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

function buildSupportOrderAlertEmail(order, settings) {
  const subject = `新订单待人工收款：${order.order_no}`;
  const paymentHint = {
    stripe: "客户选择了 Stripe 在线支付，可继续引导客户完成在线付款。",
    crypto: settings.cryptoPaymentText || "客户选择了加密货币付款，请尽快发送链上收款地址。",
    bank_transfer: settings.bankTransferText || "客户选择了银行转账，请尽快发送收款账户信息。",
    wechat_pay: settings.wechatPaymentText || "客户选择了微信付款，请尽快发送微信收款方式。",
    alipay: settings.alipayPaymentText || "客户选择了支付宝付款，请尽快发送支付宝收款方式。"
  }[order.payment_method] || "请尽快联系客户确认付款方式。";

  const addressLines = [
    order.country,
    order.region,
    order.city,
    order.address_line1,
    order.address_line2,
    order.postal_code
  ].filter(Boolean).join(" / ");

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827;">
      <h2>有新订单待跟进</h2>
      <p>请尽快联系客户并提供收款方式。</p>
      <ul>
        <li>订单号：${order.order_no}</li>
        <li>客户：${order.customer_name}</li>
        <li>邮箱：${order.email}</li>
        <li>手机号：${order.phone}</li>
        <li>产品：${order.product_name}</li>
        <li>数量：${order.quantity}</li>
        <li>付款方式：${formatPaymentMethodLabel(order.payment_method)}</li>
        <li>订单金额：${(order.amount_cents / 100).toFixed(2)} ${String(order.currency || "usd").toUpperCase()}</li>
        <li>收货地址：${addressLines || "未填写完整"}</li>
        <li>备注：${order.remark || "无"}</li>
      </ul>
      <p>${paymentHint}</p>
    </div>
  `;

  const text = [
    "有新订单待跟进",
    `订单号：${order.order_no}`,
    `客户：${order.customer_name}`,
    `邮箱：${order.email}`,
    `手机号：${order.phone}`,
    `产品：${order.product_name}`,
    `数量：${order.quantity}`,
    `付款方式：${formatPaymentMethodLabel(order.payment_method)}`,
    `订单金额：${(order.amount_cents / 100).toFixed(2)} ${String(order.currency || "usd").toUpperCase()}`,
    `收货地址：${addressLines || "未填写完整"}`,
    `备注：${order.remark || "无"}`,
    paymentHint
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

function buildPaymentConfirmedEmail(order) {
  const subject = `付款已确认：${order.order_no}`;
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827;">
      <h2>付款已确认</h2>
      <p>你好，${order.customer_name}：</p>
      <p>我们已经确认收到你的付款，订单正在安排处理中。</p>
      <ul>
        <li>订单号：${order.order_no}</li>
        <li>产品：${order.product_name}</li>
        <li>数量：${order.quantity}</li>
        <li>支付状态：${order.payment_status}</li>
        <li>订单状态：${order.order_status}</li>
      </ul>
      <p>商家正在准备发货，请留意后续通知邮件。</p>
    </div>
  `;

  const text = [
    "付款已确认",
    `订单号：${order.order_no}`,
    `产品：${order.product_name}`,
    `数量：${order.quantity}`,
    `支付状态：${order.payment_status}`,
    `订单状态：${order.order_status}`,
    "商家正在准备发货，请留意后续通知邮件。"
  ].join("\n");

  return { subject, html, text };
}

module.exports = {
  sendMail,
  buildOrderConfirmationEmail,
  buildShippingEmail,
  buildSupportOrderAlertEmail,
  buildPaymentConfirmedEmail
};
