import { Href } from "expo-router";

const INTERNAL_HOSTS = new Set([
  "tasksuite.co",
  "www.tasksuite.co",
  "task-manager-psi-lake.vercel.app",
  "localhost",
  "127.0.0.1",
]);

function normalizePathname(pathname: string) {
  if (!pathname) return "/";
  return pathname.startsWith("/") ? pathname : `/${pathname}`;
}

export function resolveInternalHref(rawHref: string): Href | null {
  const normalized = String(rawHref || "").trim();
  if (!normalized) return null;

  try {
    const url = normalized.startsWith("http://") || normalized.startsWith("https://")
      ? new URL(normalized)
      : new URL(normalized, "https://tasksuite.co");

    if (url.origin !== "https://tasksuite.co" && !INTERNAL_HOSTS.has(url.hostname)) {
      return null;
    }

    const pathname = normalizePathname(url.pathname);

    if (pathname === "/") return "/" as Href;
    if (pathname === "/home") return "/dashboard" as Href;
    if (pathname === "/teams") return "/(tabs)/teams" as Href;
    if (pathname === "/profile") return "/(tabs)/profile" as Href;
    if (pathname === "/tasks" || pathname === "/remote-work") return "/(tabs)/remote-work" as Href;

    const joinMatch = pathname.match(/^\/join\/([^/]+)$/i);
    if (joinMatch) {
      return { pathname: "/join/[teamId]", params: { teamId: joinMatch[1] } } as Href;
    }

    const teamMatch = pathname.match(/^\/teams\/([^/]+)$/i);
    if (teamMatch) {
      return { pathname: "/team/[teamId]", params: { teamId: teamMatch[1] } } as Href;
    }
  } catch {
    return null;
  }

  return null;
}
