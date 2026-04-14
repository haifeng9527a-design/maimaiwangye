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
  cryptoWalletAddress: "",
  cryptoQrCodeUrl: "",
  wechatPaymentText: "",
  wechatQrCodeUrl: "",
  alipayPaymentText: "",
  alipayQrCodeUrl: ""
};

function getApiBase() {
  const { protocol, hostname, port, origin } = window.location;
  if ((hostname === "localhost" || hostname === "127.0.0.1") && port && port !== "3000") {
    return `${protocol}//${hostname}:3000`;
  }
  return origin;
}

const API_BASE = getApiBase();
const SESSION_STORAGE_KEY = "coldarc_session_id";
const VISITOR_STORAGE_KEY = "coldarc_visitor_id";
const CURATED_PRODUCT_IMAGE_LIBRARY = [
  "canpingtupian/WhatsApp Image 2026-04-10 at 18.22.42.jpeg",
  "canpingtupian/WhatsApp Image 2026-04-10 at 18.22.41.jpegqsfa.jpeg",
  "canpingtupian/WhatsApp Image 2026-04-10 at 18.22.41.jpeg",
  "canpingtupian/dasdafd10 at 18.22.43.jpeg",
  "canpingtupian/dasdasd2.42.jpeg",
  "canpingtupian/asdasdt 18.22.42.jpeg",
  "canpingtupian/WhatsApp Image 2026-04-10 at 18.22.43.jpeg",
  "canpingtupian/fasfasfge 2026-04-10 at 18.22.43.jpeg",
  "canpingtupian/asda8.22.41.jpeg",
  "canpingtupian/fasdfdasg-04-10 at 18.22.42.jpeg",
  "canpingtupian/fdasfagd4-10 at 18.22.44.jpeg"
];
// 集中管理默认图片，后续接入整站新素材时可优先替换这里。
const DEFAULT_PRODUCT_IMAGES = CURATED_PRODUCT_IMAGE_LIBRARY.slice(0, 3);
const LEGACY_PRODUCT_IMAGE_MAP = {
  "assets/images/ledger-hero.jpg": DEFAULT_PRODUCT_IMAGES[0],
  "assets/images/ledger-side.jpg": CURATED_PRODUCT_IMAGE_LIBRARY[2],
  "assets/images/ledger-detail.png": CURATED_PRODUCT_IMAGE_LIBRARY[9],
  "assets/images/ledger-red-shot.jpg": CURATED_PRODUCT_IMAGE_LIBRARY[6]
};

function generateId(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

function getSessionId() {
  const existing = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (existing) {
    return existing;
  }

  const value = generateId("sess");
  window.sessionStorage.setItem(SESSION_STORAGE_KEY, value);
  return value;
}

function getVisitorId() {
  const existing = window.localStorage.getItem(VISITOR_STORAGE_KEY);
  if (existing) {
    return existing;
  }

  const value = generateId("visitor");
  window.localStorage.setItem(VISITOR_STORAGE_KEY, value);
  return value;
}

async function trackEvent(eventType, payload = {}) {
  try {
    await fetch(`${API_BASE}/api/analytics/events`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        sessionId: getSessionId(),
        visitorId: getVisitorId(),
        eventType,
        pagePath: window.location.pathname,
        referrer: document.referrer || "",
        ...payload
      })
    });
  } catch (_error) {
    // 埋点失败不影响主流程
  }
}

async function fetchProducts() {
  try {
    const response = await fetch(`${API_BASE}/api/products`);
    if (!response.ok) {
      throw new Error("Failed to load products");
    }

    const data = await response.json();
    return Array.isArray(data.products) ? data.products : [];
  } catch (_error) {
    return [];
  }
}

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getPaymentMethodMeta(settings) {
  return {
    bank_transfer: {
      label: "银行转账",
      description: "提交订单后会保留订单，并显示银行转账说明，由客服人工确认到账。",
      manualText: settings.bankTransferText || "请联系客服获取银行转账收款信息。"
    },
    crypto: {
      label: "加密货币付款",
      description: "提交订单后会保留订单，并显示加密货币付款说明，由客服人工确认到账。",
      manualText: settings.cryptoPaymentText || "请在 10 分钟内按系统生成的唯一 USDT 金额完成付款，到账后系统会自动确认订单。",
      paymentValueLabel: "USDT-TRC20 收款地址",
      paymentValue: settings.cryptoWalletAddress || "",
      paymentQrUrl: settings.cryptoQrCodeUrl || ""
    },
    wechat_pay: {
      label: "微信付款",
      description: "提交订单后会显示微信付款说明，请按后台说明完成支付并联系客服确认。",
      manualText: settings.wechatPaymentText || "请直接使用微信收款码完成支付，付款后联系客服确认。",
      paymentValueLabel: "微信付款说明",
      paymentValue: "",
      paymentQrUrl: settings.wechatQrCodeUrl || ""
    },
    alipay: {
      label: "支付宝付款",
      description: "提交订单后会显示支付宝付款说明，请按后台说明完成支付并联系客服确认。",
      manualText: settings.alipayPaymentText || "请直接使用支付宝收款码完成支付，付款后联系客服确认。",
      paymentValueLabel: "支付宝付款说明",
      paymentValue: "",
      paymentQrUrl: settings.alipayQrCodeUrl || ""
    },
    stripe: {
      label: "Stripe 在线支付（备用）",
      description: "如你已准备好在线支付，也可以继续使用 Stripe 直接完成付款。",
      manualText: ""
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
  return username ? `https://ig.me/m/${username}` : "";
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
      display: String(settings.whatsapp || "").trim(),
      actionText: "点击打开聊天"
    },
    {
      key: "telegram",
      label: "Telegram",
      href: normalizeTelegramHref(settings.telegram),
      display: String(settings.telegram || "").trim(),
      actionText: "点击跳转私信"
    },
    {
      key: "wechat",
      label: "微信",
      href: "",
      display: "",
      actionText: ""
    },
    {
      key: "email",
      label: "邮箱",
      href: normalizeEmailHref(settings.email),
      display: String(settings.email || "").trim(),
      actionText: "点击发送邮件"
    },
    {
      key: "phone",
      label: "手机号",
      href: normalizePhoneHref(settings.phone),
      display: String(settings.phone || "").trim(),
      actionText: "点击直接拨号"
    },
    {
      key: "instagram",
      label: "Instagram",
      href: normalizeInstagramHref(settings.instagram),
      display: String(settings.instagram || "").trim(),
      actionText: "点击发起私信"
    }
  ].filter((item) => item.href && item.display);
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

    return `<a class="contact-link is-ready" href="${item.href}" target="_blank" rel="noreferrer" data-contact-channel="${item.key}">${content}</a>`;
  }).join("");
}

