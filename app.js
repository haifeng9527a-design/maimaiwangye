document.documentElement.classList.add("js");

const menuToggle = document.querySelector(".menu-toggle");
const siteNav = document.querySelector(".site-nav");

if (menuToggle && siteNav) {
  menuToggle.addEventListener("click", () => {
    const isOpen = siteNav.classList.toggle("is-open");
    menuToggle.setAttribute("aria-expanded", String(isOpen));
  });
}

document.querySelectorAll(".faq-trigger").forEach((trigger) => {
  trigger.addEventListener("click", () => {
    const item = trigger.closest(".faq-item");
    const isOpen = item.classList.toggle("is-open");
    trigger.setAttribute("aria-expanded", String(isOpen));
  });
});

const defaultSettings = {
  siteName: "COLDARC",
  supportText: "支持咨询、下单、发货与基础售后说明。",
  checkoutNotice: "下单前请确认产品型号、联系方式与收货地址。",
  whatsapp: "",
  telegram: "",
  wechat: "",
  email: "",
  phone: "",
  instagram: "",
  stripePublishableKey: "",
  stripePriceId: "",
  bankTransferText: "",
  cryptoPaymentText: "",
  wechatPaymentText: "",
  alipayPaymentText: ""
};

function getApiBase() {
  const { protocol, hostname, port, origin } = window.location;
  if ((hostname === "localhost" || hostname === "127.0.0.1") && port && port !== "3000") {
    return `${protocol}//${hostname}:3000`;
  }
  return origin;
}

const API_BASE = getApiBase();

function getPaymentMethodMeta(settings) {
  return {
    stripe: {
      label: "Stripe 在线支付",
      description: "提交订单后会自动跳转到 Stripe 支付页面完成付款。",
      manualText: ""
    },
    crypto: {
      label: "加密货币付款",
      description: "提交订单后会保留订单，并显示加密货币付款说明，由客服人工确认到账。",
      manualText: settings.cryptoPaymentText || "请联系客服获取链上收款地址。"
    },
    bank_transfer: {
      label: "银行转账",
      description: "提交订单后会保留订单，并显示银行转账说明，由客服人工确认到账。",
      manualText: settings.bankTransferText || "请联系客服获取银行转账收款信息。"
    },
    wechat_pay: {
      label: "微信付款",
      description: "提交订单后会显示微信付款说明，请按后台说明完成支付并联系客服确认。",
      manualText: settings.wechatPaymentText || "请联系客服获取微信付款方式。"
    },
    alipay: {
      label: "支付宝付款",
      description: "提交订单后会显示支付宝付款说明，请按后台说明完成支付并联系客服确认。",
      manualText: settings.alipayPaymentText || "请联系客服获取支付宝付款方式。"
    }
  };
}

async function fetchSettings() {
  try {
    const response = await fetch(`${API_BASE}/api/settings`);
    if (!response.ok) {
      throw new Error("Failed to load settings");
    }

    const data = await response.json();
    return {
      ...defaultSettings,
      ...(data.settings || {})
    };
  } catch (_error) {
    return { ...defaultSettings };
  }
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

function normalizePhoneHref(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    return "";
  }

  const normalized = raw.replace(/\s+/g, "");
  return normalized.startsWith("tel:") ? normalized : `tel:${normalized}`;
}

function normalizeInstagramHref(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    return "";
  }

  if (/^https?:\/\//i.test(raw)) {
    return raw;
  }

  const username = raw.replace(/^@+/, "").trim();
  return username ? `https://instagram.com/${username}` : "";
}

