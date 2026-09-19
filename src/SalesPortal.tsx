import React, { useCallback, useEffect, useMemo, useState } from "react";
import { bitable, dashboard } from "@lark-base-open/js-sdk";
import "./SalesPortal.scss";

const PILOT_OWNER_ID = "ou_8982cf041349064471ab7871db6173ae";
const PILOT_MODE = new URLSearchParams(window.location.search).get("pilot") === "1";

const TABLE = {
  target: "tblYZ1oQHEdOvxat",
  salary: "tbl94jXlgQY7Sll0",
  realtime: "tblH6T4xGMTqHvxL",
};

type Row = Record<string, unknown>;
type PortalData = { targets: Row[]; salaries: Row[]; realtime: Row[] };

const text = (value: unknown): string => {
  if (value == null) return "";
  if (Array.isArray(value)) return value.map((item) => text(item)).filter(Boolean).join(", ");
  if (typeof value === "object") {
    const item = value as Record<string, unknown>;
    return String(item.text ?? item.name ?? item.value ?? item.id ?? "");
  }
  return String(value);
};

const number = (value: unknown): number => {
  const parsed = Number(text(value).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

const money = (value: unknown) => `${Math.round(number(value)).toLocaleString("vi-VN")} đ`;

const monthNow = () => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  return `${year}-${month}`;
};

const readTable = async (tableId: string): Promise<Row[]> => {
  const table = await bitable.base.getTableById(tableId);
  const fields = await table.getFieldMetaList();
  const result = await table.getRecords({ pageSize: 200 } as any);
  return ((result as any)?.records || []).map((record: any) => {
    const row: Row = { _recordId: record.record_id ?? record.recordId };
    for (const field of fields as any[]) row[field.name] = record.fields?.[field.id] ?? record.fields?.[field.name];
    return row;
  });
};

const withTimeout = <T,>(promise: Promise<T>, ms: number): Promise<T> =>
  Promise.race([promise, new Promise<T>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms))]);

const parseDate = (value: unknown) => {
  const raw = text(value);
  const match = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})$/);
  return match ? new Date(`${match[3]}-${match[2]}-${match[1]}T${match[4]}:${match[5]}:${match[6]}+07:00`).getTime() : 0;
};