function renderSupportContactOptions(container, contacts) {
  if (!container) {
    return;
  }

  const items = Array.isArray(contacts) ? contacts.filter((item) => item && item.href) : [];
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

  container.innerHTML = items.map((item) => `
    <a class="contact-link is-ready" href="${item.href}" target="_blank" rel="noreferrer" data-contact-channel="${item.type}">
      <span class="contact-icon contact-icon-${item.type}">
        ${getContactIcon(item.type)}
      </span>
      <span class="contact-copy">
        <span class="contact-name">${item.label}</span>
        <span class="contact-value">${item.value || "立即联系"}</span>
        <span class="contact-action">点击打开并自动带入订单信息</span>
      </span>
      <span class="contact-arrow" aria-hidden="true">↗</span>
    </a>
  `).join("");
}

function getFloatingContactItems(settings) {
  return buildContactItems(settings).map((item) => ({
    key: item.key,
    label: item.label,
    href: item.href,
    value: item.display,
    actionText: item.href ? item.actionText : "查看联系方式"
  }));
}

function ensureFloatingSupportWidget() {
  let widget = document.getElementById("floating-support-widget");
  if (widget) {
    return widget;
  }

  widget = document.createElement("div");
  widget.id = "floating-support-widget";
  widget.className = "floating-support-widget hidden";
  widget.innerHTML = `
    <button class="floating-support-toggle" id="floating-support-toggle" type="button" aria-expanded="false" aria-controls="floating-support-panel">
      联系客服
    </button>
    <div class="floating-support-panel hidden" id="floating-support-panel">
      <div class="floating-support-head">
        <p class="card-kicker">Contact support</p>
        <h3>联系客服</h3>
        <p>选择一种方式立即咨询、获取付款方式或确认订单。</p>
      </div>
      <div class="floating-support-list" id="floating-support-list"></div>
    </div>
  `;

  document.body.appendChild(widget);
  return widget;
}