function getContactIcon(key) {
  const icons = {
    whatsapp: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12.04 2C6.58 2 2.15 6.42 2.15 11.88c0 1.75.46 3.46 1.34 4.97L2 22l5.29-1.39a9.83 9.83 0 0 0 4.75 1.21h.01c5.46 0 9.89-4.43 9.89-9.89A9.89 9.89 0 0 0 12.04 2Zm0 18.16c-1.49 0-2.95-.4-4.23-1.15l-.3-.18-3.14.83.84-3.06-.2-.31a8.17 8.17 0 0 1-1.27-4.41c0-4.51 3.68-8.19 8.2-8.19 2.19 0 4.25.85 5.8 2.4a8.15 8.15 0 0 1 2.4 5.8c0 4.52-3.68 8.2-8.1 8.27Zm4.49-6.11c-.25-.12-1.48-.73-1.71-.81-.23-.08-.39-.12-.56.12-.16.25-.64.81-.78.98-.14.17-.29.19-.54.06a6.67 6.67 0 0 1-1.96-1.21 7.33 7.33 0 0 1-1.35-1.69c-.14-.24-.02-.38.11-.5.11-.11.25-.29.37-.44.12-.15.16-.25.25-.42.08-.17.04-.31-.02-.44-.06-.12-.56-1.35-.77-1.85-.2-.48-.41-.42-.56-.42h-.48c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.09s.9 2.43 1.02 2.6c.12.17 1.76 2.69 4.27 3.77.6.26 1.06.41 1.42.53.6.19 1.14.16 1.57.1.48-.07 1.48-.6 1.69-1.19.21-.58.21-1.08.14-1.18-.06-.1-.23-.17-.48-.29Z"/>
      </svg>
    `,
    telegram: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M21.94 4.66c.34-.14.66.09.55.52L19.4 19.1c-.08.39-.45.56-.79.37l-4.53-3.34-2.3 2.21c-.25.24-.45.44-.93.44l.33-4.66 8.49-7.68c.37-.33-.08-.52-.57-.19l-10.5 6.61-4.52-1.41c-.38-.12-.39-.38.08-.57L21.94 4.66Z"/>
      </svg>
    `,
    wechat: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M9.54 4.2C5.38 4.2 2 6.94 2 10.32c0 1.9 1.08 3.6 2.8 4.7L4.1 17.8l2.9-1.46c.8.2 1.65.31 2.54.31.28 0 .56-.01.83-.04a5.87 5.87 0 0 1-.56-2.47c0-3.04 2.96-5.5 6.61-5.5.18 0 .35 0 .53.02-.68-2.55-3.5-4.46-6.41-4.46Zm-2.79 5.09a.92.92 0 1 1 0 1.84.92.92 0 0 1 0-1.84Zm5.57 1.84a.92.92 0 1 1 0-1.84.92.92 0 0 1 0 1.84Zm5.07-1.1c-2.97 0-5.38 1.94-5.38 4.33 0 1.37.8 2.58 2.04 3.37l-.4 2.07 2.13-1.07c.52.13 1.06.2 1.61.2 2.97 0 5.38-1.94 5.38-4.33 0-2.39-2.41-4.57-5.38-4.57Zm-1.78 3.59a.75.75 0 1 1 0 1.5.75.75 0 0 1 0-1.5Zm3.56 1.5a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5Z"/>
      </svg>
    `,
    email: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 5.5h18a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-11a1 1 0 0 1 1-1Zm9 7.2 8-5.2H4l8 5.2Zm8 4.8V9.36l-7.46 4.85a1 1 0 0 1-1.08 0L4 9.36v8.14h16Z"/>
      </svg>
    `,
    phone: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6.62 10.79a15.45 15.45 0 0 0 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24a11.3 11.3 0 0 0 3.54.57c.57 0 1.03.46 1.03 1.03V20a1 1 0 0 1-1 1C10.85 21 3 13.15 3 3.97a1 1 0 0 1 1-1h3.45c.57 0 1.03.46 1.03 1.03 0 1.23.2 2.43.57 3.54.11.35.03.74-.25 1.01l-2.18 2.24Z"/>
      </svg>
    `,
    instagram: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5Zm0 2.2A2.8 2.8 0 0 0 4.2 7v10A2.8 2.8 0 0 0 7 19.8h10a2.8 2.8 0 0 0 2.8-2.8V7A2.8 2.8 0 0 0 17 4.2H7Zm10.35 1.65a1.15 1.15 0 1 1 0 2.3 1.15 1.15 0 0 1 0-2.3ZM12 7.2A4.8 4.8 0 1 1 7.2 12 4.8 4.8 0 0 1 12 7.2Zm0 2.2A2.6 2.6 0 1 0 14.6 12 2.6 2.6 0 0 0 12 9.4Z"/>
      </svg>
    `
  };

  return icons[key] || icons.wechat;
}