export default function SalesPortal() {
  const [data, setData] = useState<PortalData | null>(null);
  const [viewerIds, setViewerIds] = useState<string[]>([]);
  const [selectedSales, setSelectedSales] = useState("");
  const [month, setMonth] = useState(monthNow());
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    setError("");
    try {
      const [targets, salaries, realtime] = await Promise.all([
        readTable(TABLE.target),
        readTable(TABLE.salary),
        readTable(TABLE.realtime),
      ]);
      setData({ targets, salaries, realtime });
      try {
        const ids = await Promise.all([
          withTimeout(bitable.bridge.getBaseUserId(), 2500).catch(() => ""),
          withTimeout(bitable.bridge.getUserId(), 2500).catch(() => ""),
        ]);
        setViewerIds(Array.from(new Set(ids.filter(Boolean))));
      } catch {
        setViewerIds([]);
      }
      try { await dashboard.setRendered(); } catch { /* standalone preview */ }
    } catch (cause) {
      setError(`Không tải được dữ liệu Lark Base: ${(cause as Error)?.message || String(cause)}`);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const months = useMemo(() => {
    if (!data) return [monthNow()];
    return Array.from(new Set([...data.targets, ...data.salaries].map((row) => text(row["Tháng"])).filter(Boolean))).sort().reverse();
  }, [data]);

  const monthTargets = useMemo(() => data?.targets.filter((row) => text(row["Tháng"]) === month) || [], [data, month]);
  const mappedSales = useMemo(() => monthTargets.filter((row) => {
    const users = row["Người dùng Lark"];
    return Array.isArray(users) && users.some((user) => viewerIds.includes(text((user as any)?.id)));
  }).map((row) => text(row["Sales"])), [monthTargets, viewerIds]);
  const allSales = useMemo(() => Array.from(new Set(monthTargets.map((row) => text(row["Sales"])).filter(Boolean))).sort(), [monthTargets]);
  const isPilotOwner = PILOT_MODE && viewerIds.includes(PILOT_OWNER_ID);
  const canChooseSales = isPilotOwner;
  const sales = mappedSales.length === 1 ? mappedSales[0] : (isPilotOwner ? (selectedSales || allSales[0] || "") : "");

  const targetRow = monthTargets.find((row) => text(row["Sales"]) === sales);
  const salary = data?.salaries.find((row) => text(row["Sales"]) === sales && text(row["Tháng"]) === month);
  const salesRows = (data?.realtime || [])
    .filter((row) => text(row["Sales"]) === sales && text(row["Tháng"]) === month)
    .sort((a, b) => parseDate(b["Ngày giờ bán"]) - parseDate(a["Ngày giờ bán"]));

  const target = number(targetRow?.["Mục tiêu số xe"]);
  // Realtime only contains records created after the workflow launch; cumulative STT is the full monthly sold count.
  const sold = Math.max(0, ...salesRows.map((row) => number(row["STT xe bán lũy kế"])));
  const remaining = Math.max(target - sold, 0);
  const progress = target > 0 ? Math.min((sold / target) * 100, 100) : 0;
  const income = number(salary?.["Thu nhập"]);
  const kpiRaw = number(salary?.["KPI %"]);
  const kpi = kpiRaw <= 1 ? kpiRaw * 100 : kpiRaw;
  const nextMilestone = sold < 46 ? 46 : sold < 56 ? 56 : sold < 66 ? 66 : sold < 76 ? 76 : sold < 86 ? 86 : null;

  if (!data && !error) return <main className="sales-shell center"><div className="loader"/><p>Đang tải dữ liệu realtime…</p></main>;
  if (error) return <main className="sales-shell center"><section className="empty-card"><strong>Chưa mở trong Lark Dashboard</strong><p>{error}</p><button onClick={load}>Thử lại</button></section></main>;
  if (!sales) return <main className="sales-shell center"><section className="empty-card"><strong>Chưa được cấp quyền xem</strong><p>Tài khoản Lark của bạn chưa được gán với hồ sơ Sales. Liên hệ quản trị viên để cập nhật bảng Mục tiêu Sales.</p></section></main>;

  return (
    <main className="sales-shell">
      <header className="sales-header">
        <div><p className="eyebrow">SALES PORTAL · {month}</p><h1>Xin chào, {sales ? sales.toLocaleLowerCase("vi-VN").replace(/(^|\s)\S/g, (c) => c.toUpperCase()) : "Sales"}</h1><p className="subtle">Cập nhật trực tiếp từ Lark Base</p></div>
        <button className={`refresh ${refreshing ? "spin" : ""}`} onClick={load} aria-label="Làm mới">↻</button>
      </header>

      <div className="filters">
        {canChooseSales && <label>Sales<select value={sales} onChange={(event) => setSelectedSales(event.target.value)}>{allSales.map((name) => <option key={name}>{name}</option>)}</select></label>}
        <label>Tháng<select value={month} onChange={(event) => setMonth(event.target.value)}>{months.map((item) => <option key={item}>{item}</option>)}</select></label>
      </div>
      {canChooseSales && <p className="pilot-note">Chế độ pilot của quản trị viên · dữ liệu Sales chưa mở cho toàn đội.</p>}

      <section className="hero-card">
        <div className="hero-copy"><span>Thu nhập tạm tính</span><strong>{money(income)}</strong><small>KPI tháng: {kpi.toLocaleString("vi-VN")}%</small></div>
        <div className="income-mark">₫</div>
      </section>

      <section className="goal-card">
        <div className="section-title"><div><span>Mục tiêu bán hàng</span><strong>{target > 0 ? `${Math.round(progress)}% hoàn thành` : "Chưa nhập mục tiêu"}</strong></div><b>{sold}/{target || "—"} xe</b></div>
        <div className="progress-track"><div style={{ width: `${progress}%` }}/></div>
        <div className="metric-grid">
          <article><span>Đã bán</span><strong>{sold}</strong><small>xe</small></article>
          <article><span>Mục tiêu</span><strong>{target || "—"}</strong><small>xe</small></article>
          <article><span>Còn thiếu</span><strong>{target > 0 ? remaining : "—"}</strong><small>xe</small></article>
        </div>
      </section>

      <section className="details-grid">
        <article><span>Thưởng xe khoán</span><strong>{money(salary?.["Thưởng số xe khoán"])}</strong></article>
        <article><span>Thưởng nóng</span><strong>{money(number(salary?.["Thưởng nóng Winner"]) + number(salary?.["Thưởng nóng Vario"]))}</strong></article>
        <article><span>Điểm xe</span><strong>{number(salary?.["Tổng điểm xe"]).toLocaleString("vi-VN")}</strong></article>
        <article><span>Số xe khoán</span><strong>{number(salary?.["Số xe khoán"]).toLocaleString("vi-VN", { maximumFractionDigits: 2 })}</strong></article>
      </section>

      {nextMilestone && <section className="milestone"><span>🎯</span><div><strong>Mốc thưởng tiếp theo</strong><p>Bán thêm {nextMilestone - sold} xe để đạt mốc {nextMilestone} xe.</p></div></section>}

      <section className="history-card">
        <div className="section-title"><div><span>Xe vừa bán</span><strong>{sold} giao dịch trong tháng</strong></div></div>
        <div className="history-list">
          {salesRows.slice(0, 5).map((row, index) => <article key={text(row._recordId) || index}>
            <div><strong>{text(row["Loại xe"]) || "Xe bán"}</strong><span>{text(row["Ngày giờ bán"])} · {text(row["Cửa hàng chuẩn"])}</span></div>
            <b>+{money(row["Thưởng số xe khoán"])}</b>
          </article>)}
          {!salesRows.length && <p className="empty">Chưa có giao dịch trong tháng này.</p>}
        </div>
      </section>
      <footer>Dữ liệu lương tạm tính · Kết quả chính thức theo kỳ duyệt lương</footer>
    </main>
  );
}