function renderFloatingSupportWidget(settings) {
  if (document.body.dataset.page === "admin") {
    return;
  }

  const items = getFloatingContactItems(settings);
  if (!items.length) {
    return;
  }

  const widget = ensureFloatingSupportWidget();
  const toggle = widget.querySelector("#floating-support-toggle");
  const panel = widget.querySelector("#floating-support-panel");
  const list = widget.querySelector("#floating-support-list");

  widget.classList.remove("hidden");
  list.innerHTML = items.map((item) => {
    const content = `
      <span class="floating-support-icon contact-icon-${item.key}">
        ${getContactIcon(item.key)}
      </span>
      <span class="floating-support-copy">
        <span class="floating-support-name">${item.label}</span>
        <span class="floating-support-value">${item.value}</span>
        <span class="floating-support-action">${item.actionText}</span>
      </span>
      <span class="floating-support-arrow" aria-hidden="true">${item.href ? "↗" : ""}</span>
    `;

    if (!item.href) {
      return `<div class="floating-support-item is-disabled">${content}</div>`;
    }

    return `<a class="floating-support-item" href="${item.href}" target="_blank" rel="noreferrer" data-contact-channel="${item.key}">${content}</a>`;
  }).join("");

  if (!toggle.dataset.bound) {
    toggle.dataset.bound = "true";

    toggle.addEventListener("click", () => {
      const isOpen = !panel.classList.contains("hidden");
      panel.classList.toggle("hidden", isOpen);
      toggle.setAttribute("aria-expanded", String(!isOpen));
      widget.classList.toggle("is-open", !isOpen);
    });

    document.addEventListener("click", (event) => {
      if (!widget.contains(event.target)) {
        panel.classList.add("hidden");
        toggle.setAttribute("aria-expanded", "false");
        widget.classList.remove("is-open");
      }
    });
  }
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

function formatUsdPrice(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(Number(value || 0));
}

function applyImage(node, src, alt) {
  if (!node || !src) {
    return;
  }

  node.src = normalizeProductImagePath(src) || DEFAULT_PRODUCT_IMAGES[0];
  node.onerror = () => {
    node.onerror = null;
    node.src = DEFAULT_PRODUCT_IMAGES[0];
  };
  if (alt) {
    node.alt = alt;
  }
}

function normalizeProductImagePath(src) {
  const value = String(src || "").trim();
  if (!value) {
    return "";
  }

  return LEGACY_PRODUCT_IMAGE_MAP[value] || value;
}

function getProductImagePool(product) {
  const gallery = Array.isArray(product?.galleryImageUrls)
    ? product.galleryImageUrls.map(normalizeProductImagePath).filter(Boolean)
    : [];

  return Array.from(new Set([
    normalizeProductImagePath(product?.primaryImageUrl),
    ...gallery,
    ...CURATED_PRODUCT_IMAGE_LIBRARY
  ].filter(Boolean)));
}

function getProductImageSet(product) {
  const gallery = getProductImagePool(product);
  const primaryImage = gallery[0] || DEFAULT_PRODUCT_IMAGES[0];

  return [
    primaryImage,
    gallery[1] || gallery[0] || DEFAULT_PRODUCT_IMAGES[1] || primaryImage,
    gallery[2] || gallery[1] || DEFAULT_PRODUCT_IMAGES[2] || primaryImage
  ];
}

function renderHomeProduct(product) {
  if (!product || !document.getElementById("home-product-name")) {
    return;
  }

  const imagePool = getProductImagePool(product);
  const primaryImage = imagePool[0];
  const secondaryImage = imagePool[1] || imagePool[4] || imagePool[0];
  const tertiaryImage = imagePool[2] || imagePool[5] || secondaryImage;

  const nameNode = document.getElementById("home-product-name");
  const subtitleNode = document.getElementById("home-product-subtitle");

  nameNode.innerHTML = "Ledger.<br>把重要资产留在自己手里";
  subtitleNode.textContent = "授权现货、设备实拍、包装细节和第一次上手最重要的信息，都用更清楚的方式放在一个页面里。";

  applyImage(document.getElementById("home-product-primary-image"), primaryImage, "Ledger 品牌主图");
  applyImage(document.getElementById("home-product-secondary-image"), secondaryImage, "Ledger 品牌细节图");
  applyImage(document.getElementById("home-product-tertiary-image"), tertiaryImage, "Ledger 品牌辅助图");

  const galleryNode = document.getElementById("home-product-gallery");
  if (galleryNode) {
    const lookbookImages = imagePool.slice(0, 4);
    const primaryLook = lookbookImages[0] || DEFAULT_PRODUCT_IMAGES[0];
    const secondLook = lookbookImages[1] || primaryLook;
    const thirdLook = lookbookImages[2] || secondLook;
    const fourthLook = lookbookImages[3] || secondLook;
    galleryNode.innerHTML = `
      <figure class="lookbook-card lookbook-card-feature reveal">
        <img src="${primaryLook}" alt="${product.name} 主视觉图片">
      </figure>
      <figure class="lookbook-card reveal">
        <img src="${secondLook}" alt="${product.name} 展示图片 2">
      </figure>
      <figure class="lookbook-card reveal">
        <img src="${thirdLook}" alt="${product.name} 展示图片 3">
      </figure>
      <figure class="lookbook-card lookbook-card-wide reveal">
        <img src="${fourthLook}" alt="${product.name} 展示图片 4">
      </figure>
    `;
  }
}

function renderHomeProductGrid(products = []) {
  const container = document.getElementById("home-product-grid");
  if (!container) {
    return;
  }

  container.innerHTML = products.map((product, index) => {
    const productPool = getProductImagePool(product);
    const imageUrl = productPool[index + 3] || CURATED_PRODUCT_IMAGE_LIBRARY[(index * 3 + 1) % CURATED_PRODUCT_IMAGE_LIBRARY.length] || productPool[0];
    const bullets = [product.summary, product.subtitle, product.description]
      .map((item) => String(item || "").trim())
      .filter(Boolean)
      .slice(0, 3);

    return `
      <article class="product-card ${index === 0 ? "featured" : ""} reveal">
        <img class="card-thumb" src="${imageUrl}" alt="${product.name} 展示图" onerror="this.onerror=null;this.src='${DEFAULT_PRODUCT_IMAGES[0]}'">
        <p class="product-tag">${index === 0 ? "热门型号" : "在售型号"}</p>
        <h3>${product.name}</h3>
        <p>${product.summary || product.subtitle || "支持现货下单与发货说明。"}</p>
        <div class="price-row">
          <strong>${formatUsdPrice(product.priceUsd)}</strong>
          <span>${product.comparePriceUsd ? `原价 ${formatUsdPrice(product.comparePriceUsd)}` : "现货速发"}</span>
        </div>
        <ul class="bullet-list">
          ${(bullets.length ? bullets : ["支持现货下单与发货说明"]).map((item) => `<li>${item}</li>`).join("")}
        </ul>
        <div class="purchase-actions">
          <a class="button button-secondary" href="/checkout?product=${encodeURIComponent(product.slug)}">下单选择此型号</a>
        </div>
      </article>
    `;
  }).join("");
}

function renderProductModelGrid(products = []) {
  const container = document.getElementById("product-model-grid");
  if (!container) {
    return;
  }

  container.innerHTML = products.map((product, index) => {
    const productPool = getProductImagePool(product);
    const imageUrl = productPool[index + 4] || CURATED_PRODUCT_IMAGE_LIBRARY[(index * 3 + 2) % CURATED_PRODUCT_IMAGE_LIBRARY.length] || productPool[0];
    return `
      <article class="product-card ${index === 0 ? "featured" : ""} reveal">
        <img class="card-thumb" src="${imageUrl}" alt="${product.name} 型号图" onerror="this.onerror=null;this.src='${DEFAULT_PRODUCT_IMAGES[0]}'">
        <p class="product-tag">${index === 0 ? "热门型号" : "在售型号"}</p>
        <h3>${product.name}</h3>
        <p>${product.summary || product.subtitle || "支持现货下单与发货说明。"}</p>
        <div class="price-row">
          <strong>${formatUsdPrice(product.priceUsd)}</strong>
          <span>${product.comparePriceUsd ? `原价 ${formatUsdPrice(product.comparePriceUsd)}` : "下单页选择型号"}</span>
        </div>
        <div class="purchase-actions">
          <a class="button button-secondary" href="/checkout?product=${encodeURIComponent(product.slug)}">选择这个型号</a>
        </div>
      </article>
    `;
  }).join("");
}

function renderProductPage(product, products = []) {
  if (!product || !document.getElementById("product-page-name")) {
    return;
  }

  const imagePool = getProductImagePool(product);
  const [primaryImage, cleanImage, angleImage, detailImage] = imagePool;

  document.getElementById("product-page-name").textContent = "Ledger 授权经销与设备实拍说明";
  document.getElementById("product-page-side-name").textContent = "Ledger 授权经销";
  document.getElementById("product-page-subtitle").textContent = "从品牌信任、包装交付到在售型号选择，把购买前最重要的信息集中在一个页面里。";
  document.getElementById("product-page-summary").textContent = `当前支持 ${products.length || 1} 个在售型号，可在下单页按预算和需求选择。`;
  document.getElementById("product-page-detail-name").textContent = "品牌与交付说明";
  document.getElementById("product-page-description").textContent = "这里重点展示 Ledger 品牌、包装交付和购买逻辑；具体型号、价格与版本差异，请以下方在售型号列表与下单页为准。";
  document.getElementById("product-page-price").textContent = `${products.length || 1} 个型号可选`;

  applyImage(document.getElementById("product-page-primary-image"), primaryImage, "Ledger 品牌主展示图");
  applyImage(document.getElementById("product-page-gallery-image-1"), cleanImage, "Ledger 型号正面图");
  applyImage(document.getElementById("product-page-gallery-image-2"), angleImage, "Ledger 型号角度图");
  applyImage(document.getElementById("product-page-gallery-image-3"), detailImage, "Ledger 型号细节图");

  const mediaWall = document.getElementById("product-media-wall");
  if (mediaWall) {
    const wallClasses = [
      "wall-card-hero",
      "wall-card-tall",
      "wall-card-wide",
      "wall-card-square",
      "wall-card-wide",
      "wall-card-large",
      "wall-card-square",
      "wall-card-wide",
      "wall-card-square"
    ];
    mediaWall.innerHTML = imagePool.slice(0, 8).map((src, index) => `
      <figure class="media-wall-card ${wallClasses[index] || "wall-card-square"} reveal">
        <img src="${src}" alt="${product.name} 图集 ${index + 1}">
      </figure>
    `).join("");
  }
}

async function hydrateProductContent() {
  if (document.body.dataset.page === "admin") {
    return;
  }

  const products = await fetchProducts();
  const product = products[0];
  if (!product) {
    return;
  }

  renderHomeProduct(product);
  renderHomeProductGrid(products);
  renderProductModelGrid(products);
  renderProductPage(product, products);
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
    stripe: "在线支付",
    crypto: "加密货币",
    bank_transfer: "银行转账",
    wechat_pay: "微信付款",
    alipay: "支付宝"
  }[method] || method;
}

