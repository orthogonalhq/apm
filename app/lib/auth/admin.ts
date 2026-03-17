const ADMIN_IDS = (process.env.ADMIN_PUBLISHER_IDS ?? "")
  .split(",")
  .map((id) => id.trim())
  .filter(Boolean);

export function isAdmin(publisherId: string): boolean {
  return ADMIN_IDS.includes(publisherId);
}
