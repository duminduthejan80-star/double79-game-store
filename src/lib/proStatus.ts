export function calculateProStatus(expiresAt: string | null, now = Date.now()) {
  const isLifetime = expiresAt === "infinity";
  const expiry = expiresAt ? new Date(expiresAt).getTime() : 0;
  const isPro = isLifetime || expiry > now;
  return {
    isPro,
    isLifetime,
    expiresAt,
    daysLeft: isPro && !isLifetime ? Math.ceil((expiry - now) / 86400000) : 0,
  };
}