function formatOrderStatusLabel(status) {
  return {
    pending: "待处理",
    confirmed: "已确认",
    processing: "处理中",
    shipped: "已发货",
    completed: "已完成",
    cancelled: "已取消"
  }[status] || status;
}

function formatPaymentStatusLabel(status) {
  return {
    pending: "待付款",
    paid: "已付款",
    manual_review: "人工确认中",
    cancelled: "已取消"
  }[status] || status;
}

function formatContactChannelLabel(channel) {
  return {
    whatsapp: "WhatsApp",
    telegram: "Telegram",
    email: "邮箱",
    phone: "电话",
    instagram: "Instagram",
    wechat: "微信",
    bank_transfer: "银行转账",
    crypto: "加密货币",
    wechat_pay: "微信付款",
    alipay: "支付宝"
  }[channel] || channel || "-";
}

function formatTrafficSourceLabel(source) {
  if (!source || source === "direct") {
    return "直接访问";
  }

  return source;
}

async function handleCheckoutForm() {
  const form = document.getElementById("checkout-form");
  if (!form) {
    return;
  }

  const settings = await fetchSettings();
  const products = await fetchProducts();
  const statusNode = document.getElementById("checkout-status");
  const amountNode = document.getElementById("checkout-amount-label");
  const paymentLabelNode = document.getElementById("checkout-payment-label");
  const paymentDescriptionNode = document.getElementById("checkout-payment-description");
  const manualPaymentCard = document.getElementById("manual-payment-card");
  const manualPaymentText = document.getElementById("manual-payment-text");
  const manualPaymentDetails = document.getElementById("manual-payment-details");
  const manualPaymentMeta = document.getElementById("manual-payment-meta");
  const manualPaymentMetaLabel = document.getElementById("manual-payment-meta-label");
  const manualPaymentMetaValue = document.getElementById("manual-payment-meta-value");
  const manualPaymentQr = document.getElementById("manual-payment-qr");
  const manualPaymentQrImage = document.getElementById("manual-payment-qr-image");
  const manualPaymentCopyButton = document.getElementById("manual-payment-copy-button");
  const supportContactActions = document.getElementById("support-contact-actions");
  const supportContactOptions = document.getElementById("support-contact-options");
  const cryptoVerificationCard = document.getElementById("crypto-verification-card");
  const cryptoVerifyButton = document.getElementById("crypto-verify-button");
  const cryptoVerifyStatus = document.getElementById("crypto-verify-status");
  const cryptoVerificationDescription = document.getElementById("crypto-verification-description");
  const quantityInput = form.elements.namedItem("quantity");
  const productInput = form.elements.namedItem("productName");
  const paymentMethodInput = form.elements.namedItem("paymentMethod");
  let currentOrderNo = "";
  let currentPaymentMethod = String(paymentMethodInput.value || "");
  let currentCryptoExpectedAmount = "";
  let currentCryptoPaymentExpiresAt = "";

  const fallbackProducts = [
    {
      slug: "ledger-nano-x",
      name: "Ledger Nano X",
      priceUsd: 199
    }
  ];
  const activeProducts = products.length ? products : fallbackProducts;

  if (productInput) {
    productInput.innerHTML = activeProducts.map((product) => `
      <option value="${product.name}" data-product-slug="${product.slug}" data-price-usd="${product.priceUsd}">
        ${product.name}
      </option>
    `).join("");

    const query = parseQuery();
    const requestedProduct = query.get("product");
    if (requestedProduct) {
      const targetOption = Array.from(productInput.options).find((option) => option.dataset.productSlug === requestedProduct);
      if (targetOption) {
        productInput.value = targetOption.value;
      }
    }
  }

  const paymentMeta = getPaymentMethodMeta(settings);

  const renderManualPaymentDetails = (meta) => {
    const paymentValue = String(meta?.paymentValue || "").trim();
    const paymentQrUrl = String(meta?.paymentQrUrl || "").trim();

    if (!manualPaymentDetails || !manualPaymentMeta || !manualPaymentMetaLabel || !manualPaymentMetaValue || !manualPaymentQr || !manualPaymentQrImage || !manualPaymentCopyButton) {
      return;
    }

    if (!paymentValue && !paymentQrUrl) {
      manualPaymentDetails.classList.add("hidden");
      manualPaymentMeta.classList.add("hidden");
      manualPaymentQr.classList.add("hidden");
      manualPaymentCopyButton.classList.add("hidden");
      manualPaymentCopyButton.dataset.copyValue = "";
      manualPaymentQrImage.removeAttribute("src");
      return;
    }

    manualPaymentDetails.classList.remove("hidden");

    if (paymentValue) {
      manualPaymentMeta.classList.remove("hidden");
      manualPaymentMetaLabel.textContent = meta.paymentValueLabel || "收款信息";
      manualPaymentMetaValue.textContent = paymentValue;
      manualPaymentCopyButton.classList.remove("hidden");
      manualPaymentCopyButton.dataset.copyValue = paymentValue;
    } else {
      manualPaymentMeta.classList.add("hidden");
      manualPaymentCopyButton.classList.add("hidden");
      manualPaymentCopyButton.dataset.copyValue = "";
    }

    if (paymentQrUrl) {
      manualPaymentQr.classList.remove("hidden");
      manualPaymentQrImage.src = paymentQrUrl;
      manualPaymentQrImage.alt = `${meta.label}收款码`;
    } else {
      manualPaymentQr.classList.add("hidden");
      manualPaymentQrImage.removeAttribute("src");
    }
  };

  const updatePaymentUi = () => {
    const method = paymentMethodInput.value;
    currentPaymentMethod = method;
    const meta = paymentMeta[method] || paymentMeta.bank_transfer;
    paymentLabelNode.textContent = meta.label;
    paymentDescriptionNode.textContent = meta.description;

    if (method === "stripe") {
      manualPaymentCard.classList.add("hidden");
      if (manualPaymentDetails) {
        manualPaymentDetails.classList.add("hidden");
      }
      if (cryptoVerificationCard) {
        cryptoVerificationCard.classList.add("hidden");
      }
      return;
    }

    manualPaymentCard.classList.remove("hidden");
    manualPaymentText.textContent = meta.manualText;
    renderManualPaymentDetails(meta);

    if (cryptoVerificationCard) {
      const showCryptoVerify = method === "crypto" && currentOrderNo;
      cryptoVerificationCard.classList.toggle("hidden", !showCryptoVerify);
      if (!showCryptoVerify && cryptoVerifyStatus) {
        cryptoVerifyStatus.textContent = "";
      }
    }
  };

  const updateAmountLabel = () => {
    const selectedOption = productInput.selectedOptions?.[0];
    const priceUsd = Number(selectedOption?.dataset.priceUsd || activeProducts[0]?.priceUsd || 199);
    const price = Math.round(priceUsd * 100);
    const quantity = Math.max(Number(quantityInput.value || 1), 1);
    amountNode.textContent = formatCurrency(price * quantity);
  };

  updateAmountLabel();
  updatePaymentUi();
  quantityInput.addEventListener("input", updateAmountLabel);
  productInput.addEventListener("change", updateAmountLabel);
  paymentMethodInput.addEventListener("change", updatePaymentUi);

  if (manualPaymentCopyButton) {
    manualPaymentCopyButton.addEventListener("click", async () => {
      const copyValue = manualPaymentCopyButton.dataset.copyValue || "";
      if (!copyValue) {
        return;
      }

      try {
        await navigator.clipboard.writeText(copyValue);
        statusNode.textContent = "收款地址已复制，请完成付款后联系客服确认。";
      } catch (_error) {
        statusNode.textContent = "复制失败，请手动复制当前收款地址。";
      }
    });
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    statusNode.textContent = "正在创建订单，请稍候...";

    const formData = new FormData(form);
    const productName = formData.get("productName");
    const selectedOption = productInput.selectedOptions?.[0];
    const productSlug = selectedOption?.dataset.productSlug || slugify(productName);
    const quantity = Math.max(Number(formData.get("quantity") || 1), 1);
    const unitPriceUsd = Number(selectedOption?.dataset.priceUsd || activeProducts[0]?.priceUsd || 199);
    const amountCents = Math.round(unitPriceUsd * 100) * quantity;

    const payload = {
      productName,
      productSlug,
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

      currentOrderNo = data.orderNo || "";
      currentCryptoExpectedAmount = data.cryptoExpectedAmount ? String(data.cryptoExpectedAmount) : "";
      currentCryptoPaymentExpiresAt = data.cryptoPaymentExpiresAt || "";

      if (data.manualPaymentInstructions) {
        manualPaymentCard.classList.remove("hidden");
        manualPaymentText.textContent = data.manualPaymentInstructions;
        const paymentDetailsMeta = { ...(paymentMeta[payload.paymentMethod] || paymentMeta.bank_transfer) };
        if (payload.paymentMethod === "crypto" && currentCryptoExpectedAmount) {
          paymentDetailsMeta.paymentValueLabel = "应付唯一金额";
          paymentDetailsMeta.paymentValue = `${Number(currentCryptoExpectedAmount).toFixed(3)} USDT`;
        }
        renderManualPaymentDetails(paymentDetailsMeta);
      }

      if (supportContactActions && supportContactOptions && Array.isArray(data.supportContacts)) {
        renderSupportContactOptions(supportContactOptions, data.supportContacts);
        if (data.supportContacts.length) {
          supportContactActions.classList.remove("hidden");
        }
      }

      statusNode.textContent = data.message
        ? `${data.message} 订单号：${data.orderNo}`
        : `订单已创建。订单号：${data.orderNo}`;

      await trackEvent("order_created", {
        orderNo: data.orderNo,
        channel: payload.paymentMethod,
        customerName: payload.customerName,
        email: payload.email,
        phone: payload.phone,
        metadata: {
          productName: payload.productName,
          quantity: payload.quantity
        }
      });

      if (cryptoVerificationCard) {
        const showCryptoVerify = payload.paymentMethod === "crypto" && currentOrderNo;
        cryptoVerificationCard.classList.toggle("hidden", !showCryptoVerify);
        if (showCryptoVerify && cryptoVerificationDescription && currentCryptoExpectedAmount) {
          const expiryText = currentCryptoPaymentExpiresAt
            ? new Date(currentCryptoPaymentExpiresAt).toLocaleString("zh-CN")
            : "10 分钟内";
          cryptoVerificationDescription.textContent = `请在 ${expiryText} 前支付 ${Number(currentCryptoExpectedAmount).toFixed(3)} USDT。系统会自动匹配到账金额并确认订单。`;
        }
      }
    } catch (error) {
      statusNode.textContent = error.message || "订单提交失败，请稍后重试。";
    }
  });

  if (cryptoVerifyButton && cryptoVerifyStatus) {
    cryptoVerifyButton.addEventListener("click", async () => {
      if (!currentOrderNo) {
        cryptoVerifyStatus.textContent = "请先提交订单，再检查到账状态。";
        return;
      }

      if (currentPaymentMethod !== "crypto") {
        cryptoVerifyStatus.textContent = "当前订单不是加密货币付款订单。";
        return;
      }

      cryptoVerifyStatus.textContent = "正在检查链上到账记录，请稍候...";
      try {
        const response = await fetch(`${API_BASE}/api/orders/${encodeURIComponent(currentOrderNo)}/verify-crypto`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          }
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "自动核单失败。");
        }

        cryptoVerifyStatus.textContent = data.message || "付款已确认，商家正在准备发货。";
        statusNode.textContent = `${data.message || "付款已确认。"} 订单号：${currentOrderNo}`;
      } catch (error) {
        cryptoVerifyStatus.textContent = error.message || "暂未匹配到到账记录，请稍后重试。";
      }
    });
  }
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
let adminProducts = [];

