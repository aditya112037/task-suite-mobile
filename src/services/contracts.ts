export type TaskStatus = "todo" | "in-progress" | "completed";
export type TaskPriority = "low" | "medium" | "high";

export type UserSummary = {
  id: string;
  name: string;
  email?: string;
  photo?: string | null;
};

export type TaskChecklistItem = {
  id: string;
  title: string;
  completed: boolean;
  progressPercentage: number;
  assignedTo?: UserSummary | null;
};

export type PersonalTask = {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  workspace: string;
  progressPercentage: number;
  totalSubtasks: number;
  completedSubtasks: number;
  electricBorder: boolean;
  subtasks: TaskChecklistItem[];
  checkpoints: TaskChecklistItem[];
  createdAt?: string;
  updatedAt?: string;
};

export type TeamRole = {
  name: string;
  powers: string[];
};

export type TeamMember = {
  id: string;
  name: string;
  email?: string;
  photo?: string | null;
  role: string;
  teamDisplayName?: string;
};

export type PendingJoinRequest = {
  id: string;
  name: string;
  email?: string;
  photo?: string | null;
  requestedAt: string | null;
};

export type TeamSummary = {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  memberCount: number;
  pendingJoinRequestCount: number;
  myRole: string;
  myPowers: string[];
  isAdmin: boolean;
};

export type TeamDetail = TeamSummary & {
  members: TeamMember[];
  roles: TeamRole[];
  pendingJoinRequests: PendingJoinRequest[];
};

export type TeamTask = {
  id: string;
  teamId: string;
  teamName: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  progressPercentage: number;
  totalSubtasks: number;
  completedSubtasks: number;
  assigneeIds: string[];
  assignees: UserSummary[];
  createdBy?: UserSummary | null;
  needsAttention: boolean;
  extensionStatus: string | null;
  extensionRequestedDueDate: string | null;
  reportLockActive: boolean;
};

export type AttendanceRecord = {
  user: TeamMember;
  isPunchedIn: boolean;
  timeSpentMs: number;
  punchInAt: string | null;
  punchOutAt: string | null;
  onLeave: boolean;
};

export type TeamAttendance = {
  teamId: string;
  teamName: string;
  dateKey: string;
  records: AttendanceRecord[];
};

export type FocusBadge = {
  id: string;
  title: string;
  description: string;
};

export type FocusNudge = {
  taskId: string | null;
  teamId: string | null;
  title: string;
  stalledSubtasks: number;
  maxDaysStalled: number;
};

export type ProfileSummary = {
  id: string;
  name: string;
  email: string;
  photo?: string | null;
  identity: {
    primaryRole: string;
    teams: {
      id: string;
      name: string;
      role: string;
      color?: string | null;
      icon?: string | null;
    }[];
  };
  progress: {
    personalCompletedTasks: number;
    personalTotalTasks: number;
    assignedTasks: number;
    completedAssignedTasks: number;
    completionRate: number;
    onTimeRate: number;
    activeTasks: number;
    completedSubtasks: number;
    totalSubtasks: number;
    badges: FocusBadge[];
    needsAttentionTasks: FocusNudge[];
    reminder: string | null;
  };
};

type RawRecord = Record<string, any>;

const DEFAULT_MANAGER_POWERS = [
  "manage_join_requests",
  "create_task",
  "edit_any_task",
  "delete_task",
  "assign_task",
  "manage_subtasks",
  "edit_any_subtask",
  "approve_extensions",
  "view_pending_extensions",
  "start_conference",
  "manage_display_names",
  "manage_leave",
];

const readString = (value: unknown, fallback = "") =>
  typeof value === "string" ? value : fallback;

const readNumber = (value: unknown, fallback = 0) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const readBoolean = (value: unknown) => Boolean(value);

const readArray = <T>(value: unknown) => (Array.isArray(value) ? (value as T[]) : []);

export const toId = (value: unknown) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object" && value && "_id" in value) {
    return readString((value as RawRecord)._id);
  }
  if (typeof value === "object" && value && "id" in value) {
    return readString((value as RawRecord).id);
  }
  return "";
};

const normalizeUserSummary = (raw: RawRecord | null | undefined): UserSummary | null => {
  if (!raw) return null;

  return {
    id: toId(raw),
    name: readString(raw.name, "Unknown user"),
    email: readString(raw.email),
    photo: raw.photo ? readString(raw.photo) : null,
  };
};

