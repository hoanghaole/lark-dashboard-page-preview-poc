import { useTranslation } from "react-i18next";
import { dashboard, DashboardState, bitable, IFieldMeta } from "@lark-base-open/js-sdk";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Button, Input, Space, Form, Typography, TextArea, DatePicker, Toast, SideSheet, Nav, Popover, Select, Spin } from "@douyinfe/semi-ui";
import IconCustomerSupport from "@douyinfe/semi-icons/lib/es/icons/IconCustomerSupport";
import { IconHome, IconServer, IconComment, IconUser, IconRefresh, IconEdit, IconDelete, IconSidebar, IconSetting, IconCoinMoney, IconPlus, IconPlay, IconPause, IconStop, IconList } from "@douyinfe/semi-icons";
import { useTheme, useConfig } from "./hooks/index";
import '@lark-base-open/js-sdk/dist/style/dashboard.css';
import "./App.scss";
import classnames from "classnames";
import { debounce } from "lodash";

interface IPreviewConfig {
  url: string;
}

const DEFAULT_BI_URL = "https://app.powerbi.com/view?r=eyJrIjoiZjlhMGQ4NzctNDU1MC00MDJmLWFiN2MtMjEzN2M0YmM3MGY4IiwidCI6ImM0YzU5OTA3LWJlOGItNGIyYS1iMjI2LTgyZmE5MjIzZDc0MiIsImMiOjEwfQ%3D%3D";
const MKT_BI_URL = "https://app.powerbi.com/view?r=eyJrIjoiODJjOWY4YTQtMWQ0OC00YmNmLThiYzMtNWM2YWRlNGQyYmQ1IiwidCI6ImIyYzE5ZjFmLTQyN2MtNDJhOC04OGJmLWVmODljZDc0YWNkYSIsImMiOjEwfQ%3D%3D&pageName=b6332825f273b36e2d1f";
// Chưa có link riêng => dùng link chung; Ba gửi link từng phòng ban là điền vào đây.
const TAB_BI_URL: Record<string, string> = {
  kinhdoanh: "https://app.powerbi.com/view?r=eyJrIjoiNzkyMzE5MmMtZjkyYi00M2JjLTlhNTQtMzI2NTk0YWFjZDUxIiwidCI6ImM0YzU5OTA3LWJlOGItNGIyYS1iMjI2LTgyZmE5MjIzZDc0MiIsImMiOjEwfQ%3D%3D",
  dichvu: "https://app.powerbi.com/view?r=eyJrIjoiMmVkNmM4MzctMGNmNC00NDU4LThhODQtNmJmZWU0YmUyM2I5IiwidCI6ImIyYzE5ZjFmLTQyN2MtNDJhOC04OGJmLWVmODljZDc0YWNkYSIsImMiOjEwfQ%3D%3D",
  cr: DEFAULT_BI_URL,
  mkt: MKT_BI_URL,
  hr: "https://app.powerbi.com/view?r=eyJrIjoiN2I1MDFjZmQtMzdhYi00MWQ5LWI0NjMtZWQzYjZkYjVkMjY4IiwidCI6ImIyYzE5ZjFmLTQyN2MtNDJhOC04OGJmLWVmODljZDc0YWNkYSIsImMiOjEwfQ%3D%3D",
  ketoan: DEFAULT_BI_URL,
  hethong: DEFAULT_BI_URL,
};

const DEFAULT_URL = (() => {
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get("url") || DEFAULT_BI_URL;
  } catch {
    return "";
  }
})();

const BASE_TOKEN = "HdqfbQnYgaNmOJsDJNdlKVmCg4c";
const TABLE_ID = "tbl5VbzzomDFdAfn";

const TABS = [
  { key: "hethong", label: "Hệ thống", icon: <IconSetting />, color: "#5a6472" },
  { key: "kinhdoanh", label: "Kinh doanh", icon: <IconHome />, color: "#2f6fed" },
  { key: "dichvu", label: "Dịch vụ", icon: <IconServer />, color: "#f0722f" },
  { key: "cr", label: "CR", icon: <IconCustomerSupport />, color: "#7a5af8" },
  { key: "mkt", label: "MKT", icon: <IconComment />, color: "#00a85d" },
  { key: "hr", label: "HR", icon: <IconUser />, color: "#e14d6e" },
  { key: "ketoan", label: "Kế toán", icon: <IconCoinMoney />, color: "#b8870c" },
];

type IKpiGroup = { label: string; options: { value: string; label: string }[] };