function setAdminTab(tabId) {
  document.querySelectorAll(".admin-tab").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.adminTab === tabId);
  });
  document.querySelectorAll(".admin-panel").forEach((panel) => {
    panel.classList.toggle("is-active", panel.dataset.adminPanel === tabId);
  });
}

function renderSummary(summary = {}) {
  const mapping = {
    "metric-visits-today": summary.visitsToday || 0,
    "metric-unique-visitors": summary.uniqueVisitorsToday || 0,
    "metric-recent-orders": summary.recentOrderCount || 0,
    "metric-pending-payment": summary.pendingPaymentCount || 0,
    "metric-pending-shipment": summary.pendingShipmentCount || 0,
    "metric-shipped": summary.shippedCount || 0
  };

  Object.entries(mapping).forEach(([id, value]) => {
    const node = document.getElementById(id);
    if (node) {
      node.textContent = String(value);
    }
  });

  const topPagesList = document.getElementById("top-pages-list");
  if (topPagesList) {
    const items = summary.topPages || [];
    topPagesList.innerHTML = items.map((item) => `
      <div class="admin-list-row">
        <span>${item.pagePath}</span>
        <strong>${item.count}</strong>
      </div>
    `).join("") || "<p class='muted-copy'>暂无访问数据</p>";
  }

  const topSourcesList = document.getElementById("top-sources-list");
  if (topSourcesList) {
    const items = summary.topSources || [];
    topSourcesList.innerHTML = items.map((item) => `
      <div class="admin-list-row">
        <span>${formatTrafficSourceLabel(item.source)}</span>
        <strong>${item.count}</strong>
      </div>
    `).join("") || "<p class='muted-copy'>暂无来源数据</p>";
  }
}