const normalizeChecklistItem = (raw: RawRecord): TaskChecklistItem => ({
  id: toId(raw) || `${readString(raw.title, "item")}-${Math.random().toString(36).slice(2, 8)}`,
  title: readString(raw.title, "Untitled"),
  completed: readBoolean(raw.completed),
  progressPercentage: readNumber(raw.progressPercentage, raw.completed ? 100 : 0),
  assignedTo:
    raw.assignedTo && typeof raw.assignedTo === "object"
      ? normalizeUserSummary(raw.assignedTo as RawRecord)
      : null,
});

export const normalizePersonalTask = (raw: RawRecord): PersonalTask => {
  const progress = (raw.progress || {}) as RawRecord;
  const subtasks = readArray<RawRecord>(raw.subtasks).map(normalizeChecklistItem);
  const checkpoints = readArray<RawRecord>(raw.checkpoints).map(normalizeChecklistItem);

  return {
    id: toId(raw),
    title: readString(raw.title, "Untitled task"),
    description: readString(raw.description),
    status: readString(raw.status, "todo") as TaskStatus,
    priority: readString(raw.priority, "medium") as TaskPriority,
    dueDate: raw.dueDate ? readString(raw.dueDate) : null,
    workspace: readString(raw.workspace, "work"),
    progressPercentage: readNumber(progress.percentage),
    totalSubtasks: readNumber(progress.totalSubtasks, subtasks.length + checkpoints.length),
    completedSubtasks: readNumber(
      progress.completedSubtasks,
      [...subtasks, ...checkpoints].filter((item) => item.completed).length
    ),
    electricBorder: readBoolean(raw.flags?.electricBorder),
    subtasks,
    checkpoints,
    createdAt: readString(raw.createdAt),
    updatedAt: readString(raw.updatedAt),
  };
};

const derivePowers = (roles: TeamRole[], myRole: string, isAdmin: boolean) => {
  if (isAdmin) {
    return ["admin", ...DEFAULT_MANAGER_POWERS];
  }

  return roles.find((role) => role.name === myRole)?.powers || [];
};

const normalizeRole = (raw: RawRecord): TeamRole => ({
  name: readString(raw.name),
  powers: readArray<string>(raw.powers).map((power) => readString(power)).filter(Boolean),
});

export const normalizeTeamSummary = (raw: RawRecord, currentUserId: string): TeamSummary => {
  const members = readArray<RawRecord>(raw.members);
  const roles = readArray<RawRecord>(raw.roles).map(normalizeRole);
  const myMembership =
    members.find((member) => toId(member.user) === currentUserId || toId(member) === currentUserId) || null;
  const isAdmin = toId(raw.admin) === currentUserId;
  const myRole = isAdmin ? "admin" : readString(myMembership?.role, "member");

  return {
    id: toId(raw),
    name: readString(raw.name, "Untitled team"),
    description: readString(raw.description),
    color: readString(raw.color, "#3c87f7"),
    icon: readString(raw.icon, "Team"),
    memberCount: members.length,
    pendingJoinRequestCount: readArray<RawRecord>(raw.pendingJoinRequests).length,
    myRole,
    myPowers: derivePowers(roles, myRole, isAdmin),
    isAdmin,
  };
};

export const normalizeTeamDetail = (raw: RawRecord, currentUserId: string): TeamDetail => {
  const summary = normalizeTeamSummary(raw, currentUserId);
  const members = readArray<RawRecord>(raw.members).map((member) => {
    const user = (member.user || {}) as RawRecord;
    return {
      id: toId(user),
      name: readString(member.teamDisplayName) || readString(user.name, "Member"),
      email: readString(user.email),
      photo: user.photo ? readString(user.photo) : null,
      role: readString(member.role, "member"),
      teamDisplayName: readString(member.teamDisplayName),
    };
  });

  return {
    ...summary,
    members,
    roles: readArray<RawRecord>(raw.roles).map(normalizeRole),
    pendingJoinRequests: readArray<RawRecord>(raw.pendingJoinRequests).map((request) => {
      const user = (request.user || {}) as RawRecord;
      return {
        id: toId(user),
        name: readString(user.name, "Pending user"),
        email: readString(user.email),
        photo: user.photo ? readString(user.photo) : null,
        requestedAt: request.requestedAt ? readString(request.requestedAt) : null,
      };
    }),
  };
};

