import { useTranslation } from "react-i18next";
import { dashboard, DashboardState, bitable, IFieldMeta } from "@lark-base-open/js-sdk";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Button, Input, Space, Form, Typography, TextArea, DatePicker, Toast, SideSheet, Nav, Popover, Select } from "@douyinfe/semi-ui";
import IconCustomerSupport from "@douyinfe/semi-icons/lib/es/icons/IconCustomerSupport";
import { IconHome, IconServer, IconComment, IconUser, IconRefresh, IconEdit, IconDelete, IconSidebar, IconSetting, IconCoinMoney } from "@douyinfe/semi-icons";
import { useTheme, useConfig } from "./hooks/index";
import '@lark-base-open/js-sdk/dist/style/dashboard.css';
import "./App.scss";
import classnames from "classnames";
import { debounce } from "lodash";

interface IPreviewConfig {
  url: string;
}

const DEFAULT_BI_URL = "https://app.powerbi.com/view?r=eyJrIjoiNzkyMzE5MmMtZjkyYi00M2JjLTlhNTQtMzI2NTk0YWFjZDUxIiwidCI6ImM0YzU5OTA3LWJlOGItNGIyYS1iMjI2LTgyZmE5MjIzZDc0MiIsImMiOjEwfQ%3D%3D";

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
  { key: "kinhdoanh", label: "Kinh doanh", icon: <IconHome /> },
  { key: "dichvu", label: "Dịch vụ", icon: <IconServer /> },
  { key: "cr", label: "CR", icon: <IconCustomerSupport /> },
  { key: "mkt", label: "MKT", icon: <IconComment /> },
  { key: "hr", label: "HR", icon: <IconUser /> },
  { key: "ketoan", label: "Kế toán", icon: <IconCoinMoney /> },
  { key: "hethong", label: "Hệ thống", icon: <IconSetting /> },
];

