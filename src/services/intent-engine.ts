import type { IntentTarget } from "@/services/intent-navigation";

type IntentRoute = {
  matcher: string[];
  feedback: string;
  target?: IntentTarget;
  protected?: boolean;
  responseOnly?: boolean;
};

type ResolveResult = {
  route: IntentRoute;
  score: number;
  exact: boolean;
} | null;

const ROUTES: IntentRoute[] = [
  {
    matcher: ["hi", "hello", "hey", "good morning", "good afternoon", "good evening"],
    feedback: "Hey. I can open tasks, calendar, teams, profile, or capture a task for you.",
    responseOnly: true,
    protected: false,
  },
  {
    matcher: ["thanks", "thank you"],
    feedback: "Anytime. Try tasks, calendar, teams, or tell me what to create.",
    responseOnly: true,
    protected: false,
  },
  {
    matcher: ["login", "log in", "sign in", "signin"],
    target: { pathname: "/(auth)/login" },
    protected: false,
    feedback: "Opening sign in.",
  },
  {
    matcher: ["register", "sign up", "signup", "create account"],
    target: { pathname: "/(auth)/login", params: { mode: "register" } },
    protected: false,
    feedback: "Opening account creation.",
  },
  {
    matcher: ["home", "dashboard", "overview", "workspace", "progress"],
    target: { pathname: "/dashboard" },
    protected: true,
    feedback: "Opening your dashboard.",
  },
  {
    matcher: ["calendar", "agenda", "today", "today agenda", "schedule", "planner"],
    target: { pathname: "/dashboard", params: { focus: "agenda" } },
    protected: true,
    feedback: "Opening your agenda.",
  },
  {
    matcher: ["due soon", "deadlines", "upcoming", "upcoming work"],
    target: { pathname: "/dashboard", params: { focus: "due-soon" } },
    protected: true,
    feedback: "Opening work due soon.",
  },
  {
    matcher: ["profile", "my profile", "account"],
    target: { pathname: "/profile" },
    protected: true,
    feedback: "Opening your profile.",
  },
  {
    matcher: ["task", "tasks", "todo", "todos", "my tasks", "personal tasks"],
    target: { pathname: "/remote-work" },
    protected: true,
    feedback: "Opening your tasks.",
  },
  {
    matcher: ["create task", "create a task", "new task", "add task"],
    target: { pathname: "/remote-work", params: { intent: "create-task" } },
    protected: true,
    feedback: "Opening task capture.",
  },
  {
    matcher: ["assigned tasks", "assigned task", "my assigned tasks"],
    target: { pathname: "/dashboard", params: { focus: "assigned" } },
    protected: true,
    feedback: "Opening assigned work.",
  },
  {
    matcher: ["teams", "team", "team workspace", "workspace teams", "group"],
    target: { pathname: "/teams" },
    protected: true,
    feedback: "Opening your teams.",
  },
  {
    matcher: ["create team", "start a team", "new team"],
    target: { pathname: "/teams", params: { action: "create" } },
    protected: true,
    feedback: "Opening team creation.",
  },
  {
    matcher: ["join team", "join workspace", "team invite", "invite"],
    target: { pathname: "/teams", params: { action: "join" } },
    protected: true,
    feedback: "Opening team join flow.",
  },
  {
    matcher: ["members", "team members", "people", "teammates", "staff"],
    target: { pathname: "/teams", params: { section: "members" } },
    protected: true,
    feedback: "Opening team members.",
  },
  {
    matcher: ["team tasks", "team task", "tasks for team"],
    target: { pathname: "/teams", params: { section: "tasks" } },
    protected: true,
    feedback: "Opening team tasks.",
  },
  {
    matcher: ["extensions", "extension requests", "view extensions"],
    target: { pathname: "/teams", params: { section: "extensions" } },
    protected: true,
    feedback: "Opening extension requests.",
  },
  {
    matcher: ["team settings", "team configuration", "team config"],
    target: { pathname: "/teams", params: { section: "settings" } },
    protected: true,
    feedback: "Opening team settings.",
  },
  {
    matcher: ["attendance", "team attendance", "attendance board"],
    target: { pathname: "/teams", params: { section: "attendance" } },
    protected: true,
    feedback: "Opening attendance.",
  },
  {
    matcher: ["punch in", "check in", "start shift"],
    target: { pathname: "/teams", params: { section: "attendance" } },
    protected: true,
    feedback: "Opening attendance so you can punch in.",
  },
  {
    matcher: ["punch out", "check out", "end shift"],
    target: { pathname: "/teams", params: { section: "attendance" } },
    protected: true,
    feedback: "Opening attendance so you can punch out.",
  },
  {
    matcher: ["conference", "meetings", "meeting", "call", "video call", "start conference"],
    target: { pathname: "/teams", params: { section: "conference" } },
    protected: true,
    feedback: "Opening team conference.",
  },
  {
    matcher: ["plan my day", "daily plan", "plan"],
    target: { pathname: "/dashboard", params: { focus: "agenda" } },
    protected: true,
    feedback: "Opening your day plan.",
  },
];

