const { createClient } = require("@supabase/supabase-js");
const { requireEnv } = require("./utils");

const defaultSettingsRow = {
  id: 1,
  site_name: "COLDARC",
  support_text: "支持咨询、下单、发货与基础售后说明。",
  checkout_notice: "下单前请确认产品型号、联系方式与收货地址。",
  whatsapp: "",
  telegram: "",
  wechat: "",
  email: "",
  phone: "",
  instagram: "",
  stripe_publishable_key: "",
  stripe_price_id: "",
  bank_transfer_text: "",
  crypto_payment_text: "",
  crypto_wallet_address: "",
  crypto_qr_code_url: "",
  wechat_payment_text: "",
  wechat_qr_code_url: "",
  alipay_payment_text: "",
  alipay_qr_code_url: ""
};

const defaultProductImages = {
  primary: "canpingtupian/WhatsApp Image 2026-04-10 at 18.22.42.jpeg",
  gallery: [
    "canpingtupian/WhatsApp Image 2026-04-10 at 18.22.42.jpeg",
    "canpingtupian/WhatsApp Image 2026-04-10 at 18.22.41.jpeg",
    "canpingtupian/fasdfdasg-04-10 at 18.22.42.jpeg"
  ]
};

const defaultProduct = {
  slug: "ledger-nano-x",
  name: "Ledger Nano X",
  subtitle: "Ledger 授权现货，支持验货与新手指导",
  price_usd: 199,
  compare_price_usd: 229,
  summary: "支持现货下单、收货验货、新手使用引导。",
  description: "Ledger Nano X 适合长期持有、冷存储和第一次购买硬钱包的用户。",
  primary_image_url: defaultProductImages.primary,
  gallery_image_urls: defaultProductImages.gallery,
  is_active: true,
  sort_order: 1
};

const supabaseUrl = requireEnv("SUPABASE_URL", "");
const supabaseServiceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY", "");

const supabase =
  supabaseUrl && supabaseServiceRoleKey
    ? createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      })
    : null;

function createConfigError() {
  return new Error("Supabase 尚未配置，请先在 .env 中填写 SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY。");
}

function mapDbError(error, fallbackMessage) {
  if (!error) {
    return new Error(fallbackMessage);
  }

  if (
    error.code === "42P01" ||
    error.code === "42703" ||
    /does not exist/i.test(error.message || "") ||
    /column .* does not exist/i.test(error.message || "")
  ) {
    return new Error("Supabase 表结构需要更新，请重新在 SQL Editor 执行最新的 server/supabase-schema.sql。");
  }

  return new Error(fallbackMessage || error.message || "数据库请求失败。");
}

function getClient() {
  if (!supabase) {
    throw createConfigError();
  }

  return supabase;
}

async function ensureSettingsRow() {
  const client = getClient();
  const { data, error } = await client
    .from("settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    throw mapDbError(error, "读取站点设置失败。");
  }

  if (data) {
    return data;
  }

  const { data: inserted, error: insertError } = await client
    .from("settings")
    .insert(defaultSettingsRow)
    .select("*")
    .single();

  if (insertError) {
    throw mapDbError(insertError, "初始化站点设置失败。");
  }

  return inserted;
}

async function getSettings() {
  return ensureSettingsRow();
}

async function ensureDefaultProduct() {
  const client = getClient();
  const { data, error } = await client
    .from("products")
    .select("*")
    .order("sort_order", { ascending: true })
    .limit(1);

  if (error) {
    throw mapDbError(error, "读取商品数据失败。");
  }

  if (data && data.length) {
    return data[0];
  }

  const { data: inserted, error: insertError } = await client
    .from("products")
    .insert(defaultProduct)
    .select("*")
    .single();

  if (insertError) {
    throw mapDbError(insertError, "初始化默认商品失败。");
  }

  return inserted;
}

async function updateSettings(payload) {
  const current = await ensureSettingsRow();
  const client = getClient();

  const updatePayload = {
    site_name: payload.siteName ?? current.site_name,
    support_text: payload.supportText ?? current.support_text,
    checkout_notice: payload.checkoutNotice ?? current.checkout_notice,
    whatsapp: payload.whatsapp ?? current.whatsapp,
    telegram: payload.telegram ?? current.telegram,
    wechat: payload.wechat ?? current.wechat,
    email: payload.email ?? current.email,
    phone: payload.phone ?? current.phone,
    instagram: payload.instagram ?? current.instagram,
    stripe_publishable_key: payload.stripePublishableKey ?? current.stripe_publishable_key,
    stripe_price_id: payload.stripePriceId ?? current.stripe_price_id,
    bank_transfer_text: payload.bankTransferText ?? current.bank_transfer_text,
    crypto_payment_text: payload.cryptoPaymentText ?? current.crypto_payment_text,
    crypto_wallet_address: payload.cryptoWalletAddress ?? current.crypto_wallet_address,
    crypto_qr_code_url: payload.cryptoQrCodeUrl ?? current.crypto_qr_code_url,
    wechat_payment_text: payload.wechatPaymentText ?? current.wechat_payment_text,
    wechat_qr_code_url: payload.wechatQrCodeUrl ?? current.wechat_qr_code_url,
    alipay_payment_text: payload.alipayPaymentText ?? current.alipay_payment_text,
    alipay_qr_code_url: payload.alipayQrCodeUrl ?? current.alipay_qr_code_url,
    updated_at: new Date().toISOString()
  };

  const { data, error } = await client
    .from("settings")
    .update(updatePayload)
    .eq("id", 1)
    .select("*")
    .single();

  if (error) {
    throw mapDbError(error, "更新站点设置失败。");
  }

  return data;
}

