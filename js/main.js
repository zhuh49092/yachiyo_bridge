// =========================
//  可修改的常量
// =========================

// ① Padlet 链接（八千代用的新画板）
const PADLET_URL = "https://padlet.com/zhuh49092/padlet-8gnjzav71knt6wtr";

// ② Google Apps Script Web App 的 URL
//    部署好 Web App 后，把 URL 填到这里
const LOG_ENDPOINT = "https://script.google.com/macros/s/AKfycbzS2FKCVSMblSMHGDmpdfWrnVwrPz1VoxberjLlKn6IKX_BLcECt3UIa3wgWC8LXI60Vg/exec";

// ③ 再进入(revisit)的最小间隔（毫秒）
//    例如：10000 = 10秒；60000 = 1分钟
const MIN_REVISIT_INTERVAL_MS = 10000;


// =========================
//  URL 参数解析
// =========================

// 入口类型：qr / nfc / test / unknown
function getEntryType() {
  try {
    const params = new URLSearchParams(window.location.search);
    const entryParam = (params.get("entry") || "").toLowerCase();

    if (entryParam === "test") {
      // 企画者用：完全不记录
      return "test";
    }
    if (entryParam === "qr" || entryParam === "nfc") {
      return entryParam;
    }
    return "unknown";
  } catch (e) {
    return "unknown";
  }
}

// 钥匙串编号：从 URL 参数 key 中读取（例如 ?entry=qr&key=3）
function getKeyId() {
  try {
    const params = new URLSearchParams(window.location.search);
    const keyParam = (params.get("key") || "").trim();
    // 不强制要求一定是数字，但你可以在生成QR时保证是1–20
    return keyParam;
  } catch (e) {
    return "";
  }
}

const ENTRY_TYPE = getEntryType();
const KEY_ID     = getKeyId();


// =========================
//  事件上报函数
// =========================

function logEvent(eventType) {
  // test 模式：完全不记录
  if (ENTRY_TYPE === "test") {
    return;
  }

  // 如果你一开始还没部署 GAS，可以临时关掉
  if (!LOG_ENDPOINT) {
    console.warn("LOG_ENDPOINT is empty, skip log:", eventType);
    return;
  }

  const payload = {
    event_type: eventType,  // "page_view" / "revisit" / "padlet_open"
    entry_type: ENTRY_TYPE, // "qr" / "nfc" / "unknown"
    key_id: KEY_ID          // "1"～"20"（或空字符串）
  };

  try {
    fetch(LOG_ENDPOINT, {
      method: "POST",
      mode: "no-cors",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
  } catch (err) {
    console.error("logEvent error:", err);
  }
}


// =========================
//  页面初始化 & 事件绑定
// =========================

document.addEventListener("DOMContentLoaded", () => {
  const now = Date.now();

  // 1) 页面加载时 → 记一次 page_view
  if (ENTRY_TYPE !== "test") {
    logEvent("page_view");
    sessionStorage.setItem("bridge_last_log_time", String(now));
  }

  // 2) TAP 按钮点击 → 记一次 padlet_open，然后跳转 Padlet
  const tapButton = document.getElementById("tapButton");
  if (tapButton) {
    tapButton.addEventListener("click", () => {
      if (ENTRY_TYPE !== "test") {
        logEvent("padlet_open");
      }
      // 在新标签打开 Padlet
      window.open(PADLET_URL, "_blank");
    });
  }

  // 3) 从后台回到前台 → 统计 revisit
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      const now = Date.now();
      const last = Number(sessionStorage.getItem("bridge_last_log_time") || 0);

      // 距离上一次打点超过设定间隔，才记一次 revisit
      if (!last || now - last >= MIN_REVISIT_INTERVAL_MS) {
        if (ENTRY_TYPE !== "test") {
          logEvent("revisit");
        }
        sessionStorage.setItem("bridge_last_log_time", String(now));
      }
    }
  });
});
