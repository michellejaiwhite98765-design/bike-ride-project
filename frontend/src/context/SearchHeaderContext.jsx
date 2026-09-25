import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

// Lets a page (currently only SearchPage) hand its antd Form instance up to
// AppLayout so the header can render pickup/destination fields that write
// straight into that same form - no page ever holds two copies of this
// state, the header is just another view onto the one form instance.
const SearchHeaderContext = createContext(null);

export function SearchHeaderProvider({ children }) {
  const [form, setForm] = useState(null);
  const registerForm = useCallback((f) => setForm(f), []);
  const value = useMemo(() => ({ form, registerForm }), [form]);
  return <SearchHeaderContext.Provider value={value}>{children}</SearchHeaderContext.Provider>;
}

// Called by the page that owns the form (e.g. SearchPage) - registers it on
// mount, clears it on unmount so the header falls back to its normal
// content once the page navigates away.
export function useSearchHeaderRegistration(form) {
  const ctx = useContext(SearchHeaderContext);
  useEffect(() => {
    if (!ctx) return undefined;
    ctx.registerForm(form);
    return () => ctx.registerForm(null);
  }, [ctx, form]);
}

// Called by AppLayout's header to read whichever form is currently registered.
export function useSearchHeaderForm() {
  const ctx = useContext(SearchHeaderContext);
  return ctx?.form ?? null;
}
