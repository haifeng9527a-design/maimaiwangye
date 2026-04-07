const { requireEnv } = require("./utils");

const TRONGRID_BASE_URL = "https://api.trongrid.io";
const USDT_TRC20_CONTRACT = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeAddress(value) {
  return normalizeText(value).toLowerCase();
}

function parseTokenAmount(value, decimals = 6) {
  const numericValue = Number(value || 0);
  if (!Number.isFinite(numericValue)) {
    return 0;
  }

  return numericValue / (10 ** decimals);
}

function formatUsdtAmount(value, digits = 3) {
  const numericValue = Number(value || 0);
  if (!Number.isFinite(numericValue)) {
    return (0).toFixed(digits);
  }

  return numericValue.toFixed(digits);
}

async function fetchTransactionEvents(txid) {
  const apiKey = normalizeText(requireEnv("TRON_PRO_API_KEY", ""));
  const response = await fetch(
    `${TRONGRID_BASE_URL}/v1/transactions/${encodeURIComponent(txid)}/events?only_confirmed=true`,
    {
      headers: apiKey
        ? {
            "TRON-PRO-API-KEY": apiKey
          }
        : {}
    }
  );

  if (!response.ok) {
    throw new Error("TRON 链上接口请求失败，请稍后重试。");
  }

  const data = await response.json();
  return Array.isArray(data.data) ? data.data : [];
}

async function fetchAccountTransfers(address, options = {}) {
  const apiKey = normalizeText(requireEnv("TRON_PRO_API_KEY", ""));
  const params = new URLSearchParams({
    only_confirmed: "true",
    only_to: "true",
    order_by: "block_timestamp,desc",
    limit: String(options.limit || 50),
    contract_address: USDT_TRC20_CONTRACT
  });

  if (options.minTimestamp) {
    params.set("min_timestamp", String(options.minTimestamp));
  }

  if (options.maxTimestamp) {
    params.set("max_timestamp", String(options.maxTimestamp));
  }

  const response = await fetch(
    `${TRONGRID_BASE_URL}/v1/accounts/${encodeURIComponent(address)}/transactions/trc20?${params.toString()}`,
    {
      headers: apiKey
        ? {
            "TRON-PRO-API-KEY": apiKey
          }
        : {}
    }
  );

  if (!response.ok) {
    throw new Error("TRON 收款记录查询失败，请稍后重试。");
  }

  const data = await response.json();
  return Array.isArray(data.data) ? data.data : [];
}

function getTransferResultField(result, keys) {
  if (!result || typeof result !== "object") {
    return "";
  }

  for (const key of keys) {
    if (result[key] !== undefined && result[key] !== null) {
      return result[key];
    }
  }

  return "";
}

function matchesExpectedAmount(actualAmount, expectedAmount, digits = 3) {
  return formatUsdtAmount(actualAmount, digits) === formatUsdtAmount(expectedAmount, digits);
}

async function verifyUsdtTrc20Payment({ txid, receiverAddress, expectedAmount }) {
  const normalizedTxid = normalizeText(txid);
  const normalizedReceiver = normalizeAddress(receiverAddress);

  if (!normalizedTxid) {
    return { verified: false, detail: "请输入交易哈希 TXID。" };
  }

  if (!normalizedReceiver) {
    return { verified: false, detail: "后台尚未配置 USDT-TRC20 收款地址。" };
  }

  const events = await fetchTransactionEvents(normalizedTxid);
  if (!events.length) {
    return { verified: false, detail: "未查询到已确认的链上转账事件，请确认 TXID 是否正确。" };
  }

  const transferEvent = events.find((event) => {
    const contractAddress = normalizeAddress(event.contract_address);
    const eventName = normalizeText(event.event_name || event.event);
    return contractAddress === normalizeAddress(USDT_TRC20_CONTRACT) && /transfer/i.test(eventName);
  });

  if (!transferEvent) {
    return { verified: false, detail: "该交易不是有效的 USDT-TRC20 转账记录。" };
  }

  const result = transferEvent.result || {};
  const toAddress = normalizeAddress(getTransferResultField(result, ["to", "_to"]));
  const fromAddress = normalizeText(getTransferResultField(result, ["from", "_from"]));
  const rawValue = getTransferResultField(result, ["value", "_value"]);
  const actualAmount = parseTokenAmount(rawValue, 6);

  if (toAddress !== normalizedReceiver) {
    return { verified: false, detail: "收款地址不匹配，请确认你转入的是后台配置的 USDT-TRC20 地址。" };
  }

  const expected = Number(expectedAmount || 0);
  if (!Number.isFinite(expected) || expected <= 0) {
    return { verified: false, detail: "订单金额无效，暂时无法自动核单。" };
  }

  if (Math.abs(actualAmount - expected) > 0.000001) {
    return {
      verified: false,
      detail: `链上金额不匹配。当前交易金额为 ${actualAmount} USDT，订单应付 ${expected.toFixed(2)} USDT。`
    };
  }

  return {
    verified: true,
    txid: normalizedTxid,
    fromAddress,
    toAddress: receiverAddress,
    actualAmount,
    detail: `USDT-TRC20 转账已确认，金额 ${actualAmount} USDT。`
  };
}

async function findMatchingIncomingUsdtPayment({
  receiverAddress,
  expectedAmount,
  minTimestamp,
  maxTimestamp,
  excludeTxids = []
}) {
  const normalizedReceiver = normalizeAddress(receiverAddress);
  if (!normalizedReceiver) {
    return { matched: false, detail: "后台尚未配置 USDT-TRC20 收款地址。" };
  }

  const transfers = await fetchAccountTransfers(receiverAddress, {
    minTimestamp,
    maxTimestamp,
    limit: 100
  });

  if (!transfers.length) {
    return { matched: false, detail: "暂未检测到该时间窗口内的 USDT-TRC20 入账。" };
  }

  const excluded = new Set(excludeTxids.map((item) => normalizeText(item)));
  const match = transfers.find((transfer) => {
    const txid = normalizeText(transfer.transaction_id);
    const toAddress = normalizeAddress(transfer.to);
    const actualAmount = parseTokenAmount(transfer.value, Number(transfer.token_info?.decimals || 6));
    return (
      txid &&
      !excluded.has(txid) &&
      toAddress === normalizedReceiver &&
      matchesExpectedAmount(actualAmount, expectedAmount, 3)
    );
  });

  if (!match) {
    return { matched: false, detail: `暂未检测到金额为 ${formatUsdtAmount(expectedAmount, 3)} USDT 的有效入账。` };
  }

  const actualAmount = parseTokenAmount(match.value, Number(match.token_info?.decimals || 6));
  return {
    matched: true,
    txid: normalizeText(match.transaction_id),
    fromAddress: normalizeText(match.from),
    toAddress: normalizeText(match.to),
    actualAmount,
    blockTimestamp: Number(match.block_timestamp || 0),
    detail: `检测到 ${formatUsdtAmount(actualAmount, 3)} USDT 入账，已匹配当前订单。`
  };
}

module.exports = {
  USDT_TRC20_CONTRACT,
  formatUsdtAmount,
  verifyUsdtTrc20Payment,
  findMatchingIncomingUsdtPayment
};