function buildContactItems(settings) {
  return [
    {
      key: "whatsapp",
      label: "WhatsApp",
      href: normalizeWhatsappHref(settings.whatsapp),
      display: settings.whatsapp || "后台可配置",
      actionText: "点击打开聊天"
    },
    {
      key: "telegram",
      label: "Telegram",
      href: normalizeTelegramHref(settings.telegram),
      display: settings.telegram || "后台可配置",
      actionText: "点击跳转私信"
    },
    {
      key: "wechat",
      label: "微信",
      href: "",
      display: settings.wechat || "后台可配置",
      actionText: "可在后台设置微信号"
    },
    {
      key: "email",
      label: "邮箱",
      href: normalizeEmailHref(settings.email),
      display: settings.email || "后台可配置",
      actionText: "点击发送邮件"
    },
    {
      key: "phone",
      label: "手机号",
      href: normalizePhoneHref(settings.phone),
      display: settings.phone || "后台可配置",
      actionText: "点击直接拨号"
    },
    {
      key: "instagram",
      label: "Instagram",
      href: normalizeInstagramHref(settings.instagram),
      display: settings.instagram || "后台可配置",
      actionText: "点击查看主页"
    }
  ].filter((item) => String(item.display || "").trim() && item.display !== "后台可配置");
}

function renderContactList(container, settings) {
  if (!container) {
    return;
  }

  const items = buildContactItems(settings);
  if (!items.length) {
    container.innerHTML = "";
    const panel = container.closest(".glass-card");
    if (panel) {
      panel.classList.add("hidden");
    }
    return;
  }

  const panel = container.closest(".glass-card");
  if (panel) {
    panel.classList.remove("hidden");
  }

  container.innerHTML = items.map((item) => {
    const content = `
      <span class="contact-icon contact-icon-${item.key}">
        ${getContactIcon(item.key)}
      </span>
      <span class="contact-copy">
        <span class="contact-name">${item.label}</span>
        <span class="contact-value">${item.display}</span>
        <span class="contact-action">${item.href ? item.actionText : "后台可继续设置"}</span>
      </span>
      <span class="contact-arrow" aria-hidden="true">↗</span>
    `;

    if (!item.href) {
      return `<div class="contact-link is-disabled">${content.replace("↗", "")}</div>`;
    }

    return `<a class="contact-link is-ready" href="${item.href}" target="_blank" rel="noreferrer">${content}</a>`;
  }).join("");
}

function updateSiteName(settings) {
  document.querySelectorAll(".brand-text").forEach((node) => {
    if (node.closest(".brand")) {
      node.textContent = settings.siteName || "COLDARC";
    }
  });
}

function populateContactSections(settings) {
  updateSiteName(settings);
  renderContactList(document.getElementById("contact-links"), settings);

  const supportText = document.getElementById("checkout-notice-text");
  if (supportText) {
    supportText.textContent = settings.checkoutNotice || defaultSettings.checkoutNotice;
  }

  const supportLead = document.getElementById("support-text");
  if (supportLead) {
    supportLead.textContent = settings.supportText || defaultSettings.supportText;
  }
}

function parseQuery() {
  return new URLSearchParams(window.location.search);
}

function formatCurrency(amountCents, currency = "usd") {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: currency.toUpperCase()
  }).format(amountCents / 100);
}

function formatPaymentMethodLabel(method) {
  return {
    stripe: "Stripe",
    crypto: "加密货币",
    bank_transfer: "银行转账",
    wechat_pay: "微信付款",
    alipay: "支付宝"
  }[method] || method;
}

