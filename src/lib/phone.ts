/** Format validation only: this cannot establish ownership or WhatsApp availability. */
export const normalizeMobilePhone = (value: string): string | null => {
  const trimmed = value.trim();
  if (!/^\+?[0-9 ()-]+$/.test(trimmed)) return null;
  const digits = trimmed.replace(/\D/g, "");
  if (/^07\d{8}$/.test(digits)) return `+94${digits.slice(1)}`;
  if (/^947\d{8}$/.test(digits)) return `+${digits}`;
  return null;
};

export const PHONE_ERROR = "Enter a 10-digit Sri Lankan mobile number starting with 07";