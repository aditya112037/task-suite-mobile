export type IntentWorkflow = "tasks" | "teams" | "conference" | "plan";

export type IntentAction =
  | "create_task"
  | "create_team"
  | "join_team"
  | "members"
  | "team_tasks"
  | "extensions"
  | "team_settings"
  | "conference_join"
  | "conference_create"
  | "attendance"
  | "punch_in"
  | "punch_out";

type IntentRoute = {
  matcher: string[];
  feedback: string;
  workflow?: IntentWorkflow;
  action?: IntentAction;
  path?: string;
  protected?: boolean;
};

type ResolveResult = {
  route: IntentRoute;
  score: number;
  exact: boolean;
} | null;

const ROUTES: IntentRoute[] = [
  { matcher: ["login", "log in", "sign in", "signin", "register", "sign up", "signup", "create account"], path: "/login", protected: false, feedback: "Opening sign in." },
  { matcher: ["home", "dashboard", "overview", "workspace", "progress"], path: "/dashboard", protected: true, feedback: "Opening your dashboard." },
  { matcher: ["profile", "my profile", "account"], path: "/profile", protected: true, feedback: "Opening your profile." },
  { matcher: ["task", "tasks", "todo", "todos", "my tasks", "personal tasks"], workflow: "tasks", feedback: "Choose what you want to do with tasks." },
  { matcher: ["create task", "create a task", "new task", "add task"], action: "create_task", feedback: "Starting a task flow." },
  { matcher: ["assigned tasks", "assigned task", "my assigned tasks"], path: "/dashboard", protected: true, feedback: "Opening assigned work." },
  { matcher: ["teams", "team", "team workspace", "workspace teams", "group"], workflow: "teams", feedback: "Choose how you want to work with teams." },
  { matcher: ["create team", "start a team", "new team"], action: "create_team", feedback: "Starting the team creation flow." },
  { matcher: ["join team", "join workspace", "team invite", "invite"], action: "join_team", feedback: "Starting the team join flow." },
  { matcher: ["members", "team members", "people", "teammates", "staff"], action: "members", feedback: "Choose the team members workspace." },
  { matcher: ["team tasks", "team task", "tasks for team"], action: "team_tasks", feedback: "Choose the team task workspace." },
  { matcher: ["extensions", "extension requests", "view extensions"], action: "extensions", feedback: "Choose the team extension workspace." },
  { matcher: ["team settings", "team configuration", "team config"], action: "team_settings", feedback: "Choose the team settings workspace." },
  { matcher: ["conference", "meeting", "call", "team conference"], workflow: "conference", feedback: "Choose whether you want to create or join a conference." },
  { matcher: ["join conference", "join meeting"], action: "conference_join", feedback: "Choose the team conference you want to join." },
  { matcher: ["create conference", "start conference", "start meeting"], action: "conference_create", feedback: "Choose the team conference you want to start." },
  { matcher: ["attendance", "team attendance", "attendance board"], action: "attendance", feedback: "Opening attendance." },
  { matcher: ["punch in", "check in", "start shift"], action: "punch_in", feedback: "Opening attendance so you can punch in." },
  { matcher: ["punch out", "check out", "end shift"], action: "punch_out", feedback: "Opening attendance so you can punch out." },
  { matcher: ["plan my day", "daily plan", "plan"], workflow: "plan", feedback: "Choose what you want to focus on in your day plan." },
  { matcher: ["calendar", "schedule", "add event", "add note"], path: "https://tasksuite.co/app?view=calendar", protected: true, feedback: "Opening calendar on the web workspace." },
  { matcher: ["mail", "messages", "inbox", "compose mail"], path: "https://tasksuite.co/inbox", protected: true, feedback: "Opening mail on the web workspace." },
  { matcher: ["insights", "journal", "create insight"], path: "https://tasksuite.co/insights", protected: true, feedback: "Opening insights on the web workspace." },
  { matcher: ["reports", "report"], path: "https://tasksuite.co/reports", protected: true, feedback: "Opening reports on the web workspace." },
  { matcher: ["pricing", "plans", "upgrade"], path: "https://tasksuite.co/pricing", protected: false, feedback: "Opening pricing." },
  { matcher: ["contact", "support", "help"], path: "https://tasksuite.co/contact", protected: false, feedback: "Opening contact." },
];

export function normalizeCommand(value: string) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function getIntentPrompts(options: {
  signedIn: boolean;
  hasTeamAccess: boolean;
  hasAdminTeamAccess: boolean;
}) {
  const { signedIn, hasTeamAccess, hasAdminTeamAccess } = options;

  return [
    ...(!signedIn ? ["Login", "Create account"] : []),
    "Plan my day",
    "My tasks",
    "Create task",
    "Teams",
    "Create team",
    "Join team",
    ...(hasTeamAccess ? ["Attendance", "Team tasks", "Team members", "Conference"] : []),
    ...(hasAdminTeamAccess ? ["Extensions", "Team settings", "Start conference"] : []),
    "Profile",
    "Calendar",
    "Inbox",
    "Insights",
  ];
}

export function getIntentSuggestions(input: string, prompts: string[]) {
  const normalized = normalizeCommand(input);
  if (!normalized) return prompts.slice(0, 8);

  return prompts.filter((prompt) => normalizeCommand(prompt).includes(normalized)).slice(0, 6);
}

export function resolveIntentCommand(input: string): ResolveResult {
  const value = normalizeCommand(input);
  if (!value) return null;

  const inputTokens = value.split(" ");
  const scored = ROUTES.map((route) => {
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

      const tokenScore = phraseTokens.reduce((sum, token) => sum + (inputTokens.includes(token) ? 12 : 0), 0);
      bestScore = Math.max(bestScore, tokenScore);
    });

    return { route, score: bestScore, exact };
  }).sort((left, right) => right.score - left.score)[0];

  return scored && scored.score >= 12 ? scored : null;
}