async function handleCheckoutForm() {
  const form = document.getElementById("checkout-form");
  if (!form) {
    return;
  }

  const settings = await fetchSettings();
  const statusNode = document.getElementById("checkout-status");
  const amountNode = document.getElementById("checkout-amount-label");
  const paymentLabelNode = document.getElementById("checkout-payment-label");
  const paymentDescriptionNode = document.getElementById("checkout-payment-description");
  const manualPaymentCard = document.getElementById("manual-payment-card");
  const manualPaymentText = document.getElementById("manual-payment-text");
  const quantityInput = form.elements.namedItem("quantity");
  const productInput = form.elements.namedItem("productName");
  const paymentMethodInput = form.elements.namedItem("paymentMethod");

  const productPrices = {
    "Ledger Nano X": 19900,
    "Ledger Nano S Plus": 11900
  };

  const paymentMeta = getPaymentMethodMeta(settings);

  const updatePaymentUi = () => {
    const method = paymentMethodInput.value;
    const meta = paymentMeta[method] || paymentMeta.stripe;
    paymentLabelNode.textContent = meta.label;
    paymentDescriptionNode.textContent = meta.description;

    if (method === "stripe") {
      manualPaymentCard.classList.add("hidden");
      return;
    }

    manualPaymentCard.classList.remove("hidden");
    manualPaymentText.textContent = meta.manualText;
  };

  const updateAmountLabel = () => {
    const price = productPrices[productInput.value] || 19900;
    const quantity = Math.max(Number(quantityInput.value || 1), 1);
    amountNode.textContent = formatCurrency(price * quantity);
  };

  updateAmountLabel();
  updatePaymentUi();
  quantityInput.addEventListener("input", updateAmountLabel);
  productInput.addEventListener("change", updateAmountLabel);
  paymentMethodInput.addEventListener("change", updatePaymentUi);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    statusNode.textContent = "正在创建订单，请稍候...";

    const formData = new FormData(form);
    const productName = formData.get("productName");
    const quantity = Math.max(Number(formData.get("quantity") || 1), 1);
    const amountCents = (productPrices[productName] || 19900) * quantity;

    const payload = {
      productName,
      quantity,
      amountCents,
      currency: "usd",
      paymentMethod: formData.get("paymentMethod"),
      customerName: formData.get("customerName"),
      phone: formData.get("phone"),
      email: formData.get("email"),
      country: formData.get("country"),
      addressLine1: formData.get("addressLine1"),
      addressLine2: formData.get("addressLine2") || "",
      city: formData.get("city"),
      region: formData.get("region"),
      postalCode: formData.get("postalCode"),
      remark: formData.get("remark") || ""
    };

    try {
      const response = await fetch(`${API_BASE}/api/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "订单创建失败。");
      }

      if (data.paymentUrl) {
        window.location.href = data.paymentUrl;
        return;
      }

      if (data.manualPaymentInstructions) {
        manualPaymentCard.classList.remove("hidden");
        manualPaymentText.textContent = data.manualPaymentInstructions;
      }

      statusNode.textContent = data.message
        ? `${data.message} 订单号：${data.orderNo}`
        : `订单已创建。订单号：${data.orderNo}`;
    } catch (error) {
      statusNode.textContent = error.message || "订单提交失败，请稍后重试。";
    }
  });
}

async function handleSuccessPage() {
  const successMessage = document.getElementById("success-message");
  if (!successMessage) {
    return;
  }

  const query = parseQuery();
  const orderNo = query.get("orderNo");
  const sessionId = query.get("session_id");

  if (!orderNo) {
    successMessage.textContent = "支付已完成，请保存订单信息并留意后续联系。";
    return;
  }

  if (!sessionId) {
    successMessage.textContent = `订单 ${orderNo} 已提交成功，我们会尽快确认。`;
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/api/orders/confirm-session`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ sessionId })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "支付确认失败。");
    }

    successMessage.textContent = `订单 ${data.order.order_no} 支付成功，我们会尽快安排后续处理。`;
  } catch (error) {
    successMessage.textContent = error.message || "支付状态确认失败，请联系客服。";
  }
}