export function normalizeCommand(value: string) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildDueDate(day: "today" | "tomorrow") {
  const date = new Date();
  if (day === "tomorrow") {
    date.setDate(date.getDate() + 1);
  }
  date.setHours(9, 0, 0, 0);
  return date.toISOString();
}

function extractTaskIntent(rawInput: string) {
  const normalized = normalizeCommand(rawInput);
  const shouldCapture =
    normalized.startsWith("create task") ||
    normalized.startsWith("add task") ||
    normalized.startsWith("new task") ||
    normalized.startsWith("remind me") ||
    normalized.startsWith("remember to");

  if (!shouldCapture) return null;

  const dueDate = normalized.includes("tomorrow")
    ? buildDueDate("tomorrow")
    : normalized.includes("today")
      ? buildDueDate("today")
      : undefined;

  const title = rawInput
    .replace(/^(please\s+)?(create|add|new)\s+(a\s+)?task\s*/i, "")
    .replace(/^(please\s+)?(remind me|remember to)\s+/i, "")
    .replace(/\b(today|tomorrow)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  return {
    route: {
      matcher: [],
      feedback: title ? "Capturing that task natively." : "Opening task capture.",
      target: {
        pathname: "/remote-work",
        params: {
          intent: "create-task",
          ...(title ? { title } : {}),
          ...(dueDate ? { dueDate, autocreate: "1" } : {}),
        },
      },
      protected: true,
    } satisfies IntentRoute,
    score: title ? 110 : 95,
    exact: false,
  };
}

export function getIntentPrompts(options: {
  signedIn: boolean;
  hasTeamAccess: boolean;
  hasAdminTeamAccess: boolean;
}) {
  const { signedIn, hasTeamAccess, hasAdminTeamAccess } = options;

  return [
    ...(!signedIn ? ["Login", "Create account"] : []),
    "Hi",
    "Calendar",
    "Plan my day",
    "My tasks",
    "Create task",
    "Due soon",
    "Teams",
    "Create team",
    "Join team",
    ...(hasTeamAccess ? ["Attendance", "Team tasks", "Team members", "Conference"] : []),
    ...(hasAdminTeamAccess ? ["Extensions", "Team settings"] : []),
    "Profile",
  ];
}

export function getIntentSuggestions(input: string, prompts: string[]) {
  const normalized = normalizeCommand(input);
  if (!normalized) return prompts.slice(0, 10);

  return prompts
    .filter((prompt) => {
      const normalizedPrompt = normalizeCommand(prompt);
      return normalizedPrompt.includes(normalized) || normalized.includes(normalizedPrompt);
    })
    .slice(0, 8);
}

export function resolveIntentCommand(input: string): ResolveResult {
  const value = normalizeCommand(input);
  if (!value) return null;

  const inputTokens = value.split(" ");
  const taskIntent = extractTaskIntent(input);

  const topRoute = ROUTES
    .map((route) => {
      let bestScore = 0;
      let exact = false;

      route.matcher.forEach((phrase) => {
        const normalizedPhrase = normalizeCommand(phrase);
        const phraseTokens = normalizedPhrase.split(" ");

        if (value === normalizedPhrase) {
          bestScore = Math.max(bestScore, 120);
          exact = true;
          return;
        }

        if (value.includes(normalizedPhrase) || normalizedPhrase.includes(value)) {
          bestScore = Math.max(bestScore, 90);
        }

        const tokenScore = phraseTokens.reduce(
          (sum, token) => sum + (inputTokens.includes(token) ? 12 : 0),
          0
        );
        bestScore = Math.max(bestScore, tokenScore);
      });

      return { route, score: bestScore, exact };
    })
    .sort((left, right) => right.score - left.score)[0];

  if (taskIntent && (!topRoute || taskIntent.score >= topRoute.score)) {
    return taskIntent;
  }

  return topRoute && topRoute.score >= 12 ? topRoute : null;
}