function getFilteredOrders() {
  const paymentFilter = document.getElementById("order-payment-filter")?.value || "";
  const statusFilter = document.getElementById("order-status-filter")?.value || "";
  return adminOrders.filter((order) => {
    const paymentMatch = !paymentFilter || order.payment_status === paymentFilter;
    const statusMatch = !statusFilter || order.order_status === statusFilter;
    return paymentMatch && statusMatch;
  });
}

function renderOrders(orders) {
  adminOrders = orders;
  const tbody = document.getElementById("orders-table-body");
  if (!tbody) {
    return;
  }

  const filteredOrders = getFilteredOrders();
  tbody.innerHTML = filteredOrders.map((order) => `
    <tr>
      <td>${order.order_no}</td>
      <td><strong>${order.customer_name}</strong><div>${order.email}</div><div>${order.phone}</div></td>
      <td>${order.product_name} x ${order.quantity}</td>
      <td>${formatPaymentMethodLabel(order.payment_method)}</td>
      <td><span class="status-pill">${formatPaymentStatusLabel(order.payment_status)}</span></td>
      <td><span class="status-pill">${formatOrderStatusLabel(order.order_status)}</span></td>
      <td><button class="button button-ghost small-button" type="button" data-action="select-order" data-order-no="${order.order_no}">处理</button></td>
    </tr>
  `).join("") || "<tr><td colspan='7'>暂无订单</td></tr>";
}

function renderContactEvents(events = []) {
  const tbody = document.getElementById("contact-events-table-body");
  if (!tbody) {
    return;
  }

  tbody.innerHTML = events.map((event) => `
    <tr>
      <td>${new Date(event.created_at).toLocaleString("zh-CN")}</td>
      <td>${formatContactChannelLabel(event.channel)}</td>
      <td>${event.page_path || "-"}</td>
      <td>${event.order_no || "-"}</td>
      <td>
        <strong>${event.customer_name || "匿名访客"}</strong>
        <div>${event.email || "-"}</div>
        <div>${event.phone || "-"}</div>
      </td>
    </tr>
  `).join("") || "<tr><td colspan='5'>暂无线索</td></tr>";
}

function renderProducts(products = []) {
  adminProducts = products;
  const tbody = document.getElementById("products-table-body");
  if (!tbody) {
    return;
  }

  tbody.innerHTML = products.map((product) => `
    <tr>
      <td>${product.name}</td>
      <td>${product.slug}</td>
      <td>${formatUsdPrice(product.priceUsd)}</td>
      <td><span class="status-pill">${product.isActive ? "已上架" : "已下架"}</span></td>
      <td>
        <button class="button button-ghost small-button" type="button" data-action="select-product" data-product-id="${product.id}">编辑</button>
        <button class="button button-ghost small-button" type="button" data-action="delete-product" data-product-id="${product.id}">删除</button>
      </td>
    </tr>
  `).join("") || "<tr><td colspan='5'>暂无商品</td></tr>";
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
    paymentReference: order.crypto_txid || order.payment_reference || "",
    adminNote: order.admin_note || ""
  };

  Object.entries(fieldMap).forEach(([key, value]) => {
    const field = form.elements.namedItem(key);
    if (field) {
      field.value = value || "";
    }
  });
}

