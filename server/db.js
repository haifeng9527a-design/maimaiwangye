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
  wechat_payment_text: "",
  alipay_payment_text: ""
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
    wechat_payment_text: payload.wechatPaymentText ?? current.wechat_payment_text,
    alipay_payment_text: payload.alipayPaymentText ?? current.alipay_payment_text,
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

module.exports = {
  supabase,
  getSettings,
  updateSettings,
  createOrder,
  getOrderByNo,
  updateOrderByNo,
  listOrders
};