let adminOrders = [];

function renderOrders(orders) {
  const tbody = document.getElementById("orders-table-body");
  if (!tbody) {
    return;
  }

  adminOrders = orders;
  tbody.innerHTML = orders.map((order) => `
    <tr>
      <td>${order.order_no}</td>
      <td>
        <strong>${order.customer_name}</strong>
        <div>${order.email}</div>
        <div>${order.phone}</div>
      </td>
      <td>${order.product_name} x ${order.quantity}</td>
      <td>${formatPaymentMethodLabel(order.payment_method)}</td>
      <td><span class="status-pill">${order.payment_status}</span></td>
      <td><span class="status-pill">${order.order_status}</span></td>
      <td>
        <button class="button button-ghost small-button" type="button" data-action="select-order" data-order-no="${order.order_no}">
          处理订单
        </button>
      </td>
    </tr>
  `).join("");
}

function populateOrderEditor(order) {
  const form = document.getElementById("order-editor-form");
  if (!form || !order) {
    return;
  }

  const fieldMap = {
    orderNo: order.order_no,
    email: order.email,
    paymentStatus: order.payment_status,
    orderStatus: order.order_status,
    shippingCarrier: order.shipping_carrier || "",
    trackingNumber: order.tracking_number || "",
    trackingUrl: order.tracking_url || "",
    paymentReference: order.payment_reference || "",
    adminNote: order.admin_note || ""
  };

  Object.entries(fieldMap).forEach(([key, value]) => {
    const field = form.elements.namedItem(key);
    if (field) {
      field.value = value || "";
    }
  });
}

async function loadAdminDashboard(token) {
  const response = await fetch(`${API_BASE}/api/admin/dashboard`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "后台数据加载失败。");
  }

  const loginPanel = document.getElementById("admin-login-panel");
  const dashboard = document.getElementById("admin-dashboard");
  loginPanel.classList.add("hidden");
  dashboard.classList.remove("hidden");

  const settingsForm = document.getElementById("settings-form");
  Object.entries(data.settings || {}).forEach(([key, value]) => {
    const field = settingsForm.elements.namedItem(key);
    if (field) {
      field.value = value || "";
    }
  });

  renderOrders(data.orders || []);
  populateOrderEditor((data.orders || [])[0]);
}

