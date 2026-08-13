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
    matcher: ["hi", "hello", "hey", "good morning", "good afternoon", "good evening", "namaste"],
    feedback: "Hey. I can open tasks, calendar, teams, profile, or capture a task for you.",
    responseOnly: true,
    protected: false,
  },
  {
    matcher: ["thanks", "thank you", "ok thanks", "okay thanks"],
    feedback: "Anytime. Try tasks, calendar, teams, or tell me what to create.",
    responseOnly: true,
    protected: false,
  },
  {
    matcher: ["help", "support", "what can you do", "where do i start", "get started"],
    feedback: "Try tasks, create task, calendar, teams, attendance, team tasks, profile, or plan my day.",
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
    matcher: ["register", "sign up", "signup", "create account", "create an account", "join now", "get started account"],
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
    matcher: ["calendar", "agenda", "today", "today agenda", "schedule", "planner", "plan week", "my calendar", "open calendar"],
    target: { pathname: "/calendar" },
    protected: true,
    feedback: "Opening your calendar.",
  },
  {
    matcher: ["due soon", "deadlines", "upcoming", "upcoming work", "what is due", "what is due this week"],
    target: { pathname: "/calendar", params: { focus: "upcoming" } },
    protected: true,
    feedback: "Opening upcoming work.",
  },
  {
    matcher: ["plan my day", "day planning", "daily plan", "plan", "organize my day", "start my day"],
    target: { pathname: "/calendar", params: { focus: "agenda" } },
    protected: true,
    feedback: "Opening your day plan.",
  },
  {
    matcher: ["add event", "new event", "create event", "schedule event", "calendar event"],
    target: { pathname: "/calendar", params: { intent: "create-event" } },
    protected: true,
    feedback: "Opening event capture.",
  },
  {
    matcher: ["add note", "new note", "calendar note", "schedule note", "create note"],
    target: { pathname: "/calendar", params: { intent: "create-note" } },
    protected: true,
    feedback: "Opening note capture.",
  },
  {
    matcher: ["profile", "my profile", "account"],
    target: { pathname: "/profile" },
    protected: true,
    feedback: "Opening your profile.",
  },
  {
    matcher: ["task", "tasks", "todo", "todos", "my tasks", "personal tasks", "work items"],
    target: { pathname: "/remote-work" },
    protected: true,
    feedback: "Opening your tasks.",
  },
  {
    matcher: ["create task", "create a task", "new task", "add task", "make a task"],
    target: { pathname: "/remote-work", params: { intent: "create-task" } },
    protected: true,
    feedback: "Opening task capture.",
  },
  {
    matcher: ["assigned tasks", "assigned task", "my assigned tasks", "tasks assigned to me", "assigned work"],
    target: { pathname: "/dashboard", params: { focus: "assigned" } },
    protected: true,
    feedback: "Opening assigned work.",
  },
  {
    matcher: ["teams", "team", "team workspace", "workspace teams", "group", "groups"],
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
    matcher: ["join team", "join workspace", "team invite", "invite", "join a workspace"],
    target: { pathname: "/teams", params: { action: "join" } },
    protected: true,
    feedback: "Opening team join flow.",
  },
  {
    matcher: ["members", "team members", "people", "teammates", "staff", "member list", "team directory"],
    target: { pathname: "/teams", params: { section: "members" } },
    protected: true,
    feedback: "Opening team members.",
  },
  {
    matcher: ["team tasks", "team task", "tasks for team", "assign work", "assign task", "assign tasks"],
    target: { pathname: "/teams", params: { section: "tasks" } },
    protected: true,
    feedback: "Opening team tasks.",
  },
  {
    matcher: ["extensions", "extension requests", "view extensions", "extension panel"],
    target: { pathname: "/teams", params: { section: "extensions" } },
    protected: true,
    feedback: "Opening extension requests.",
  },
  {
    matcher: ["team settings", "team configuration", "team config", "settings for team"],
    target: { pathname: "/teams", params: { section: "settings" } },
    protected: true,
    feedback: "Opening team settings.",
  },
  {
    matcher: ["attendance", "team attendance", "attendance board", "attendance summary", "time in app"],
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
    matcher: ["conference", "meetings", "meeting", "call", "video call", "team conference", "start conference"],
    target: { pathname: "/teams", params: { section: "conference" } },
    protected: true,
    feedback: "Opening team conference.",
  },
  {
    matcher: ["notifications", "notification", "alerts", "unread", "bell", "see notifications", "open notifications"],
    target: { pathname: "/notifications" },
    protected: true,
    feedback: "Opening your notifications.",
  },
  {
    matcher: ["task detail", "open task", "edit task", "view task", "subtasks", "checklist"],
    target: { pathname: "/remote-work" },
    protected: true,
    feedback: "Opening your tasks — tap any task to view details and subtasks.",
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

function editDistance(source: string, target: string) {
  const rows = source.length + 1;
  const cols = target.length + 1;
  const matrix = Array.from({ length: rows }, () => Array(cols).fill(0));

  for (let row = 0; row < rows; row += 1) matrix[row][0] = row;
  for (let col = 0; col < cols; col += 1) matrix[0][col] = col;

  for (let row = 1; row < rows; row += 1) {
    for (let col = 1; col < cols; col += 1) {
      const cost = source[row - 1] === target[col - 1] ? 0 : 1;
      matrix[row][col] = Math.min(
        matrix[row - 1][col] + 1,
        matrix[row][col - 1] + 1,
        matrix[row - 1][col - 1] + cost
      );
    }
  }

  return matrix[source.length][target.length];
}

function extractTaskIntent(rawInput: string) {
  const normalized = normalizeCommand(rawInput);
  const shouldCapture =
    normalized.startsWith("create task") ||
    normalized.startsWith("add task") ||
    normalized.startsWith("new task") ||
    normalized.startsWith("remind me") ||
    normalized.startsWith("remember to") ||
    normalized.startsWith("i need to") ||
    normalized.startsWith("need to");

  if (!shouldCapture) return null;

  const dueDate = normalized.includes("tomorrow")
    ? buildDueDate("tomorrow")
    : normalized.includes("today")
      ? buildDueDate("today")
      : undefined;

  const wasReminder = /^(please\s+)?(remind me|remember to)\s+/i.test(rawInput);

  const title = rawInput
    .replace(/^(please\s+)?(create|add|new|make)\s+(a\s+)?task\s*/i, "")
    .replace(/^(please\s+)?(remind me|remember to|i need to|need to)\s+/i, "")
    .replace(/\b(today|tomorrow|tonight|this evening|eod)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  const cleanTitle = wasReminder ? title.replace(/^to\s+/i, "").trim() : title;

  return {
    route: {
      matcher: [],
      feedback: cleanTitle ? "Capturing that task natively." : "Opening task capture.",
      target: {
        pathname: "/remote-work",
        params: {
          intent: "create-task",
          ...(cleanTitle ? { title: cleanTitle } : {}),
          ...(dueDate ? { dueDate, autocreate: "1" } : {}),
        },
      },
      protected: true,
    } satisfies IntentRoute,
    score: cleanTitle ? 110 : 95,
    exact: false,
  };
}

function resolveSentenceRoute(rawValue: string) {
  const value = normalizeCommand(rawValue);
  if (!value) return null;

  const tokens = value.split(" ");
  const tokenSet = new Set(tokens);
  const includesAny = (items: string[]) => items.some((item) => value.includes(item));
  const hasAnyToken = (items: string[]) => items.some((item) => tokenSet.has(item));

  const sentenceRules = [
    {
      route: ROUTES.find((item) => item.matcher.includes("login")) || null,
      score:
        includesAny(["already have an account", "existing user", "returning user", "sign me in"]) ||
        hasAnyToken(["login", "signin"])
          ? 104
          : 0,
    },
    {
      route: ROUTES.find((item) => item.matcher.includes("register")) || null,
      score:
        includesAny(["new here", "new user", "first time", "create an account", "sign me up"]) ||
        hasAnyToken(["register", "signup"])
          ? 104
          : 0,
    },
    {
      route: ROUTES.find((item) => item.matcher.includes("calendar")) || null,
      score:
        includesAny(["open my calendar", "show my calendar", "plan my week", "schedule my week"]) ||
        (hasAnyToken(["calendar", "schedule"]) && !hasAnyToken(["google", "apple"]))
          ? 96
          : 0,
    },
    {
      route: ROUTES.find((item) => item.matcher.includes("plan my day")) || null,
      score:
        includesAny(["what should i do today", "what is on my plate", "organize my day", "start my day"]) ||
        (hasAnyToken(["plan", "organize"]) && hasAnyToken(["day", "today"]))
          ? 94
          : 0,
    },
    {
      route: ROUTES.find((item) => item.matcher.includes("attendance")) || null,
      score:
        includesAny(["show attendance", "open attendance", "attendance board", "check attendance"]) ||
        hasAnyToken(["attendance"])
          ? 96
          : 0,
    },
    {
      route: ROUTES.find((item) => item.matcher.includes("assigned tasks")) || null,
      score:
        includesAny(["assigned to me", "my assigned work", "work assigned to me"]) ||
        (hasAnyToken(["assigned"]) && hasAnyToken(["me", "my"]))
          ? 96
          : 0,
    },
    {
      route: ROUTES.find((item) => item.matcher.includes("team tasks")) || null,
      score:
        includesAny(["assign work", "team work", "team task board", "tasks for my team"]) ||
        (hasAnyToken(["team"]) && hasAnyToken(["task", "tasks"]))
          ? 94
          : 0,
    },
    {
      route: ROUTES.find((item) => item.matcher.includes("create team")) || null,
      score:
        includesAny(["start a new team", "make a team", "create a workspace"]) ||
        (hasAnyToken(["create", "start", "make"]) && hasAnyToken(["team", "workspace"]))
          ? 92
          : 0,
    },
    {
      route: ROUTES.find((item) => item.matcher.includes("join team")) || null,
      score:
        includesAny(["join a team", "use invite code", "join workspace"]) ||
        (hasAnyToken(["join"]) && hasAnyToken(["team", "workspace", "invite"]))
          ? 92
          : 0,
    },
    {
      route: ROUTES.find((item) => item.matcher.includes("conference")) || null,
      score:
        includesAny(["start a call", "join a call", "team call", "video call", "meet with"]) ||
        hasAnyToken(["meeting", "conference", "call"])
          ? 90
          : 0,
    },
    {
      route: ROUTES.find((item) => item.matcher.includes("dashboard")) || null,
      score:
        includesAny(["take me home", "open my dashboard", "show overview", "open workspace"]) ||
        hasAnyToken(["dashboard", "overview", "workspace"])
          ? 86
          : 0,
    },
  ].filter((entry) => entry.route && entry.score > 0);

  const bestMatch = sentenceRules.sort((left, right) => right.score - left.score)[0];
  return bestMatch ? { route: bestMatch.route!, score: bestMatch.score, exact: false } : null;
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
    "Add event",
    "My tasks",
    "Create task",
    "Due soon",
    "Teams",
    "Create team",
    "Join team",
    ...(signedIn ? ["Assigned tasks", "Notifications"] : []),
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
      if (normalizedPrompt.includes(normalized) || normalized.includes(normalizedPrompt)) {
        return true;
      }

      const promptTokens = normalizedPrompt.split(" ");
      const inputTokens = normalized.split(" ");
      return promptTokens.some((promptToken) =>
        inputTokens.some((inputToken) => {
          if (Math.abs(promptToken.length - inputToken.length) > 2) return false;
          return editDistance(promptToken, inputToken) <= 2;
        })
      );
    })
    .slice(0, 8);
}