const KPI_GROUPS: { label: string; options: { value: string; label: string }[] }[] = [
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

interface IFeedbackForm {
  chiSo: string;
  ngayBatDau: string;
  nguyenNhan: string;
  keHoach: string;
  nguoiPhuTrach: string;
  deadline: string;
}

interface IRecordRow {
  record_id: string;
  chiSo: string;
  ngayBatDau: string;
  nguyenNhan: string;
  keHoach: string;
  nguoiPhuTrach: string;
  deadline: string;
  lenLop: string;
}

const EMPTY_FORM: IFeedbackForm = { chiSo: "", ngayBatDau: "", nguyenNhan: "", keHoach: "", nguoiPhuTrach: "", deadline: "" };

function App() {
  const { bgColor } = useTheme();

  const [config, setConfig] = useState<IPreviewConfig>({ url: DEFAULT_URL });
  const [panelOpen, setPanelOpen] = useState(true);
  const [inputValue, setInputValue] = useState(DEFAULT_URL);
  const [saving, setSaving] = useState(false);
  const [fields, setFields] = useState<IFieldMeta[]>([]);
  const [activeTab, setActiveTab] = useState("kinhdoanh");
  const [form, setForm] = useState<IFeedbackForm>(EMPTY_FORM);
  const [records, setRecords] = useState<IRecordRow[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dbg, setDbg] = useState<string>("");

  const isCreate = dashboard.state === DashboardState.Create;
  const isConfig = dashboard.state === DashboardState.Config || isCreate;

  const { t } = useTranslation();

  const refreshRecords = useCallback(async () => {
    try {
      const table = await bitable.base.getTableById(TABLE_ID);
      const res = await table.getRecords({ pageSize: 200, sort: [{ field_name: "Thời gian nhập", desc: true }] } as any);
      const rows: IRecordRow[] = [];
      for (const r of (res as any)?.records || []) {
        const g = (fn: string) => {
          const f = (fields as any[]).find((x: any) => x.name === fn);
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
          nguoiPhuTrach: g("Người phụ trách (tên)"),
          deadline: g("Deadline"),
          lenLop: g("Đã cập nhật"),
        });
      }
      setRecords(rows);
    } catch (e) {
      console.warn("refreshRecords error", e);
    }
  }, [fields]);

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
    if (form.nguoiPhuTrach.trim()) record["Người phụ trách (tên)"] = form.nguoiPhuTrach.trim();
    if (form.deadline) {
      const ms = new Date(form.deadline).getTime();
      if (!isNaN(ms)) record["Deadline"] = ms;
    }
    return record;
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
        await table.addRecord({ fields: record } as any);
        Toast.success("Đã lưu!");
      }
      setForm(EMPTY_FORM);
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
      nguoiPhuTrach: row.nguoiPhuTrach || "",
      deadline: row.deadline || "",
    });
    setSheetOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteRecord = async (row: IRecordRow) => {
    try {
      const table = await bitable.base.getTableById(TABLE_ID);
      await table.deleteRecord?.(row.record_id);
      await refreshRecords();
      Toast.success("Đã xóa");
    } catch (e) {
      console.error("delete error", e);
      Toast.error("Xóa thất bại: " + (e as Error).message);
    }
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

  const currentUrl = isUrlValid ? config.url : "";

  const set = (k: keyof IFeedbackForm) => (v: any) => setForm(prev => ({ ...prev, [k]: v || "" }));

  const activeLabel = TABS.find(x => x.key === activeTab)?.label || "";

  return (
    <main style={{ backgroundColor: bgColor }} className="app-main">
      {/* Vertical tab rail */}
      <Nav
        className="side-nav"
        style={{ width: 56 }}
        selectedKeys={[activeTab]}
        onSelect={(e: any) => setActiveTab(String(e.itemKey))}
        items={TABS.map(x => ({ itemKey: x.key, icon: x.icon }))}
      />

      {/* Main content */}
      <div className="content-wrap">
        <div className="panel-title"><strong>{activeLabel}</strong></div>
        {currentUrl ? (
          <iframe className="container" src={currentUrl} title="Dashboard page preview" />
        ) : (
          <center className="container">
            <Space vertical>
              <span className="url-empty">{t("placeholder.urlEmpty")}</span>
            </Space>
          </center>
        )}
      </div>

      {/* Read + Input side panel */}
      {panelOpen && (
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
              {KPI_GROUPS.map(g => (
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
              value={form.ngayBatDau || undefined}
              onChange={(d: any) => setForm(prev => ({ ...prev, ngayBatDau: d ? String(d) : "" }))}
              className="input"
              style={{ width: "100%" }}
            />
          </div>
          <div className="form-item">
            <Form.Label className="label">Lĩnh vực / Loại</Form.Label>
            <Input value={activeLabel} disabled className="input" />
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
            <Form.Label className="label">Người phụ trách</Form.Label>
            <Input value={form.nguoiPhuTrach} placeholder="Tên người làm" onChange={set("nguoiPhuTrach")} className="input" />
          </div>
          <div className="form-item">
            <Form.Label className="label">Deadline</Form.Label>
            <DatePicker value={form.deadline || undefined} onChange={(d) => setForm(prev => ({ ...prev, deadline: d ? String(d) : "" }))} className="input" style={{ width: "100%" }} />
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
                <Space>
                  <Button size="small" icon={<IconEdit />} onClick={() => beginEdit(r)} theme="borderless" />
                  <Button size="small" icon={<IconDelete />} onClick={() => deleteRecord(r)} theme="borderless" type="danger" />
                </Space>
              </div>
              {r.lenLop && <Typography.Text type="tertiary" style={{ fontSize: 12 }}>{r.lenLop}</Typography.Text>}
              <div><Typography.Text type="secondary" style={{ fontSize: 12 }}>{r.nguyenNhan || "—"}</Typography.Text></div>
              <div><Typography.Text type="secondary" style={{ fontSize: 12 }}>{r.keHoach || ""}</Typography.Text></div>
              <div><Typography.Text type="tertiary" style={{ fontSize: 12 }}>{r.nguoiPhuTrach ? `👤 ${r.nguoiPhuTrach}` : ""}{r.deadline ? `  📅 ${r.deadline}` : ""}</Typography.Text></div>
            </div>
          ))}
        </div>
      </SideSheet>
    </main>
  );
}

export default App;