async function handleAdminPage() {
  const loginForm = document.getElementById("admin-login-form");
  if (!loginForm) {
    return;
  }

  const loginStatus = document.getElementById("admin-login-status");
  const settingsStatus = document.getElementById("settings-status");
  const logoutButton = document.getElementById("admin-logout");
  const settingsForm = document.getElementById("settings-form");
  const orderEditorForm = document.getElementById("order-editor-form");
  const orderEditorStatus = document.getElementById("order-editor-status");
  const markShippedButton = document.getElementById("mark-shipped-button");
  const tokenKey = "coldarc_admin_token";

  const savedToken = window.localStorage.getItem(tokenKey);
  if (savedToken) {
    try {
      await loadAdminDashboard(savedToken);
    } catch (_error) {
      window.localStorage.removeItem(tokenKey);
    }
  }

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    loginStatus.textContent = "正在登录...";
    const formData = new FormData(loginForm);

    try {
      const response = await fetch(`${API_BASE}/api/admin/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          username: formData.get("username"),
          password: formData.get("password")
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "登录失败。");
      }

      window.localStorage.setItem(tokenKey, data.token);
      loginStatus.textContent = "";
      await loadAdminDashboard(data.token);
    } catch (error) {
      loginStatus.textContent = error.message || "登录失败。";
    }
  });

  settingsForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const token = window.localStorage.getItem(tokenKey);
    if (!token) {
      settingsStatus.textContent = "请先重新登录。";
      return;
    }

    settingsStatus.textContent = "正在保存设置...";
    const formData = new FormData(settingsForm);
    const payload = Object.fromEntries(formData.entries());

    try {
      const response = await fetch(`${API_BASE}/api/settings`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "设置保存失败。");
      }

      settingsStatus.textContent = "设置已保存。";
    } catch (error) {
      settingsStatus.textContent = error.message || "设置保存失败。";
    }
  });

  orderEditorForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const token = window.localStorage.getItem(tokenKey);
    if (!token) {
      orderEditorStatus.textContent = "请先重新登录。";
      return;
    }

    const formData = new FormData(orderEditorForm);
    const orderNo = formData.get("orderNo");
    if (!orderNo) {
      orderEditorStatus.textContent = "请先选择要处理的订单。";
      return;
    }

    orderEditorStatus.textContent = "正在保存订单信息...";
    try {
      const response = await fetch(`${API_BASE}/api/admin/orders/${orderNo}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          paymentStatus: formData.get("paymentStatus"),
          orderStatus: formData.get("orderStatus"),
          shippingCarrier: formData.get("shippingCarrier"),
          trackingNumber: formData.get("trackingNumber"),
          trackingUrl: formData.get("trackingUrl"),
          paymentReference: formData.get("paymentReference"),
          adminNote: formData.get("adminNote"),
          sendShippingEmail: false
        })
      });

      if (!response.ok) {
        throw new Error("订单处理信息保存失败。");
      }

      orderEditorStatus.textContent = "订单处理信息已保存。";
      await loadAdminDashboard(token);
      populateOrderEditor(adminOrders.find((order) => order.order_no === orderNo));
    } catch (_error) {
      orderEditorStatus.textContent = "订单处理信息保存失败。";
    }
  });

  markShippedButton.addEventListener("click", async () => {
    const token = window.localStorage.getItem(tokenKey);
    if (!token) {
      orderEditorStatus.textContent = "请先重新登录。";
      return;
    }

    const formData = new FormData(orderEditorForm);
    const orderNo = formData.get("orderNo");
    if (!orderNo) {
      orderEditorStatus.textContent = "请先选择要处理的订单。";
      return;
    }

    orderEditorStatus.textContent = "正在标记发货并发送通知...";
    try {
      const response = await fetch(`${API_BASE}/api/admin/orders/${orderNo}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          paymentStatus: formData.get("paymentStatus"),
          orderStatus: "shipped",
          shippingCarrier: formData.get("shippingCarrier"),
          trackingNumber: formData.get("trackingNumber"),
          trackingUrl: formData.get("trackingUrl"),
          paymentReference: formData.get("paymentReference"),
          adminNote: formData.get("adminNote"),
          sendShippingEmail: true
        })
      });

      if (!response.ok) {
        throw new Error("发货处理失败。");
      }

      orderEditorStatus.textContent = "已标记发货，并尝试发送邮件通知。";
      await loadAdminDashboard(token);
      populateOrderEditor(adminOrders.find((order) => order.order_no === orderNo));
    } catch (_error) {
      orderEditorStatus.textContent = "发货处理失败。";
    }
  });

  document.addEventListener("click", async (event) => {
    const actionButton = event.target.closest("[data-action='select-order']");
    if (!actionButton) {
      return;
    }

    const orderNo = actionButton.getAttribute("data-order-no");
    const order = adminOrders.find((item) => item.order_no === orderNo);
    if (order) {
      populateOrderEditor(order);
    }
  });

  logoutButton.addEventListener("click", () => {
    window.localStorage.removeItem(tokenKey);
    window.location.reload();
  });
}

async function hydrateContacts() {
  const hasContactContainer = document.getElementById("contact-links");
  if (!hasContactContainer && !document.getElementById("site-contact-grid")) {
    return;
  }

  const settings = await fetchSettings();
  populateContactSections(settings);
  renderContactList(document.getElementById("site-contact-grid"), settings);
}

function mountSiteContactPanel(settings) {
  renderContactList(document.getElementById("site-contact-grid"), settings);
}

async function initSite() {
  const settings = await fetchSettings();
  populateContactSections(settings);
  mountSiteContactPanel(settings);
}

initSite();
hydrateContacts();
handleCheckoutForm();
handleSuccessPage();
handleAdminPage();

