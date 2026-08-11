const LARK_API = "https://open.larksuite.com/open-apis";
const FOLDER_TOKEN = "G8m4fC77GlrUNBdzKkSl3gHqgIh";
const ALLOWED_ORIGINS = new Set([
  "https://lark-dashboard-page-preview.vercel.app",
  "http://localhost:5173",
]);

function json(response, status, body) {
  response.status(status).setHeader("Content-Type", "application/json").end(JSON.stringify(body));
}

async function lark(path, token, init = {}) {
  const response = await fetch(`${LARK_API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...init.headers },
  });
  const body = await response.json();
  if (!response.ok || body.code) throw new Error(body.msg || `Lark HTTP ${response.status}`);
  return body.data;
}

const paragraph = content => ({
  block_type: 2,
  text: { elements: [{ text_run: { content: String(content) } }], style: {} },
});

export default async function handler(request, response) {
  if (request.method !== "POST") return json(response, 405, { error: "Method not allowed" });
  const origin = request.headers.origin || "";
  // ponytail: origin gating limits browser abuse; add signed user auth if this endpoint gains broader exposure.
  if (!ALLOWED_ORIGINS.has(origin)) return json(response, 403, { error: "Origin not allowed" });

  const { meetingId, started, ended, duration, tabs, ids } = request.body || {};
  if (!/^MEET-\d{10,}$/.test(String(meetingId)) || !Number.isFinite(started) || !Number.isFinite(ended) || !Array.isArray(ids) || ids.length > 200) {
    return json(response, 400, { error: "Invalid meeting minutes" });
  }

  try {
    const appId = process.env.LARK_APP_ID;
    const appSecret = process.env.LARK_APP_SECRET;
    if (!appId || !appSecret) throw new Error("Lark credentials are not configured");

    const tokenResponse = await fetch(`${LARK_API}/auth/v3/tenant_access_token/internal`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ app_id: appId, app_secret: appSecret }),
    });
    const tokenBody = await tokenResponse.json();
    if (!tokenResponse.ok || tokenBody.code || !tokenBody.tenant_access_token) throw new Error(tokenBody.msg || "Cannot obtain tenant access token");
    const token = tokenBody.tenant_access_token;

    const title = `Biên bản họp ${meetingId}`;
    const document = await lark("/docx/v1/documents", token, {
      method: "POST",
      body: JSON.stringify({ folder_token: FOLDER_TOKEN, title }),
    });
    const documentId = document.document.document_id;
    const lines = [
      `Meeting ID: ${meetingId}`,
      `Bắt đầu: ${new Date(started).toLocaleString("vi-VN", { timeZone: "Asia/Bangkok" })}`,
      `Kết thúc: ${new Date(ended).toLocaleString("vi-VN", { timeZone: "Asia/Bangkok" })}`,
      `Thời lượng: ${duration || "Chưa xác định"}`,
      `Chi tiết tab: ${tabs || "Chưa xác định"}`,
      "IDS",
      ...(ids.length ? ids.flatMap((item, index) => [
        `${index + 1}. ${item.code || "Chưa xác định"} · ${item.scope || "Chưa xác định"}`,
        `Identify: ${item.identify || "Chưa xác định"}`,
        `Discuss: ${item.discuss || "Chưa xác định"}`,
        `Solution: ${item.solution || "Chưa xác định"}`,
        `Trạng thái: ${item.status || "Chưa xác định"}`,
      ]) : ["Chưa có IDS trong cuộc họp."]),
      "Ghi chú: Trường thiếu được ghi “Chưa xác định”, không tự suy diễn quyết định.",
    ];
    await lark(`/docx/v1/documents/${documentId}/blocks/${documentId}/children`, token, {
      method: "POST",
      body: JSON.stringify({ children: lines.map(paragraph), index: -1 }),
    });

    return json(response, 200, { url: `https://headkhanhan.sg.larksuite.com/docx/${documentId}` });
  } catch (error) {
    console.error("meeting-minutes", error);
    return json(response, 500, { error: error instanceof Error ? error.message : "Cannot create meeting minutes" });
  }
}
