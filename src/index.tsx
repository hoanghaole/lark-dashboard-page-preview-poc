import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { initI18n } from './locales/i18n'
import { bitable } from '@lark-base-open/js-sdk'
import { Spin, LocaleProvider } from '@douyinfe/semi-ui'
import vi_VN from '@douyinfe/semi-ui/lib/es/locale/source/vi_VN'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <LoadApp />
)

function LoadApp() {
    const [load, setLoad] = useState(false);
    useEffect(() => {
        let cancelled = false;
        const done = () => { if (!cancelled) setLoad(true); };
        bitable.bridge.getLanguage().then((lang) => {
            return initI18n(lang as any);
        }).then(done).catch((e) => {
            console.log('getLanguage error', e);
            done(); // fallback: render app even outside Lark runtime
        });
        // Hard timeout: never leave the UI stuck on the spinner (e.g. running
        // outside the Lark dashboard runtime where the bridge never resolves).
        const t = setTimeout(done, 2500);
        return () => { cancelled = true; clearTimeout(t); };
    }, [])

    if (load) {
        return (
            <LocaleProvider locale={vi_VN}>
                <App />
            </LocaleProvider>
        )
    }
    return <Spin />
}