function populateProductForm(product) {
  const form = document.getElementById("product-form");
  if (!form) {
    return;
  }

  const payload = product || {
    id: "",
    name: "",
    slug: "",
    subtitle: "",
    summary: "",
    priceUsd: 199,
    comparePriceUsd: "",
    sortOrder: 1,
    isActive: true,
    primaryImageUrl: "",
    description: "",
    galleryImageUrls: []
  };

  Object.entries(payload).forEach(([key, value]) => {
    const field = form.elements.namedItem(key);
    if (field) {
      field.value = Array.isArray(value) ? value.join("\n") : (value ?? "");
    }
  });
}

async function fetchAdminDashboardData(token) {
  const response = await fetch(`${API_BASE}/api/admin/dashboard`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "后台数据加载失败。");
  }

  return data;
}

async function loadAdminDashboard(token) {
  const data = await fetchAdminDashboardData(token);
  document.getElementById("admin-login-panel")?.classList.add("hidden");
  document.getElementById("admin-dashboard")?.classList.remove("hidden");

  const settingsForm = document.getElementById("settings-form");
  Object.entries(data.settings || {}).forEach(([key, value]) => {
    const field = settingsForm?.elements.namedItem(key);
    if (field) {
      field.value = value || "";
    }
  });

  renderSummary(data.summary || {});
  renderOrders(data.orders || []);
  renderContactEvents(data.contactEvents || []);
  renderProducts(data.products || []);
  populateOrderEditor((data.orders || [])[0]);
  populateProductForm((data.products || [])[0]);
  setAdminTab("dashboard");
}

