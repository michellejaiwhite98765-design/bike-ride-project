import { useState } from "react";
import { App, Modal, Select } from "antd";
import { CheckOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { LANGUAGES } from "../i18n/languages.js";
import { setLanguage } from "../i18n/index.js";
import { userService } from "../services/userService.js";
import { useAuth } from "../context/AuthContext.jsx";

const label = (l) => (l.code === "en" ? "English" : `${l.native} · ${l.name}`);

/**
 * Language dropdown for forms (sign-up). Picking one switches the app right
 * away, so the rest of the form is already in that language.
 */
export function LanguageSelect({ value, onChange, ...rest }) {
  return (
    <Select
      showSearch
      size="large"
      value={value}
      onChange={(code) => {
        setLanguage(code);
        onChange?.(code);
      }}
      optionFilterProp="search"
      options={LANGUAGES.map((l) => ({ value: l.code, label: label(l), search: `${l.name} ${l.native}` }))}
      {...rest}
    />
  );
}

/** Profile menu: list of languages; saves the choice to the account. */
export function LanguageSheet({ open, onClose }) {
  const { t, i18n } = useTranslation();
  const { user, setUser } = useAuth();
  const { notification } = App.useApp();
  const [saving, setSaving] = useState(null);

  async function pick(code) {
    if (code === i18n.language) return onClose();
    setSaving(code);
    try {
      await setLanguage(code);
      if (user) {
        const updated = await userService.updateProfile({ language: code });
        setUser(updated?.id ? updated : { ...user, language: code });
      }
      // i18n.t: `t` from this render is still the old language.
      notification.success({ title: i18n.t("lang.updated") });
      onClose();
    } catch (err) {
      notification.error({ title: t("lang.choose"), description: err.message });
    } finally {
      setSaving(null);
    }
  }

  return (
    <Modal open={open} onCancel={onClose} footer={null} centered width={420} title={t("lang.choose")} className="lang-sheet">
      <div className="lang-list" role="listbox">
        {LANGUAGES.map((l) => {
          const on = l.code === i18n.language;
          return (
            <button key={l.code} type="button" role="option" aria-selected={on} className={`lang-opt${on ? " on" : ""}`} onClick={() => pick(l.code)} disabled={Boolean(saving)}>
              <span className="lang-native" lang={l.code}>{l.native}</span>
              <span className="lang-en">{l.name}</span>
              {on && <CheckOutlined className="lang-check" />}
              {saving === l.code && <span className="lang-saving">…</span>}
            </button>
          );
        })}
      </div>
      <style>{`
        .lang-sheet .ant-modal-container,.lang-sheet .ant-modal-content{background:var(--bg-secondary,#111827)!important;backdrop-filter:none}
        .lang-list{display:flex;flex-direction:column;gap:6px;max-height:60vh;overflow-y:auto;margin:0 -4px;padding:0 4px}
        .lang-opt{display:flex;align-items:center;gap:10px;width:100%;padding:12px 14px;border-radius:12px;border:1px solid var(--chrome-border);background:transparent;color:var(--text-primary);cursor:pointer;text-align:start;font-size:15px}
        .lang-opt:hover{background:var(--chrome-tint)}
        .lang-opt.on{border-color:#2DD4BF;background:rgba(45,212,191,.1)}
        .lang-native{font-weight:700;flex:1}
        .lang-en{color:var(--text-secondary);font-size:13px}
        .lang-check{color:#2DD4BF}
      `}</style>
    </Modal>
  );
}
