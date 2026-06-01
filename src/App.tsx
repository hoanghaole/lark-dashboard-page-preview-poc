import { useTranslation } from "react-i18next";
import { dashboard, DashboardState } from "@lark-base-open/js-sdk";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Button, Input, Image, Space, Form, Typography } from "@douyinfe/semi-ui";
import { useTheme, useConfig } from "./hooks/index";
import '@lark-base-open/js-sdk/dist/style/dashboard.css';
import "./App.scss";
import classnames from "classnames";
import { debounce } from "lodash";

interface IPreviewConfig {
  url: string;
}

const DEFAULT_URL = (() => {
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get("url") || "";
  } catch {
    return "";
  }
})();

function App() {
  const { bgColor } = useTheme();

  const [config, setConfig] = useState<IPreviewConfig>({
    url: DEFAULT_URL,
  });

  const [inputValue, setInputValue] = useState(DEFAULT_URL);

  const isCreate = dashboard.state === DashboardState.Create;
  const isConfig = dashboard.state === DashboardState.Config || isCreate;

  const { t } = useTranslation();

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
      setConfig(prev => ({
        ...prev,
        url: value,
      }));
    }, 500),
    []
  );

  useEffect(() => {
    debounceSetConfig(inputValue);
  }, [inputValue, debounceSetConfig]);

  function saveConfig() {
    dashboard.saveConfig({
      customConfig: config,
      dataConditions: [],
    } as any);
  }

  const isUrlValid = useMemo(() => {
    try {
      new URL(config.url);
      return true;
    } catch (e) {
      return false;
    }
  }, [config.url]);

  const currentUrl = isUrlValid ? config.url : "";

  return (
    <main style={{ backgroundColor: bgColor }} className={classnames({ "main-config": isConfig, main: true })}>
      <div className="content">
        {currentUrl ? (
          <iframe className="container" src={currentUrl} title="Dashboard page preview" />
        ) : (
          <center className="container">
            <Space vertical>
              <Image src="./empty.svg" preview={false} />
              <span className="url-empty">{t("placeholder.urlEmpty")}</span>
              <Typography.Text type="tertiary">Add ?url=https://example.com for standalone preview.</Typography.Text>
            </Space>
          </center>
        )}
      </div>
      {isConfig && (
        <div className="config-panel">
          <Form className="form">
            <div className="form-item">
              <Form.Label className="label">{t("label.link")}</Form.Label>
              <Input
                value={inputValue}
                placeholder={t("placeholder.link")}
                onChange={setInputValue}
                className="input"
              />
            </div>
          </Form>
          <Button type="primary" theme="solid" className="btn" onClick={saveConfig}>
            确定
          </Button>
        </div>
      )}
    </main>
  );
}

export default App;
