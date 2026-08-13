import { apiRequest } from "@/services/api";
import {
  buildTaskCreateInitialValues,
  getDomainConfig,
  getDomainSuggestionMeta,
  inferTaskProfile,
  normalizeTaskDomain,
  summarizeDynamicFields,
} from "@/services/domain-intelligence";

export type GuidanceSuggestion = {
  id: string;
  label: string;
  detail: string;
  action: {
    type: string;
    value?: string;
    domain?: string;
    [key: string]: unknown;
  };
};

export type GuidanceResponse = {
  source: string;
  summary: string;
  suggestions: GuidanceSuggestion[];
  inferred?: ReturnType<typeof inferTaskProfile>;
  chart?: {
    title: string;
    values: { label: string; value: number; color: string; max?: number }[];
  };
};

type GuidanceContext = {
  title?: string;
  description?: string;
  dueDate?: string | null;
  status?: string;
  completionRate?: number;
  onTimeRate?: number;
  teamCount?: number;
  taskCount?: number;
  completedCount?: number;
  atRiskCount?: number;
  teamName?: string;
};

const cleanText = (value: unknown, max = 200) =>
  String(value || "").trim().slice(0, max);

const titleCase = (value: string) =>
  cleanText(value, 80)
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());

export function buildLocalTaskGuidance(context: GuidanceContext = {}): GuidanceResponse {
  const title = cleanText(context.title);
  const description = cleanText(context.description, 1000);
  const dueDate = cleanText(context.dueDate, 80);
  const inferred = inferTaskProfile(title || description);
  const suggestions: GuidanceSuggestion[] = [];

  if (!title) {
    const suggestedTitle = description
      ? description.split(/[.!?\n]/)[0].trim().slice(0, 120)
      : "Plan the next important step";
    suggestions.push({
      id: "task-title",
      label: "Give this task a clear outcome",
      detail: "Start with a verb and the result you want, such as Prepare the client review deck.",
      action: { type: "draft-title", value: suggestedTitle },
    });
  }
  if (!dueDate && title) {
    suggestions.push({
      id: "task-schedule",
      label: "Put a finish point on the calendar",
      detail: "Tasks with a finish point are easier to start and review.",
      action: { type: "suggest-calendar" },
    });
  }
  if (title && inferred.intent.domain !== "work" && inferred.intent.confidence >= 0.55) {
    const meta = getDomainSuggestionMeta(inferred.intent.domain, getDomainConfig(inferred.intent.domain).label);
    const fieldSummary = summarizeDynamicFields(inferred.intent.domain, inferred.dynamicFields).join(" · ");
    suggestions.push({
      id: "task-domain",
      label: `Use ${titleCase(inferred.intent.domain)} guidance fields`,
      detail: fieldSummary
        ? `${meta.subtitle} I picked up ${fieldSummary} already.`
        : meta.subtitle,
      action: { type: "focus-domain", domain: inferred.intent.domain },
    });
  }
  if (title && description) {
    const firstStep = description.split(/[.!?\n]/)[0].trim() || title;
    suggestions.push({
      id: "task-next-step",
      label: "Start with the smallest next step",
      detail: "Turn the first sentence of the description into a step you can finish in one sitting.",
      action: { type: "suggest-next-step", value: `Next step: ${firstStep}` },
    });
  }

  return {
    source: "intent-guidance-engine-local",
    summary: title ? `Guidance for ${title}` : "A little guidance for your next task",
    suggestions: suggestions.slice(0, 4),
    inferred,
  };
}

export function buildLocalDashboardGuidance(context: GuidanceContext = {}): GuidanceResponse {
  const completionRate = Number(context.completionRate ?? 0);
  const onTimeRate = Number(context.onTimeRate ?? 0);
  const teamCount = Number(context.teamCount ?? 0);
  const total = Number(context.taskCount ?? 0);
  const overdue = Number(context.atRiskCount ?? 0);
  const completed = Number(context.completedCount ?? 0);

  const suggestions: GuidanceSuggestion[] = [];
  if (overdue > 0) {
    suggestions.push({
      id: "dashboard-risk",
      label: `${overdue} item${overdue === 1 ? " is" : "s are"} past due`,
      detail: "Clear overdue work first, then protect the rest of the day.",
      action: { type: "open-tasks" },
    });
  }
  if (completionRate > 0 || onTimeRate > 0) {
    suggestions.push({
      id: "dashboard-improvement",
      label: "Pick one must-finish task today",
      detail:
        completionRate < 70
          ? `Your completion rate is ${completionRate}%. Choose one task to finish before adding new work.`
          : onTimeRate < 70
            ? `Your on-time rate is ${onTimeRate}%. Add due dates to work due this week.`
            : "You are on a good rhythm. Review today's priority once in the morning.",
      action: { type: "show-summary" },
    });
  }
  if (total > 0 && !suggestions.length) {
    suggestions.push({
      id: "dashboard-summary",
      label: "Your workspace at a glance",
      detail: `${total} tasks tracked, ${completed} completed, ${overdue} at risk across ${teamCount} team${teamCount === 1 ? "" : "s"}.`,
      action: { type: "show-summary" },
    });
  }

  return {
    source: "intent-guidance-engine-local",
    summary: "A useful next step",
    suggestions: suggestions.slice(0, 3),
    chart: {
      title: "Personal execution",
      values: [
        { label: "Completion", value: completionRate, color: "success" },
        { label: "On-time", value: onTimeRate, color: "primary" },
        { label: "Teams", value: teamCount, color: "secondary", max: Math.max(5, teamCount) },
      ],
    },
  };
}

export type AssignmentDraft = {
  source: string;
  status: string;
  audience: string;
  draft: {
    title: string;
    description: string;
    dueDate: string;
    priority: string;
    reportRequirement: string;
    calendarMode: string;
  };
  questions: string[];
};

export async function getAssignmentDraft(prompt: string, context: Record<string, unknown> = {}) {
  return apiRequest<AssignmentDraft>("/api/ai/assignment-draft", {
    method: "POST",
    auth: true,
    body: JSON.stringify({ prompt, context }),
  });
}

export async function getGuidance(
  surface: "task" | "task-form" | "dashboard" | "profile",
  context: GuidanceContext = {}
): Promise<GuidanceResponse> {
  try {
    const payload = await apiRequest<GuidanceResponse>("/api/ai/suggestions", {
      method: "POST",
      auth: true,
      body: JSON.stringify({ surface, context }),
    });
    if (payload && Array.isArray(payload.suggestions)) {
      return payload;
    }
  } catch {
    // Offline or server hiccup - fall through to local guidance.
  }

  if (surface === "task" || surface === "task-form") {
    return buildLocalTaskGuidance(context);
  }
  return buildLocalDashboardGuidance(context);
}

export function getTaskCreationHint(text: string) {
  const profile = inferTaskProfile(text);
  if (profile.intent.domain === "work" || profile.intent.confidence < 0.55) return null;
  const domainConfig = getDomainConfig(profile.intent.domain);
  const fieldSummary = summarizeDynamicFields(profile.intent.domain, profile.dynamicFields);
  const entities = profile.intent.entities
    .filter((entity) => entity.value && entity.type !== "time")
    .map((entity) => entity.value)
    .slice(0, 3);
  return {
    domain: profile.intent.domain,
    label: domainConfig.label,
    subtitle: getDomainSuggestionMeta(profile.intent.domain, domainConfig.label).subtitle,
    entities,
    fieldSummary,
    dueDate: profile.dueDate,
    build: () => buildTaskCreateInitialValues(text),
  };
}

export { buildTaskCreateInitialValues, normalizeTaskDomain };