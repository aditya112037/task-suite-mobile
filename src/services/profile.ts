import { apiRequest } from "@/services/api";
import { normalizeProfile, type ProfileSummary } from "@/services/contracts";

export async function getProfile() {
  const payload = await apiRequest<Record<string, unknown>>("/api/auth/profile", {
    auth: true,
  });

  return normalizeProfile(payload);
}

export type { ProfileSummary };