export const normalizeTeamTask = (raw: RawRecord): TeamTask => {
  const progress = (raw.progress || {}) as RawRecord;
  const assignees = readArray<RawRecord>(raw.assignedToUsers).map((user) =>
    normalizeUserSummary(user)
  ).filter(Boolean) as UserSummary[];
  const fallbackAssigned = normalizeUserSummary(raw.assignedTo as RawRecord);
  const finalAssignees = assignees.length ? assignees : fallbackAssigned ? [fallbackAssigned] : [];
  const teamRecord = (raw.team || {}) as RawRecord;

  return {
    id: toId(raw),
    teamId: toId(teamRecord) || readString(raw.teamId),
    teamName: readString(teamRecord.name, readString(raw.teamName, "Team")),
    title: readString(raw.title, "Untitled task"),
    description: readString(raw.description),
    status: readString(raw.status, "todo") as TaskStatus,
    priority: readString(raw.priority, "medium") as TaskPriority,
    dueDate: raw.dueDate ? readString(raw.dueDate) : null,
    progressPercentage: readNumber(progress.percentage),
    totalSubtasks: readNumber(progress.totalSubtasks),
    completedSubtasks: readNumber(progress.completedSubtasks),
    assigneeIds: finalAssignees.map((user) => user.id),
    assignees: finalAssignees,
    createdBy:
      raw.createdBy && typeof raw.createdBy === "object"
        ? normalizeUserSummary(raw.createdBy as RawRecord)
        : null,
    needsAttention: readBoolean(raw.needsAttention),
    extensionStatus: raw.extensionRequest ? readString(raw.extensionRequest.status) || null : null,
    extensionRequestedDueDate: raw.extensionRequest?.requestedDueDate
      ? readString(raw.extensionRequest.requestedDueDate)
      : null,
    reportLockActive: readBoolean(raw.reportLock?.active),
  };
};

export const normalizeAttendance = (raw: RawRecord): TeamAttendance => ({
  teamId: toId(raw.teamId) || readString(raw.teamId),
  teamName: readString(raw.teamName, "Team"),
  dateKey: readString(raw.dateKey),
  records: readArray<RawRecord>(raw.records).map((record) => ({
    user: {
      id: toId(record.user),
      name: readString(record.user?.name, "Member"),
      email: readString(record.user?.email),
      photo: record.user?.photo ? readString(record.user.photo) : null,
      role: readString(record.user?.role, "member"),
      teamDisplayName: readString(record.user?.name),
    },
    isPunchedIn: readBoolean(record.isPunchedIn),
    timeSpentMs: readNumber(record.timeSpentMs),
    punchInAt: record.punchInAt ? readString(record.punchInAt) : null,
    punchOutAt: record.punchOutAt ? readString(record.punchOutAt) : null,
    onLeave: readBoolean(record.onLeave),
  })),
});

export const normalizeProfile = (raw: RawRecord): ProfileSummary => ({
  id: toId(raw),
  name: readString(raw.name, "Task Suite user"),
  email: readString(raw.email),
  photo: raw.photo ? readString(raw.photo) : null,
  identity: {
    primaryRole: readString(raw.identity?.primaryRole, "member"),
    teams: readArray<RawRecord>(raw.identity?.teams).map((team) => ({
      id: toId(team),
      name: readString(team.name, "Team"),
      role: readString(team.role, "member"),
      color: team.color ? readString(team.color) : null,
      icon: team.icon ? readString(team.icon) : null,
    })),
  },
  progress: {
    personalCompletedTasks: readNumber(raw.progress?.personal?.completedTasks),
    personalTotalTasks: readNumber(raw.progress?.personal?.totalTasks),
    assignedTasks: readNumber(raw.progress?.team?.assignedTasks),
    completedAssignedTasks: readNumber(raw.progress?.team?.completedAssignedTasks),
    completionRate: readNumber(raw.progress?.metrics?.completionRate),
    onTimeRate: readNumber(raw.progress?.metrics?.onTimeRate),
    activeTasks: readNumber(raw.progress?.metrics?.activeTasks),
    completedSubtasks: readNumber(raw.progress?.metrics?.subtasksCompleted),
    totalSubtasks: readNumber(raw.progress?.metrics?.totalSubtasks),
    badges: readArray<RawRecord>(raw.progress?.badges).map((badge) => ({
      id: readString(badge.id),
      title: readString(badge.title),
      description: readString(badge.description),
    })),
    needsAttentionTasks: readArray<RawRecord>(raw.progress?.nudges?.needsAttentionTasks).map((item) => ({
      taskId: item.taskId ? toId(item.taskId) : null,
      teamId: item.teamId ? toId(item.teamId) : null,
      title: readString(item.title, "Task"),
      stalledSubtasks: readNumber(item.stalledSubtasks),
      maxDaysStalled: readNumber(item.maxDaysStalled),
    })),
    reminder: raw.progress?.nudges?.reminder ? readString(raw.progress.nudges.reminder) : null,
  },
});