const SERVICE_KPI_GROUPS: IKpiGroup[] = [
  {
    label: "1. Dịch vụ",
    options: [
      "1.01. Lượt xe dịch vụ",
      "1.02. Lượt xe KTĐK",
      "1.03. Lượt xe Sửa chữa",
      "1.04. Lượt xe Tự nhiên",
      "1.05. Doanh thu dịch vụ",
      "1.06. Doanh thu PT HVN",
      "1.07. Doanh thu Tiền công",
      "1.08. Doanh thu DV Phụ",
      "1.09. Doanh thu tiền dịch vụ phụ bình quân/xe",
      "1.10. Hệ số tồn kho (không tính Rank E lâu năm)",
      "1.11. Tỷ trọng tồn kho Rank A",
      "1.12. Tỷ trọng tồn kho Rank B",
      "1.13. Tỷ trọng tồn kho Rank C",
      "1.14. Tỷ trọng tồn kho Rank D",
      "1.15. Tỷ trọng tồn kho Rank E",
      "1.16. Tổng tiền tồn kho lâu năm",
      "1.17. Tỷ lệ tồn đơn hàng sau 3 tháng",
      "1.18. Tỷ lệ tồn đơn hàng sau 6 tháng",
    ].map(label => ({ value: label, label })),
  },
  {
    label: "2. Trải nghiệm khách hàng",
    options: ["2.1. CSI", "2.2. NPS", "2.3. CSAT", "2.4. Khen", "2.5. Góp ý", "2.6. Khiếu nại"].map(label => ({ value: label, label })),
  },
  {
    label: "3. Vận hành",
    options: ["3.1. Top công ty - dịch vụ", "3.2. Hệ thống văn bản", "3.4. Công nghệ"].map(label => ({ value: label, label })),
  },
  {
    label: "4. Con người & phát triển",
    options: ["4.1. Giá trị cốt lõi", "4.2. Đào tạo", "4.3. Lộ trình phát triển", "4.4. Năng suất lao động"].map(label => ({ value: label, label })),
  },
];

const KPI_GROUPS: IKpiGroup[] = [
  {
    label: "1. Kinh doanh",
    options: [
      { value: "1.1 Tổng doanh thu", label: "1.1 Tổng doanh thu" },
      { value: "1.2 Doanh thu lẻ", label: "1.2 Doanh thu lẻ" },
      { value: "1.3 Doanh thu sỉ", label: "1.3 Doanh thu sỉ" },
      { value: "1.4 Doanh thu chéo", label: "1.4 Doanh thu chéo" },
      { value: "1.5 Doanh thu góp", label: "1.5 Doanh thu góp" },
      { value: "1.6 Số lượng xe bán lẻ", label: "1.6 Số lượng xe bán lẻ" },
      { value: "1.7 Số lượng bán sỉ", label: "1.7 Số lượng bán sỉ" },
      { value: "1.8 Tồn kho", label: "1.8 Tồn kho" },
      { value: "1.9 Chi phí", label: "1.9 Chi phí" },
    ],
  },
  {
    label: "2. Trải nghiệm khách hàng",
    options: [
      { value: "2.1 CSI", label: "2.1 CSI" },
      { value: "2.2 NPS", label: "2.2 NPS" },
      { value: "2.3 CSAT", label: "2.3 CSAT" },
      { value: "2.4 Khen", label: "2.4 Khen" },
      { value: "2.5 Góp ý", label: "2.5 Góp ý" },
      { value: "2.6 Khiếu nại", label: "2.6 Khiếu nại" },
    ],
  },
  {
    label: "3. Vận hành",
    options: [
      { value: "3.1 Top công ty - bán hàng", label: "3.1 Top công ty - bán hàng" },
      { value: "3.2 Hệ thống văn bản", label: "3.2 Hệ thống văn bản" },
      { value: "3.3 Công nghệ", label: "3.3 Công nghệ" },
    ],
  },
  {
    label: "4. Con người & phát triển",
    options: [
      { value: "4.1 Giá trị cốt lõi", label: "4.1 Giá trị cốt lõi" },
      { value: "4.2 Đào tạo", label: "4.2 Đào tạo" },
      { value: "4.3 Lộ trình phát triển", label: "4.3 Lộ trình phát triển" },
      { value: "4.4 Năng suất lao động", label: "4.4 Năng suất lao động" },
    ],
  },
];

interface IActionItem {
  hanhDong: string;
  nguoi: string;
  deadline: string;
}

const EMPTY_ACTION: IActionItem = { hanhDong: "", nguoi: "", deadline: "" };