export function resolveIntentCommand(input: string): ResolveResult {
  const value = normalizeCommand(input);
  if (!value) return null;

  const taskIntent = extractTaskIntent(input);
  const sentenceIntent = resolveSentenceRoute(input);
  const inputTokens = value.split(" ");

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

        if (
          value.length >= 3 &&
          (value.includes(normalizedPhrase) ||
            (normalizedPhrase.startsWith(value) && normalizedPhrase.length - value.length <= 6))
        ) {
          bestScore = Math.max(bestScore, 92);
        }

        const tokenScore = phraseTokens.reduce((score, token) => {
          if (inputTokens.includes(token)) return score + 12;

          const fuzzyMatch = inputTokens.some((inputToken) => {
            if (Math.abs(inputToken.length - token.length) > 2) return false;
            return editDistance(inputToken, token) <= 2;
          });

          return fuzzyMatch ? score + 8 : score;
        }, 0);

        bestScore = Math.max(bestScore, tokenScore);
      });

      return { route, score: bestScore, exact };
    })
    .sort((left, right) => right.score - left.score)[0];

  const ranked = [taskIntent, sentenceIntent, topRoute]
    .filter(Boolean)
    .sort((left, right) => (right?.score || 0) - (left?.score || 0))[0];

  return ranked && ranked.score >= 12 ? ranked : null;
}
