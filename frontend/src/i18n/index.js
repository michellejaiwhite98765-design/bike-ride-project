import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import { LANGUAGES, RTL_LANGUAGES } from "./languages.js";

const STORAGE_KEY = "bikeride_lang";
const supported = LANGUAGES.map((l) => l.code);

// Every other language is loaded only when picked (keeps the first load small).
const loaders = import.meta.glob("./locales/*.json", { import: "default" });

function applyDocumentLanguage(lng) {
  document.documentElement.lang = lng;
  document.documentElement.dir = RTL_LANGUAGES.includes(lng) ? "rtl" : "ltr";
}

/** Switch the app language: loads its strings, remembers it on this device. */
export async function setLanguage(lng) {
  const code = supported.includes(lng) ? lng : "en";
  if (!i18n.hasResourceBundle(code, "translation")) {
    const load = loaders[`./locales/${code}.json`];
    if (load) i18n.addResourceBundle(code, "translation", await load(), true, true);
  }
  await i18n.changeLanguage(code);
  localStorage.setItem(STORAGE_KEY, code);
  applyDocumentLanguage(code);
  return code;
}

i18n.use(initReactI18next).init({
  resources: { en: { translation: en } },
  lng: "en",
  fallbackLng: "en", // any string not translated yet shows in English
  supportedLngs: supported,
  interpolation: { escapeValue: false },
});

// Last language used on this device (before sign-in, or until the profile loads).
const saved = localStorage.getItem(STORAGE_KEY);
if (saved && saved !== "en") setLanguage(saved);
else applyDocumentLanguage("en");

export default i18n;