const TABLE_ID_ACTIONS = "tblZFnTjYHIjNJAF";
const TABLE_ID_IDS = "tbl62pWCfKLMEHjQ";
const TABLE_ID_MEETING_LOG = "tbldtBstrl16TXgJ";

interface IFeedbackForm {
  chiSo: string;
  ngayBatDau: string;
  nguyenNhan: string;
  keHoach: string;
}

interface IRecordRow {
  record_id: string;
  chiSo: string;
  ngayBatDau: string;
  nguyenNhan: string;
  keHoach: string;
  lenLop: string;
}

const EMPTY_FORM: IFeedbackForm = { chiSo: "", ngayBatDau: "", nguyenNhan: "", keHoach: "" };

function App() {
  const { bgColor } = useTheme();

  const [config, setConfig] = useState<IPreviewConfig>({ url: DEFAULT_URL });
  const [panelOpen, setPanelOpen] = useState(true);
  const [inputValue, setInputValue] = useState(DEFAULT_URL);
  const [saving, setSaving] = useState(false);
  const [fields, setFields] = useState<IFieldMeta[]>([]);
  const [activeTab, setActiveTab] = useState(TABS[0].key);
  // Mount the active BI first, then preload one more tab at a time in the background.
  const [mountedTabs, setMountedTabs] = useState<Set<string>>(() => new Set([TABS[0].key]));
  // Track which iframes have finished loading (per tab) to hide spinner.
  const [loadedTabs, setLoadedTabs] = useState<Record<string, boolean>>({});
  const [form, setForm] = useState<IFeedbackForm>(EMPTY_FORM);
  const [actions, setActions] = useState<IActionItem[]>([]);
  const [records, setRecords] = useState<IRecordRow[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dbg, setDbg] = useState<string>("");
  const [meeting, setMeeting] = useState<{ id: string; started: number; paused: boolean; tabMs: Record<string, number>; lastTick: number } | null>(null);
  const [idsForm, setIdsForm] = useState({ meetingId: "", identify: "", discuss: "", solution: "", scope: "Công ty", status: "Mở" });
  const [idsActions, setIdsActions] = useState<IActionItem[]>([]);
  const [idsSaving, setIdsSaving] = useState(false);

  const isCreate = dashboard.state === DashboardState.Create;
  const isConfig = dashboard.state === DashboardState.Config || isCreate;

  const { t } = useTranslation();

  const refreshRecords = useCallback(async () => {
    try {
      const table = await bitable.base.getTableById(TABLE_ID);
      const meta = await table.getFieldMetaList();
      const res = await table.getRecords({ pageSize: 200 } as any);
      const rows: IRecordRow[] = [];
      for (const r of (res as any)?.records || []) {
        const g = (fn: string) => {
          const f = (meta as any[]).find((x: any) => x.name === fn);
          const v = f ? (r.fields as any)?.[f.id] ?? (r.fields as any)?.[fn] : r.fields?.[fn];
          if (v == null) return "";
          if (Array.isArray(v)) return v.map((i: any) => i.text ?? i.name ?? i).join(", ");
          if (typeof v === "object" && v.text) return v.text;
          return String(v);
        };
        rows.push({
          record_id: r.record_id ?? r.recordId,
          chiSo: g("Chỉ số"),
          ngayBatDau: g("Ngày bắt đầu"),
          nguyenNhan: g("Nguyên nhân"),
          keHoach: g("Kế hoạch"),
          lenLop: g("Đã cập nhật"),
        });
      }
      setRecords(rows.reverse());
    } catch (e) {
      console.warn("refreshRecords error", e);
      Toast.error("Không tải được danh sách phản hồi: " + ((e as Error)?.message || String(e)));
    }
  }, []);

  // Load table field metadata, then first record batch
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const table = await bitable.base.getTableById(TABLE_ID);
        const f = await table.getFieldMetaList();
        if (!cancelled) setFields(f);
        setDbg((d) => (d + `\nTABLE_OK ${TABLE_ID} fields=${f.map((x: any) => x.name).join(", ")}`).slice(-1500));
        await refreshRecords();
      } catch (e) {
        setDbg((d) => (d + `\nTABLE_ERR ${TABLE_ID} ${(e as Error).message}`).slice(-1500));
        console.warn("cannot load table fields", e);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const buildRecord = () => {
    const record: Record<string, unknown> = {};
    record["Phòng ban"] = activeLabel || "";
    if (form.chiSo.trim()) record["Chỉ số"] = form.chiSo.trim();
    if (form.ngayBatDau) {
      const ms = new Date(form.ngayBatDau).getTime();
      if (!isNaN(ms)) record["Ngày bắt đầu"] = ms;
    }
    if (form.nguyenNhan.trim()) record["Nguyên nhân"] = form.nguyenNhan.trim();
    if (form.keHoach.trim()) record["Kế hoạch"] = form.keHoach.trim();
    record["Mã chiến lược"] = strategyCode();
    return record;
  };

  const strategyCode = () => {
    const d = new Date();
    const p = (n: number) => String(n).padStart(2, "0");
    return `CS-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
  };

  const saveForm = async () => {
    if (!form.nguyenNhan.trim() && !form.keHoach.trim()) {
      Toast.warning("Vui lòng nhập ít nhất nguyên nhân hoặc kế hoạch");
      return;
    }
    setSaving(true);
    try {
      const table = await bitable.base.getTableById(TABLE_ID);
      const byName: Record<string, unknown> = buildRecord();
      // Dashboard widget addRecord expects field_id keys, not names.
      const meta = await table.getFieldMetaList();
      const record: Record<string, unknown> = {};
      const nameToId: Record<string, string> = {};
      for (const m of meta as any[]) nameToId[m.name] = m.id;
      for (const fullKey of Object.keys(byName)) {
        const targetId = nameToId[fullKey];
        const m = targetId ? `key[${fullKey}]->${targetId}` : `MISSING FIELD: ${fullKey}`;
        if (!targetId) console.error("[BO]", m);
        setDbg((d) => (d + `\n${m}`).slice(-1500));
        if (targetId) record[targetId] = byName[fullKey];
      }
      console.warn("[BO] final", JSON.stringify(record));
      setDbg((d) => (d + `\nFINAL ${JSON.stringify(record)}`).slice(-1500));
      if (editingId) {
        await table.setRecord(editingId, { fields: record } as any);
        Toast.success("Đã cập nhật!");
        setEditingId(null);
      } else {
        const code = strategyCode();
        // Chiến lược ID dùng chung mã với bảng 1 (Mã chiến lược) — không phụ thuộc record_id.
        await table.addRecord({ fields: record } as any);
        const validActions = actions.filter(a => a.hanhDong.trim());
        if (validActions.length > 0) {
          try {
            const tableActions = await bitable.base.getTableById(TABLE_ID_ACTIONS);
            const aMeta = await tableActions.getFieldMetaList();
            const aNameToId: Record<string, string> = {};
            for (const m of aMeta as any[]) aNameToId[m.name] = m.id;
            for (const a of validActions) {
              const rec: Record<string, unknown> = {};
              const setA = (fn: string, val: unknown) => {
                const id = aNameToId[fn];
                if (id && val != null) rec[id] = val;
              };
              setA("Hành động", a.hanhDong.trim());
              if (a.nguoi.trim()) setA("Người phụ trách", a.nguoi.trim());
              const ms = new Date(a.deadline).getTime();
              if (!isNaN(ms)) setA("Deadline", ms);
              setA("Chiến lược ID", code);
              await tableActions.addRecord({ fields: rec } as any);
            }
          } catch (aErr) {
            console.error("save actions error", aErr);
            Toast.error("Lưu hành động thất bại: " + ((aErr as any)?.message || String(aErr)));
          }
        }
        Toast.success("Đã lưu!");
      }
      setForm(EMPTY_FORM);
      setActions([]);
      await refreshRecords();
    } catch (e) {
      const errMsg = (e as Error)?.message || String(e);
      console.error("save form error", e);
      setDbg((d) => (d + `\nSAVE_ERR ${errMsg}`).slice(-1500));
      Toast.error("Lưu thất bại: " + errMsg);
    } finally {
      setSaving(false);
    }
  };

  const beginEdit = (row: IRecordRow) => {
    setEditingId(row.record_id);
    setForm({
      chiSo: row.chiSo || "",
      ngayBatDau: row.ngayBatDau || "",
      nguyenNhan: row.nguyenNhan || "",
      keHoach: row.keHoach || "",
    });
    setPanelOpen(true);
    setSheetOpen(false);
    window.setTimeout(() => {
      document.querySelector(".config-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  };

  const updateConfig = (res: any) => {
    const { customConfig } = res;
    if (customConfig) {
      const next = customConfig as IPreviewConfig;
      setConfig(next);
      setInputValue(next.url || "");
      setTimeout(() => dashboard.setRendered(), 1000 * 3);
      return;
    }
    if (DEFAULT_URL) {
      setTimeout(() => dashboard.setRendered(), 1000 * 3);
    }
  };

  useConfig(updateConfig);

  const debounceSetConfig = useCallback(
    debounce((value: string) => {
      setConfig(prev => ({ ...prev, url: value }));
    }, 500),
    []
  );

  useEffect(() => {
    debounceSetConfig(inputValue);
  }, [inputValue, debounceSetConfig]);

  function saveConfig() {
    dashboard.saveConfig({ customConfig: config, dataConditions: [] } as any);
  }

  const isUrlValid = useMemo(() => {
    try { new URL(config.url); return true; } catch { return false; }
  }, [config.url]);

  const set = (k: keyof IFeedbackForm) => (v: any) => setForm(prev => ({ ...prev, [k]: v || "" }));

  const activeLabel = TABS.find(x => x.key === activeTab)?.label || "";
  const [idsOpen, setIdsOpen] = useState(false);
  const elapsed = meeting ? Object.values(meeting.tabMs).reduce((a, b) => a + b, 0) : 0;
  const fmt = (ms: number) => { const s = Math.floor(ms / 1000); return `${String(Math.floor(s / 3600)).padStart(2, "0")}:${String(Math.floor(s / 60) % 60).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`; };

  useEffect(() => {
    setIdsForm(form => ({ ...form, scope: activeLabel }));
  }, [activeLabel]);

  useEffect(() => {
    if (!meeting) return;
    const id = window.setInterval(() => {
      const now = Date.now();
      setMeeting(m => m ? { ...m, tabMs: m.paused ? m.tabMs : { ...m.tabMs, [activeTab]: (m.tabMs[activeTab] || 0) + now - m.lastTick }, lastTick: now } : m);
    }, 1000);
    return () => window.clearInterval(id);
  }, [Boolean(meeting), activeTab]);

  const saveIds = async () => {
    if (!idsForm.identify.trim()) { Toast.warning("Nhập vấn đề cần xử lý"); return; }
    setIdsSaving(true);
    try {
      const table = await bitable.base.getTableById(TABLE_ID_IDS);
      const meta = await table.getFieldMetaList();
      const ids: Record<string, unknown> = {};
      const values: Record<string, unknown> = { "Meeting ID": idsForm.meetingId.trim() || (meeting?.id ?? ""), Identify: idsForm.identify.trim(), Discuss: idsForm.discuss.trim(), Solution: idsForm.solution.trim(), "Phạm vi": idsForm.scope, "Trạng thái": idsForm.status, "Mã IDS": `IDS-${Date.now()}`, "Ngày họp": Date.now() };
      for (const f of meta as any[]) if (values[f.name] !== undefined) ids[f.id] = values[f.name];
      await table.addRecord({ fields: ids } as any);
      const validActions = idsActions.filter(a => a.hanhDong.trim());
      if (validActions.length) {
        const actionTable = await bitable.base.getTableById(TABLE_ID_ACTIONS);
        const actionMeta = await actionTable.getFieldMetaList();
        const byName = Object.fromEntries((actionMeta as any[]).map(f => [f.name, f.id]));
        for (const action of validActions) {
          const fields: Record<string, unknown> = {};
          const put = (name: string, value: unknown) => { if (byName[name] && value !== "") fields[byName[name]] = value; };
          put("Hành động", action.hanhDong.trim()); put("Người phụ trách", action.nguoi.trim()); put("Nguồn", "IDS"); put("Mã nguồn", values["Mã IDS"]);
          const deadline = new Date(action.deadline).getTime(); if (!isNaN(deadline)) put("Deadline", deadline);
          await actionTable.addRecord({ fields } as any);
        }
      }
      Toast.success("Đã lưu IDS");
      setIdsForm({ meetingId: meeting?.id ?? "", identify: "", discuss: "", solution: "", scope: activeLabel, status: "Mở" });
      setIdsActions([]);
    } catch (e) { Toast.error("Lưu IDS thất bại: " + ((e as Error).message || String(e))); }
    finally { setIdsSaving(false); }
  };

  const finishMeeting = async () => {
    if (!meeting) return;
    try {
      const table = await bitable.base.getTableById(TABLE_ID_MEETING_LOG);
      const meta = await table.getFieldMetaList();
      const values: Record<string, unknown> = { "Meeting ID": meeting.id, "Bắt đầu": meeting.started, "Kết thúc": Date.now(), "Tổng thời lượng": Math.round(elapsed / 1000), "Chi tiết tab": Object.entries(meeting.tabMs).map(([k, v]) => `${TABS.find(t => t.key === k)?.label || k}: ${fmt(v)}`).join(" | ") };
      const fields: Record<string, unknown> = {};
      for (const f of meta as any[]) if (values[f.name] !== undefined) fields[f.id] = values[f.name];
      await table.addRecord({ fields } as any);
      Toast.success("Đã lưu nhật ký họp");
    } catch (e) { Toast.error("Lưu nhật ký thất bại: " + ((e as Error).message || String(e))); }
    setMeeting(null);
  };

  useEffect(() => {
    const pending = TABS.filter(tab => !mountedTabs.has(tab.key));
    if (!pending.length) return;
    const timer = window.setTimeout(() => {
      setMountedTabs(prev => new Set(prev).add(pending[0].key));
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [mountedTabs]);

  const selectTab = (key: string) => {
    setMountedTabs(prev => new Set(prev).add(key));
    setActiveTab(key);
  };

  return (
    <main style={{ backgroundColor: bgColor }} className="app-main">
      {/* Vertical tab rail */}
      <Nav
        className="side-nav"
        style={{ width: 60 }}
        selectedKeys={[activeTab]}
        onSelect={(e: any) => selectTab(String(e.itemKey))}
        items={TABS.map(x => ({ itemKey: x.key, text: x.label, icon: x.icon }))}
      />

      {/* Main content */}
      <div className="content-wrap">
        <div className="panel-title meeting-header"><strong>{activeLabel || "Dashboard"}</strong>
          <div className="meeting-controls">
            <Typography.Text strong>{meeting ? `${meeting.paused ? "Tea break" : "Đang họp"} · ${fmt(elapsed)}` : ""}</Typography.Text>
            {!meeting ? <Button theme="solid" type="primary" icon={<IconPlay />} onClick={() => { const now = Date.now(); const id = `MEET-${now}`; setMeeting({ id, started: now, paused: false, tabMs: {}, lastTick: now }); setIdsForm(x => ({ ...x, meetingId: id })); }}>Bắt đầu họp</Button> : <Space><Button icon={<IconPause />} onClick={() => setMeeting(m => m ? { ...m, paused: !m.paused, lastTick: Date.now() } : m)}>{meeting.paused ? "Tiếp tục" : "Tea break"}</Button><Button type="danger" icon={<IconStop />} onClick={finishMeeting}>Kết thúc</Button></Space>}
          </div>
        </div>
        <div className="tabs-stage">
          {TABS.map((tab) => {
            const url = TAB_BI_URL[tab.key] || DEFAULT_BI_URL;
            const active = tab.key === activeTab;
            if (!url || !mountedTabs.has(tab.key)) return null;
            return (
              <div key={tab.key} className={`tab-pane ${active ? "active" : ""}`}>
                {!loadedTabs[tab.key] && (
                  <div className="tab-loading">
                    <Spin />
                    <span>Đang tải {tab.label}…</span>
                  </div>
                )}
                <iframe
                  className={`bi-frame ${loadedTabs[tab.key] ? "loaded" : ""}`}
                  src={url}
                  title={`Dashboard ${tab.label}`}
                  onLoad={() => setLoadedTabs(prev => ({ ...prev, [tab.key]: true }))}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Read + Input side panel */}
      {idsOpen && (
      <div className="config-panel ids-panel">
        <div className="panel-row"><div className="panel-title"><strong>IDS</strong></div></div>
        <Form className="form">
          <div className="form-item"><Form.Label className="label">Identify — Vấn đề</Form.Label><TextArea value={idsForm.identify} onChange={v => setIdsForm(x => ({ ...x, identify: v }))} autosize placeholder="Vấn đề cần xử lý trong giao ban" className="input" /></div>
          <div className="form-item"><Form.Label className="label">Discuss — Thảo luận</Form.Label><TextArea value={idsForm.discuss} onChange={v => setIdsForm(x => ({ ...x, discuss: v }))} autosize placeholder="Dữ kiện, nguyên nhân, trao đổi" className="input" /></div>
          <div className="form-item"><Form.Label className="label">Solution — Giải pháp</Form.Label><TextArea value={idsForm.solution} onChange={v => setIdsForm(x => ({ ...x, solution: v }))} autosize placeholder="Giải pháp/quyết định chốt" className="input" /></div>
          <div className="form-item"><Form.Label className="label">Phạm vi</Form.Label><div className="phongban-chip" style={{ backgroundColor: (TABS.find(x => x.key === activeTab)?.color || "#6b7280") + "22", color: TABS.find(x => x.key === activeTab)?.color || "#6b7280", borderColor: TABS.find(x => x.key === activeTab)?.color || "#6b7280" }}>{activeLabel}</div></div>
          <div className="form-item"><Form.Label className="label">Trạng thái</Form.Label><Select value={idsForm.status} style={{ width: "100%" }} onChange={v => setIdsForm(x => ({ ...x, status: String(v) }))}><Select.Option value="Mở">Mở</Select.Option><Select.Option value="Đã chốt">Đã chốt</Select.Option><Select.Option value="Theo dõi">Theo dõi</Select.Option></Select></div>
          <div className="form-item"><Form.Label className="label">Hành động</Form.Label>{idsActions.map((a, i) => <div className="ids-action" key={i}><Input value={a.hanhDong} placeholder="Hành động" onChange={v => setIdsActions(xs => xs.map((x, n) => n === i ? { ...x, hanhDong: v } : x))} /><Input value={a.nguoi} placeholder="Người phụ trách" onChange={v => setIdsActions(xs => xs.map((x, n) => n === i ? { ...x, nguoi: v } : x))} /><DatePicker value={a.deadline || undefined} placeholder="Deadline" onChange={(v: any) => setIdsActions(xs => xs.map((x, n) => n === i ? { ...x, deadline: v ? String(v) : "" } : x))} style={{ width: "100%" }} /><Button icon={<IconDelete />} theme="borderless" type="danger" onClick={() => setIdsActions(xs => xs.filter((_, n) => n !== i))} /></div>)}<Button icon={<IconPlus />} theme="borderless" onClick={() => setIdsActions(xs => [...xs, { ...EMPTY_ACTION }])} block>Thêm hành động</Button></div>
        </Form>
        <Button type="primary" theme="solid" className="btn" loading={idsSaving} onClick={saveIds} block>Lưu IDS</Button>
      </div>
      )}
      {panelOpen && !idsOpen && (
      <div className="config-panel">
        <div className="panel-row">
          <div className="panel-title"><strong>Nhập phản hồi cửa hàng</strong></div>
          <Popover content="Danh sách phản hồi đã nhập">
            <Button icon={<IconRefresh />} onClick={() => { setSheetOpen(true); refreshRecords(); }} theme="borderless" />
          </Popover>
        </div>

        {editingId && (
          <Typography.Text type="warning" style={{ fontSize: 12 }}>
            Đang cập nhật #{editingId.slice(-6)} — nhấn lưu để cập nhật.
          </Typography.Text>
        )}

        <Form className="form">
          <div className="form-item">
            <Form.Label className="label">Chỉ số (KPI)</Form.Label>
            <Select
              value={form.chiSo || undefined}
              placeholder="Chọn chỉ số KPI"
              onChange={(v: any) => setForm(prev => ({ ...prev, chiSo: v ? String(v) : "" }))}
              className="input"
              style={{ width: "100%" }}
              filter
            >
              {(activeTab === "dichvu" ? SERVICE_KPI_GROUPS : KPI_GROUPS).map(g => (
                <Select.OptGroup key={g.label} label={g.label}>
                  {g.options.map(o => (
                    <Select.Option key={o.value} value={o.value}>{o.label}</Select.Option>
                  ))}
                </Select.OptGroup>
              ))}
            </Select>
          </div>
          <div className="form-item">
            <Form.Label className="label">Ngày bắt đầu</Form.Label>
            <DatePicker
              format="dd/MM/yyyy"
              value={form.ngayBatDau || undefined}
              onChange={(d: any) => setForm(prev => ({ ...prev, ngayBatDau: d ? String(d) : "" }))}
              className="input"
              style={{ width: "100%" }}
            />
          </div>
          <div className="form-item">
            <Form.Label className="label">Lĩnh vực / Loại</Form.Label>
            <div className="phongban-chip" style={{ backgroundColor: (TABS.find(x => x.key === activeTab)?.color || "#6b7280") + "22", color: TABS.find(x => x.key === activeTab)?.color || "#6b7280", borderColor: TABS.find(x => x.key === activeTab)?.color || "#6b7280" }}>
              {activeLabel}
            </div>
          </div>
          <div className="form-item">
            <Form.Label className="label">Nguyên nhân</Form.Label>
            <TextArea value={form.nguyenNhan} placeholder="Tại sao ra chỉ số này?" onChange={set("nguyenNhan")} className="input" autosize />
          </div>
          <div className="form-item">
            <Form.Label className="label">Kế hoạch thực hiện</Form.Label>
            <TextArea value={form.keHoach} placeholder="Sẽ làm gì để cải thiện / duy trì" onChange={set("keHoach")} className="input" autosize />
          </div>
          <div className="form-item">
            <Form.Label className="label">Hành động</Form.Label>
            {actions.map((a, idx) => (
              <div key={idx} style={{ border: "1px solid #e5e6eb", borderRadius: 6, padding: 8, marginBottom: 8, background: "#fafafa" }}>
                <Space style={{ width: "100%", marginBottom: 8 }} align="center">
                  <Typography.Text strong style={{ fontSize: 12 }}>Hành động {idx + 1}</Typography.Text>
                  <Button size="small" icon={<IconDelete />} theme="borderless" type="danger" onClick={() => setActions(prev => prev.filter((_, i) => i !== idx))} />
                </Space>
                <div style={{ display: "grid", gap: 6, gridTemplateColumns: "1fr", marginBottom: 6 }}>
                  <Input placeholder="Nội dung hành động" value={a.hanhDong} onChange={e => setActions(prev => prev.map((x, i) => i === idx ? { ...x, hanhDong: e } : x))} />
                  <Input placeholder="Ai thực hiện" value={a.nguoi} onChange={e => setActions(prev => prev.map((x, i) => i === idx ? { ...x, nguoi: e } : x))} />
                  <DatePicker
                    placeholder="Deadline"
                    value={a.deadline || undefined}
                    onChange={(d: any) => setActions(prev => prev.map((x, i) => i === idx ? { ...x, deadline: d ? String(d) : "" } : x))}
                    style={{ width: "100%" }}
                  />
                </div>
              </div>
            ))}
            <Button size="small" icon={<IconPlus />} theme="borderless" onClick={() => setActions(prev => [...prev, { ...EMPTY_ACTION }])} style={{ width: "100%" }}>
              ＋ Thêm hành động
            </Button>
          </div>
        </Form>

        <Button type="primary" theme="solid" className="btn" loading={saving} onClick={saveForm} block>
          {editingId ? "Cập nhật phản hồi" : "Lưu phản hồi"}
        </Button>

        {editingId && (
          <Button type="tertiary" theme="light" className="btn" block onClick={() => { setEditingId(null); setForm(EMPTY_FORM); }}>
            Hủy cập nhật
          </Button>
        )}

        {isConfig && (
          <div className="form-item">
            <Form.Label className="label">Embed URL</Form.Label>
            <Input value={inputValue} placeholder={t("placeholder.link")} onChange={setInputValue} className="input" />
            <Button type="tertiary" theme="solid" className="btn" onClick={saveConfig} style={{ marginTop: 8 }}>
              Lưu URL
            </Button>
          </div>
        )}
      </div>
      )}

      {/* Toggle side panel button */}
      <div style={{ flex: "none", display: "flex", flexDirection: "column", justifyContent: "flex-start", paddingTop: 8, borderLeft: "var(--line-color) 1px solid" }}>
        <Popover content={idsOpen ? "Đóng IDS" : "Mở IDS"}>
          <Button icon={<IconList />} onClick={() => setIdsOpen(o => !o)} theme="borderless" />
        </Popover>
        <Popover content={panelOpen ? "Ẩn bảng nhập" : "Hiện bảng nhập"}>
          <Button icon={<IconSidebar />} onClick={() => setPanelOpen(o => !o)} theme="borderless" />
        </Popover>
      </div>

      {/* Records sheet: list + edit/update */}
      <SideSheet
        title={`Danh sách phản hồi (${records.length})`}
        visible={sheetOpen}
        onCancel={() => setSheetOpen(false)}
        width={480}
        footer={null}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {records.length === 0 && <Typography.Text type="tertiary">Chưa có phản hồi nào.</Typography.Text>}
          {records.map((r) => (
            <div key={r.record_id} style={{ border: "1px solid var(--line-color)", borderRadius: 8, padding: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Typography.Text strong>{r.chiSo || "(không có chỉ số)"}</Typography.Text>
                <Button size="small" icon={<IconEdit />} onClick={() => beginEdit(r)} theme="borderless">
                  Sửa
                </Button>
              </div>
              {r.lenLop && <Typography.Text type="tertiary" style={{ fontSize: 12 }}>{r.lenLop}</Typography.Text>}
              <div><Typography.Text type="secondary" style={{ fontSize: 12 }}>{r.nguyenNhan || "—"}</Typography.Text></div>
              <div><Typography.Text type="secondary" style={{ fontSize: 12 }}>{r.keHoach || ""}</Typography.Text></div>
              <div><Typography.Text type="tertiary" style={{ fontSize: 12 }}>{r.lenLop ? `🔄 ${r.lenLop}` : ""}</Typography.Text></div>
            </div>
          ))}
        </div>
      </SideSheet>
    </main>
  );
}

export default App;
