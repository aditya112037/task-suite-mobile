import { apiRequest } from "@/services/api";
import { normalizeProfile, type ProfileSummary } from "@/services/contracts";

export async function getProfile() {
  const payload = await apiRequest<Record<string, unknown>>("/api/auth/profile", {
    auth: true,
  });

  return normalizeProfile(payload);
}

export async function updateProfilePhoto(base64DataUrl: string) {
  const payload = await apiRequest<Record<string, unknown>>("/api/auth/profile/photo", {
    method: "PUT",
    auth: true,
    body: JSON.stringify({ photo: base64DataUrl }),
  });

  return payload;
}

export type { ProfileSummary };