async function createOrder(payload) {
  const client = getClient();
  const { data, error } = await client
    .from("orders")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    throw mapDbError(error, "创建订单失败。");
  }

  return data;
}

async function getOrderByNo(orderNo) {
  const client = getClient();
  const { data, error } = await client
    .from("orders")
    .select("*")
    .eq("order_no", orderNo)
    .maybeSingle();

  if (error) {
    throw mapDbError(error, "读取订单失败。");
  }

  return data;
}

async function updateOrderByNo(orderNo, updates) {
  const client = getClient();
  const { data, error } = await client
    .from("orders")
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq("order_no", orderNo)
    .select("*")
    .maybeSingle();

  if (error) {
    throw mapDbError(error, "更新订单失败。");
  }

  return data;
}

async function listOrders() {
  const client = getClient();
  const { data, error } = await client
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw mapDbError(error, "读取订单列表失败。");
  }

  return data || [];
}

async function listProducts(options = {}) {
  await ensureDefaultProduct();
  const client = getClient();
  let query = client
    .from("products")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (options.activeOnly) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;

  if (error) {
    throw mapDbError(error, "读取商品列表失败。");
  }

  return data || [];
}

async function getProductById(id) {
  const client = getClient();
  const { data, error } = await client
    .from("products")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw mapDbError(error, "读取商品失败。");
  }

  return data;
}

async function getProductBySlug(slug) {
  const client = getClient();
  const { data, error } = await client
    .from("products")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    throw mapDbError(error, "读取商品失败。");
  }

  return data;
}

async function createProduct(payload) {
  const client = getClient();
  const { data, error } = await client
    .from("products")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    throw mapDbError(error, "创建商品失败。");
  }

  return data;
}

async function updateProductById(id, payload) {
  const client = getClient();
  const { data, error } = await client
    .from("products")
    .update({
      ...payload,
      updated_at: new Date().toISOString()
    })
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) {
    throw mapDbError(error, "更新商品失败。");
  }

  return data;
}

async function deleteProductById(id) {
  const client = getClient();
  const { error } = await client
    .from("products")
    .delete()
    .eq("id", id);

  if (error) {
    throw mapDbError(error, "删除商品失败。");
  }

  return true;
}

async function createAnalyticsEvent(payload) {
  const client = getClient();
  const { data, error } = await client
    .from("analytics_events")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    throw mapDbError(error, "写入统计事件失败。");
  }

  return data;
}

async function listAnalyticsEvents(options = {}) {
  const client = getClient();
  let query = client
    .from("analytics_events")
    .select("*")
    .order("created_at", { ascending: false });

  if (options.since) {
    query = query.gte("created_at", options.since);
  }

  if (options.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) {
    throw mapDbError(error, "读取统计事件失败。");
  }

  return data || [];
}

async function createContactEvent(payload) {
  const client = getClient();
  const { data, error } = await client
    .from("contact_events")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    throw mapDbError(error, "写入联系线索失败。");
  }

  return data;
}

async function listContactEvents(options = {}) {
  const client = getClient();
  let query = client
    .from("contact_events")
    .select("*")
    .order("created_at", { ascending: false });

  if (options.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) {
    throw mapDbError(error, "读取联系线索失败。");
  }

  return data || [];
}

function getIsoDaysAgo(days) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

async function getDashboardSummary() {
  const [orders, products, analyticsEvents, contactEvents] = await Promise.all([
    listOrders(),
    listProducts(),
    listAnalyticsEvents({ since: getIsoDaysAgo(7), limit: 1000 }),
    listContactEvents({ limit: 100 })
  ]);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayIso = todayStart.toISOString();

  const visitsToday = analyticsEvents.filter((event) => event.event_type === "page_view" && event.created_at >= todayIso);
  const uniqueVisitorsToday = new Set(visitsToday.map((event) => event.session_id)).size;
  const recentOrderCount = orders.filter((order) => order.created_at >= getIsoDaysAgo(7)).length;
  const pendingPaymentCount = orders.filter((order) => order.payment_status !== "paid").length;
  const pendingShipmentCount = orders.filter((order) => order.payment_status === "paid" && order.order_status !== "shipped" && order.order_status !== "completed").length;
  const shippedCount = orders.filter((order) => order.order_status === "shipped" || order.order_status === "completed").length;

  const pageViews = analyticsEvents
    .filter((event) => event.event_type === "page_view")
    .reduce((acc, event) => {
      const key = event.page_path || "/";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

  const topPages = Object.entries(pageViews)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([pagePath, count]) => ({ pagePath, count }));

  const trafficSources = analyticsEvents.reduce((acc, event) => {
    const key = event.referrer || "direct";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const topSources = Object.entries(trafficSources)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([source, count]) => ({ source, count }));

  return {
    visitsToday: visitsToday.length,
    uniqueVisitorsToday,
    recentOrderCount,
    pendingPaymentCount,
    pendingShipmentCount,
    shippedCount,
    productCount: products.length,
    contactLeadCount: contactEvents.length,
    topPages,
    topSources
  };
}

module.exports = {
  supabase,
  getSettings,
  updateSettings,
  createOrder,
  getOrderByNo,
  updateOrderByNo,
  listOrders,
  listProducts,
  getProductById,
  getProductBySlug,
  createProduct,
  updateProductById,
  deleteProductById,
  createAnalyticsEvent,
  listAnalyticsEvents,
  createContactEvent,
  listContactEvents,
  getDashboardSummary
};
