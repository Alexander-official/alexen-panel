// The live brand name, used by the i18n "brand" post-processor to replace the
// built-in product name in every translated string (white-label). Kept here with
// no imports so i18n.ts can read it without a circular dependency.
let current = "Alexen";

export const getBrandName = (): string => current;

export const setBrandName = (name?: string): boolean => {
  const next = (name || "").trim() || "Alexen";
  if (next === current) return false;
  current = next;
  return true; // changed — the caller refreshes i18n so strings re-render
};