async function updateOrder(token, orderNo, payload) {
  const response = await fetch(`${API_BASE}/api/admin/orders/${orderNo}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || "订单更新失败。");
  }
}

async function uploadAdminProductImage(token, file) {
  if (!token) {
    throw new Error("请先重新登录。");
  }

  if (!file) {
    throw new Error("请先选择图片。");
  }

  const formData = new FormData();
  formData.append("image", file);

  const response = await fetch(`${API_BASE}/api/admin/upload-image`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: formData
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "图片上传失败。");
  }

  return data.url || "";
}

async function handleAdminPage() {
  const loginForm = document.getElementById("admin-login-form");
  if (!loginForm) {
    return;
  }

  const tokenKey = "coldarc_admin_token";
  const loginStatus = document.getElementById("admin-login-status");
  const settingsStatus = document.getElementById("settings-status");
  const orderEditorStatus = document.getElementById("order-editor-status");
  const productStatus = document.getElementById("product-status");
  const settingsForm = document.getElementById("settings-form");
  const orderEditorForm = document.getElementById("order-editor-form");
  const productForm = document.getElementById("product-form");
  const markShippedButton = document.getElementById("mark-shipped-button");
  const logoutButton = document.getElementById("admin-logout");
  const productResetButton = document.getElementById("product-reset-button");
  const productDeleteButton = document.getElementById("product-delete-button");
  const uploadPrimaryImageButton = document.getElementById("upload-primary-image-button");
  const uploadGalleryImagesButton = document.getElementById("upload-gallery-images-button");
  const primaryImageFileInput = document.getElementById("product-primary-image-file");
  const galleryImageFilesInput = document.getElementById("product-gallery-image-files");

  const refresh = async () => {
    const token = window.localStorage.getItem(tokenKey);
    if (!token) {
      throw new Error("请先重新登录。");
    }
    await loadAdminDashboard(token);
    return token;
  };

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
        headers: { "Content-Type": "application/json" },
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

  document.getElementById("admin-tabs")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-admin-tab]");
    if (!button) {
      return;
    }
    setAdminTab(button.dataset.adminTab);
  });

  document.getElementById("order-payment-filter")?.addEventListener("change", () => renderOrders(adminOrders));
  document.getElementById("order-status-filter")?.addEventListener("change", () => renderOrders(adminOrders));

  settingsForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    settingsStatus.textContent = "正在保存设置...";
    try {
      const payload = Object.fromEntries(new FormData(settingsForm).entries());
      const token = window.localStorage.getItem(tokenKey);
      if (!token) {
        throw new Error("请先重新登录。");
      }
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
      await loadAdminDashboard(token);
      setAdminTab("settings");
    } catch (error) {
      settingsStatus.textContent = error.message || "设置保存失败。";
    }
  });

  orderEditorForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(orderEditorForm);
    const orderNo = formData.get("orderNo");
    if (!orderNo) {
      orderEditorStatus.textContent = "请先选择要处理的订单。";
      return;
    }

    orderEditorStatus.textContent = "正在保存订单信息...";
    try {
      const token = window.localStorage.getItem(tokenKey);
      await updateOrder(token, orderNo, {
        paymentStatus: formData.get("paymentStatus"),
        orderStatus: formData.get("orderStatus"),
        shippingCarrier: formData.get("shippingCarrier"),
        trackingNumber: formData.get("trackingNumber"),
        trackingUrl: formData.get("trackingUrl"),
        paymentReference: formData.get("paymentReference"),
        adminNote: formData.get("adminNote"),
        sendShippingEmail: false
      });
      orderEditorStatus.textContent = "订单处理信息已保存。";
      await loadAdminDashboard(token);
      setAdminTab("orders");
      populateOrderEditor(adminOrders.find((order) => order.order_no === orderNo));
    } catch (error) {
      orderEditorStatus.textContent = error.message || "订单处理信息保存失败。";
    }
  });

  markShippedButton?.addEventListener("click", async () => {
    const formData = new FormData(orderEditorForm);
    const orderNo = formData.get("orderNo");
    if (!orderNo) {
      orderEditorStatus.textContent = "请先选择要处理的订单。";
      return;
    }

    orderEditorStatus.textContent = "正在标记发货并发送通知...";
    try {
      const token = window.localStorage.getItem(tokenKey);
      await updateOrder(token, orderNo, {
        paymentStatus: formData.get("paymentStatus"),
        orderStatus: "shipped",
        shippingCarrier: formData.get("shippingCarrier"),
        trackingNumber: formData.get("trackingNumber"),
        trackingUrl: formData.get("trackingUrl"),
        paymentReference: formData.get("paymentReference"),
        adminNote: formData.get("adminNote"),
        sendShippingEmail: true
      });
      orderEditorStatus.textContent = "已标记发货，并尝试发送邮件通知。";
      await loadAdminDashboard(token);
      setAdminTab("orders");
      populateOrderEditor(adminOrders.find((order) => order.order_no === orderNo));
    } catch (error) {
      orderEditorStatus.textContent = error.message || "发货处理失败。";
    }
  });

  productForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    productStatus.textContent = "正在保存商品...";
    try {
      const token = window.localStorage.getItem(tokenKey);
      const formData = new FormData(productForm);
      const id = formData.get("id");
      const payload = {
        name: formData.get("name"),
        slug: formData.get("slug"),
        subtitle: formData.get("subtitle"),
        summary: formData.get("summary"),
        priceUsd: Number(formData.get("priceUsd") || 0),
        comparePriceUsd: formData.get("comparePriceUsd") || "",
        sortOrder: Number(formData.get("sortOrder") || 0),
        isActive: formData.get("isActive") === "true",
        primaryImageUrl: formData.get("primaryImageUrl"),
        description: formData.get("description"),
        galleryImageUrls: String(formData.get("galleryImageUrls") || "").split("\n").map((item) => item.trim()).filter(Boolean)
      };

      const response = await fetch(`${API_BASE}/api/admin/products${id ? `/${id}` : ""}`, {
        method: id ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "商品保存失败。");
      }
      productStatus.textContent = "商品已保存。";
      await loadAdminDashboard(token);
      setAdminTab("products");
      populateProductForm(data.product);
    } catch (error) {
      productStatus.textContent = error.message || "商品保存失败。";
    }
  });

  productResetButton?.addEventListener("click", () => {
    populateProductForm(null);
    productStatus.textContent = "已切换到新建商品。";
  });

  uploadPrimaryImageButton?.addEventListener("click", async () => {
    productStatus.textContent = "正在上传主图...";
    try {
      const token = window.localStorage.getItem(tokenKey);
      const file = primaryImageFileInput?.files?.[0];
      const url = await uploadAdminProductImage(token, file);
      const primaryImageField = productForm?.elements.namedItem("primaryImageUrl");
      if (primaryImageField) {
        primaryImageField.value = url;
      }
      if (primaryImageFileInput) {
        primaryImageFileInput.value = "";
      }
      productStatus.textContent = `主图已上传，URL 已填入：${url}`;
    } catch (error) {
      productStatus.textContent = error.message || "主图上传失败。";
    }
  });

  uploadGalleryImagesButton?.addEventListener("click", async () => {
    productStatus.textContent = "正在上传图集图片...";
    try {
      const token = window.localStorage.getItem(tokenKey);
      const files = Array.from(galleryImageFilesInput?.files || []);
      if (!files.length) {
        throw new Error("请先选择至少一张图集图片。");
      }

      const urls = [];
      for (const file of files) {
        urls.push(await uploadAdminProductImage(token, file));
      }

      const galleryField = productForm?.elements.namedItem("galleryImageUrls");
      if (galleryField) {
        const existing = String(galleryField.value || "")
          .split("\n")
          .map((item) => item.trim())
          .filter(Boolean);
        galleryField.value = [...existing, ...urls].join("\n");
      }

      if (galleryImageFilesInput) {
        galleryImageFilesInput.value = "";
      }
      productStatus.textContent = `已上传 ${urls.length} 张图，URL 已自动追加到图集列表。`;
    } catch (error) {
      productStatus.textContent = error.message || "图集上传失败。";
    }
  });

  productDeleteButton?.addEventListener("click", async () => {
    const formData = new FormData(productForm);
    const id = formData.get("id");
    if (!id) {
      productStatus.textContent = "请先选择要删除的商品。";
      return;
    }

    const confirmed = window.confirm("确定要删除这个商品吗？删除后将无法恢复。");
    if (!confirmed) {
      return;
    }

    productStatus.textContent = "正在删除商品...";
    try {
      const token = window.localStorage.getItem(tokenKey);
      const response = await fetch(`${API_BASE}/api/admin/products/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "删除商品失败。");
      }
      productStatus.textContent = "商品已删除。";
      await loadAdminDashboard(token);
      setAdminTab("products");
      populateProductForm((adminProducts || [])[0] || null);
    } catch (error) {
      productStatus.textContent = error.message || "删除商品失败。";
    }
  });

  document.addEventListener("click", (event) => {
    const orderButton = event.target.closest("[data-action='select-order']");
    if (orderButton) {
      const order = adminOrders.find((item) => item.order_no === orderButton.dataset.orderNo);
      if (order) {
        populateOrderEditor(order);
        setAdminTab("orders");
      }
      return;
    }

    const productButton = event.target.closest("[data-action='select-product']");
    if (productButton) {
      const product = adminProducts.find((item) => String(item.id) === productButton.dataset.productId);
      if (product) {
        populateProductForm(product);
        setAdminTab("products");
      }
      return;
    }

    const deleteButton = event.target.closest("[data-action='delete-product']");
    if (deleteButton) {
      const product = adminProducts.find((item) => String(item.id) === deleteButton.dataset.productId);
      if (product) {
        populateProductForm(product);
        setAdminTab("products");
        productDeleteButton?.click();
      }
    }
  });

  logoutButton?.addEventListener("click", () => {
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
  renderFloatingSupportWidget(settings);
  await hydrateProductContent();
  await trackEvent("page_view");
}

initSite();
hydrateContacts();
handleCheckoutForm();
handleSuccessPage();
handleAdminPage();

document.addEventListener("click", (event) => {
  const contactLink = event.target.closest("[data-contact-channel]");
  if (!contactLink) {
    return;
  }

  const channel = contactLink.getAttribute("data-contact-channel");
  trackEvent("contact_click", { channel });
});

