import { getApps, initializeApp } from "firebase/app";
import { getDatabase, get, ref, set } from "firebase/database";
import { getAuth } from "firebase/auth";
import { firebaseConfig } from "@/lib/firebaseConfig";
import { normalizeGame, validateAppDownloadUrl } from "@/lib/storeData";

const app = getApps().find((a) => a.name === "double79-website") || initializeApp(firebaseConfig, "double79-website");
const gamesPath = import.meta.env.VITE_FIREBASE_GAMES_PATH || "games";
function database() {
  if (!firebaseConfig.databaseURL) throw new Error("Games පෙන්වීමට Firebase Realtime Database ලිපිනය සම්බන්ධ කළ යුතුයි.");
  return getDatabase(app, firebaseConfig.databaseURL);
}
export function adminAuth() {
  if (!firebaseConfig.apiKey) throw new Error("Admin ප්‍රවේශයට Firebase web app සැකසුම් සම්බන්ධ කළ යුතුයි.");
  return getAuth(app);
}
export async function readGames() {
  const snap = await get(ref(database(), gamesPath));
  const data: unknown = snap.val();
  if (!data || typeof data !== "object") return [];
  return Object.entries(data).map(([id, raw]) => normalizeGame(id, raw)).filter((g): g is NonNullable<typeof g> => g !== null).sort((a, b) => b.created_at.localeCompare(a.created_at));
}
export async function readGame(id: string) {
  if (/[.#$\[\]/]/.test(id)) return null;
  const snap = await get(ref(database(), `${gamesPath}/${id}`));
  return normalizeGame(id, snap.val());
}
export async function readAppDownloadUrl() {
  const snap = await get(ref(database(), "websiteSettings/appDownloadUrl"));
  return validateAppDownloadUrl(snap.val());
}
export async function saveAppDownloadUrl(value: string) {
  const url = validateAppDownloadUrl(value);
  if (!url) throw new Error("Google Drive link එක ඇතුළත් කරන්න.");
  const user = adminAuth().currentUser;
  if (!user) throw new Error("Admin ප්‍රවේශය අවශ්‍යයි.");
  const token = await user.getIdTokenResult(true);
  if (token.claims.admin !== true) throw new Error("මෙම ගිණුමට admin අවසර නැහැ.");
  await set(ref(database(), "websiteSettings/appDownloadUrl"), url);
  return url;
}
