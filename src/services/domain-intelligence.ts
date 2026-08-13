export type IntentEntity = {
  type: string;
  value: string;
};

export type TaskIntentProfile = {
  workspace: string;
  intent: {
    domain: string;
    subtype: string;
    confidence: number;
    entities: IntentEntity[];
    source: string;
  };
  capabilities: string[];
  dynamicFields: Record<string, unknown>;
  dueDate: string;
};

export type DomainFieldDefinition = {
  key: string;
  label: string;
  type: "text" | "string-list" | "boolean";
  placeholder?: string;
};

type DomainConfig = {
  label: string;
  capabilities: string[];
  dynamicFields: string[];
  keywords: string[];
};

const DOMAIN_CONFIGS: Record<string, DomainConfig> = {
  work: {
    label: "Work",
    capabilities: [],
    dynamicFields: [],
    keywords: [
      "work", "office", "project", "meeting", "client", "review", "deadline", "deliverable",
      "report", "follow up", "presentation", "email", "assignment", "task", "todo",
    ],
  },
  cooking: {
    label: "Cooking",
    capabilities: ["ingredients", "steps", "servings", "cook_time", "grocery"],
    dynamicFields: ["ingredients", "steps", "servings", "cook_time", "grocery"],
    keywords: [
      "cook", "cooking", "recipe", "curry", "dinner", "lunch", "breakfast", "ingredients",
      "kitchen", "meal", "marinate", "bake", "boil", "fry", "chicken", "mutton", "beef",
      "fish", "salmon", "tuna", "prawns", "shrimp", "paneer", "tofu", "dal", "lentils",
      "beans", "potato", "tomato", "onion", "garlic", "ginger", "spinach", "broccoli",
      "carrot", "cauliflower", "mushroom", "capsicum", "pepper", "lettuce", "cabbage",
      "corn", "peas", "apple", "banana", "orange", "mango", "grape", "berry", "strawberry",
      "watermelon", "pineapple", "oats", "bread", "roti", "naan", "rice", "biryani",
      "pasta", "noodles", "soup", "salad", "sandwich", "pizza", "burger", "omelette",
      "egg", "milk", "cheese", "yogurt", "curd", "butter", "cream", "sugar", "salt",
      "spice", "masala", "turmeric", "cumin", "coriander", "chilli", "cilantro", "mint",
      "basil", "dessert", "snack", "grocery", "momos", "dumplings", "dosa", "idli",
      "sambar", "poha", "upma", "paratha", "chole", "rajma", "kebab", "fried rice",
      "manchurian", "pulao", "khichdi", "khichri", "kachori", "samosa", "pakora",
      "pakoda", "jalebi", "gulab jamun", "rasgulla", "rasmalai", "halwa", "kheer",
      "lassi", "chai", "tea", "coffee", "juice", "smoothie", "shake", "wrap", "roll",
      "frankie", "pav bhaji", "vada pav", "misal", "bhindi", "aloo", "gobi", "palak",
      "dal chawal", "meal prep",
    ],
  },
  sports: {
    label: "Sports",
    capabilities: ["training_type", "equipment", "duration", "players_or_team", "score_or_goal"],
    dynamicFields: ["training_type", "equipment", "duration", "players_or_team", "score_or_goal"],
    keywords: [
      "practice", "training", "match", "game", "sport", "sports", "gymkhana", "cricket",
      "football", "basketball", "tennis", "run", "workout", "ipl", "coach", "league",
      "tournament", "net practice", "warmup", "drill", "fitness", "cardio", "badminton",
      "volleyball", "kabaddi", "hockey", "swimming", "cycling", "jog", "jogging", "sprint",
      "marathon", "yoga", "nets", "batting", "bowling", "fielding", "racquet", "racquetball",
      "gym", "strength", "matchday",
    ],
  },
  health: {
    label: "Health",
    capabilities: ["symptoms_or_goal", "medication", "hydration", "duration", "metrics"],
    dynamicFields: ["symptoms_or_goal", "medication", "hydration", "duration", "metrics"],
    keywords: [
      "vitamin", "medicine", "medication", "doctor", "health", "hydration", "water",
      "sleep", "protein", "supplement", "symptom", "walk", "recovery", "wellness",
      "therapy", "tablet", "capsule", "dose", "prescription", "appointment",
      "blood pressure", "sugar", "glucose", "heart rate", "stretch", "rehab", "fever",
      "cold", "cough", "headache", "migraine", "pain", "painkiller", "protein shake",
      "multivitamin", "protein", "creatine", "step count", "bp", "pulse", "calories",
      "mental health",
    ],
  },
  study: {
    label: "Study",
    capabilities: ["subject", "topic_list", "study_duration", "exam_date", "resources"],
    dynamicFields: ["subject", "topic_list", "study_duration", "exam_date", "resources"],
    keywords: [
      "study", "exam", "revision", "learn", "homework", "assignment", "course", "syllabus",
      "lecture", "notes", "subject", "chapter", "quiz", "test", "class", "tuition",
    ],
  },
  travel: {
    label: "Travel",
    capabilities: ["destination", "transport", "stay", "packing_list", "budget"],
    dynamicFields: ["destination", "transport", "stay", "packing_list", "budget"],
    keywords: [
      "trip", "travel", "flight", "train", "hotel", "packing", "itinerary", "vacation",
      "holiday", "bus", "cab", "ticket", "visa", "passport", "boarding", "airport",
      "resort", "booking",
    ],
  },
  finance: {
    label: "Finance",
    capabilities: ["amount", "payment_type", "due_context", "account_or_vendor", "notes"],
    dynamicFields: ["amount", "payment_type", "due_context", "account_or_vendor", "notes"],
    keywords: [
      "bill", "payment", "budget", "invoice", "tax", "emi", "salary", "finance", "bank",
      "upi", "credit card", "debit card", "rent", "expense", "expenses", "investment",
      "sip", "mutual fund", "stocks", "shares", "trading", "saving", "savings", "loan",
      "insurance", "premium", "cashflow", "paycheck", "reimbursement", "receipt",
      "electricity bill", "water bill", "gas bill", "wallet", "credit", "debt", "interest",
      "fd", "rd", "broker", "statement", "subscription", "gst", "salary slip",
    ],
  },
};

export const TASK_DOMAIN_OPTIONS = Object.keys(DOMAIN_CONFIGS);
export const TASK_WORKSPACE_OPTIONS = ["work", "workspace", "office"];

const FOOD_WORDS = [
  "chicken", "rice", "curry", "pasta", "bread", "egg", "milk", "vegetable", "mutton", "beef",
  "fish", "salmon", "tuna", "prawns", "shrimp", "paneer", "tofu", "dal", "lentils", "beans",
  "potato", "tomato", "onion", "garlic", "ginger", "spinach", "broccoli", "carrot", "cauliflower",
  "mushroom", "capsicum", "pepper", "lettuce", "cabbage", "corn", "peas", "apple", "banana",
  "orange", "mango", "grape", "berry", "strawberry", "watermelon", "pineapple", "oats", "roti",
  "naan", "biryani", "noodles", "soup", "salad", "sandwich", "pizza", "burger", "omelette",
  "cheese", "yogurt", "curd", "butter", "cream", "sugar", "salt", "masala", "turmeric", "cumin",
  "coriander", "chilli", "mint", "basil", "momos", "dumplings", "dosa", "idli", "sambar",
  "poha", "upma", "paratha", "chole", "rajma", "kebab", "fried rice", "manchurian", "pulao",
  "khichdi", "khichri", "kachori", "samosa", "pakora", "pakoda", "jalebi", "gulab jamun",
  "rasgulla", "rasmalai", "halwa", "kheer", "lassi", "chai", "tea", "coffee", "juice",
  "smoothie", "shake", "wrap", "roll", "frankie", "pav bhaji", "vada pav", "misal", "bhindi",
  "aloo", "gobi", "palak", "dal chawal",
];
const SPORT_WORDS = ["cricket", "football", "tennis", "basketball", "ipl", "badminton", "run", "kabaddi", "hockey", "swimming", "cycling", "yoga"];
const FINANCE_WORDS = ["bill", "payment", "rent", "emi", "invoice", "tax", "upi", "bank", "salary", "investment", "expense", "loan", "insurance", "subscription", "gst"];
const HEALTH_WORDS = ["vitamin", "medicine", "doctor", "hydration", "water", "sleep", "supplement", "fever", "cold", "cough", "headache", "pain", "protein shake", "multivitamin", "creatine"];
const TRAVEL_WORDS = ["trip", "travel", "flight", "train", "hotel", "packing", "ticket", "visa", "passport", "airport", "booking"];
const STUDY_WORDS = ["study", "exam", "revision", "homework", "assignment", "course", "syllabus", "lecture", "chapter", "quiz", "test"];
const PLACE_WORDS = ["goa", "mumbai", "delhi", "bangalore", "bengaluru", "dubai", "london", "paris", "singapore", "pune", "hyderabad", "chennai", "kolkata", "jaipur", "manali"];
const FINANCE_VENDORS = ["hdfc", "sbi", "icici", "axis", "landlord", "landowner", "broker", "amazon", "flipkart", "swiggy", "zomato", "uber", "ola", "airtel", "jio"];
const STUDY_SUBJECTS = ["math", "maths", "mathematics", "physics", "chemistry", "biology", "english", "history", "geography", "economics", "accounting", "cs", "computer science"];
const MEDICATION_WORDS = ["vitamin d", "vitamin c", "multivitamin", "protein shake", "creatine", "medicine", "painkiller", "tablet", "capsule"];

const DOMAIN_WEIGHTED_HINTS: Record<string, [string, number][]> = {
  cooking: [
    ["meal prep", 3], ["dal chawal", 3], ["fried rice", 3], ["pav bhaji", 3], ["vada pav", 3],
    ["gulab jamun", 3], ["momos", 4], ["recipe", 3], ["ingredients", 2],
  ],
  sports: [
    ["net practice", 4], ["matchday", 3], ["batting", 3], ["bowling", 3], ["fielding", 3],
    ["training", 2], ["practice", 2],
  ],
  health: [
    ["protein shake", 4], ["mental health", 4], ["blood pressure", 4], ["heart rate", 4],
    ["multivitamin", 3], ["doctor appointment", 4],
  ],
  finance: [
    ["electricity bill", 5], ["water bill", 5], ["credit card", 4], ["debit card", 4],
    ["mutual fund", 4], ["salary slip", 4], ["upi", 3],
  ],
  travel: [
    ["boarding pass", 5], ["train ticket", 4], ["flight ticket", 4], ["visa docs", 5],
    ["hotel booking", 4], ["packing list", 3],
  ],
  study: [
    ["study plan", 4], ["exam prep", 4], ["lecture notes", 4], ["homework", 3], ["revision", 3],
  ],
};

const normalizeText = (value: string) => String(value || "").trim().toLowerCase();

export const normalizeTaskWorkspace = (value: unknown) => {
  const workspace = String(value || "").trim().toLowerCase();
  return TASK_WORKSPACE_OPTIONS.includes(workspace) ? workspace : "work";
};

export const normalizeTaskDomain = (value: unknown) => {
  const domain = String(value || "").trim().toLowerCase();
  if (domain === "general") return "work";
  return DOMAIN_CONFIGS[domain] ? domain : "work";
};

const inferWorkspaceFromText = (value: string) => {
  const normalized = normalizeText(value);
  if (normalized.includes("office")) return "office";
  if (normalized.includes("workspace")) return "workspace";
  return "work";
};

const toDateInputValue = (date: Date) => {
  const next = new Date(date);
  next.setMinutes(next.getMinutes() - next.getTimezoneOffset());
  return next.toISOString().slice(0, 16);
};

export function inferDueDateFromText(value: string) {
  const text = normalizeText(value);
  if (!text.trim()) return "";
  const now = new Date();
  const dueDate = new Date(now);
  if (text.includes("tonight")) {
    dueDate.setHours(19, 0, 0, 0);
    return toDateInputValue(dueDate);
  }
  if (text.includes("tomorrow")) {
    dueDate.setDate(dueDate.getDate() + 1);
    if (text.includes("morning")) dueDate.setHours(9, 0, 0, 0);
    else if (text.includes("evening")) dueDate.setHours(18, 0, 0, 0);
    else dueDate.setHours(10, 0, 0, 0);
    return toDateInputValue(dueDate);
  }
  if (text.includes("today") || text.includes("eod")) {
    dueDate.setHours(text.includes("eod") ? 17 : 15, 0, 0, 0);
    return toDateInputValue(dueDate);
  }
  return "";
}

const scoreDomain = (text: string, domain: string) => {
  const keywordScore = DOMAIN_CONFIGS[domain].keywords.reduce(
    (sum, keyword) => sum + (text.includes(keyword) ? 1 : 0),
    0
  );
  const weightedScore = (DOMAIN_WEIGHTED_HINTS[domain] || []).reduce(
    (sum, [phrase, weight]) => sum + (text.includes(phrase) ? weight : 0),
    0
  );
  return keywordScore + weightedScore;
};

const extractEntities = (text: string) => {
  const entities: IntentEntity[] = [];
  if (text.includes("today")) entities.push({ type: "time", value: "today" });
  if (text.includes("tomorrow")) entities.push({ type: "time", value: "tomorrow" });
  if (text.includes("tonight")) entities.push({ type: "time", value: "tonight" });
  FOOD_WORDS.filter((word) => text.includes(word)).forEach((word) =>
    entities.push({ type: "food", value: word })
  );
  SPORT_WORDS.filter((word) => text.includes(word)).forEach((word) =>
    entities.push({ type: "sport", value: word })
  );
  FINANCE_WORDS.filter((word) => text.includes(word)).forEach((word) =>
    entities.push({ type: "finance", value: word })
  );
  HEALTH_WORDS.filter((word) => text.includes(word)).forEach((word) =>
    entities.push({ type: "health", value: word })
  );
  TRAVEL_WORDS.filter((word) => text.includes(word)).forEach((word) =>
    entities.push({ type: "travel", value: word })
  );
  STUDY_WORDS.filter((word) => text.includes(word)).forEach((word) =>
    entities.push({ type: "study", value: word })
  );
  PLACE_WORDS.filter((word) => text.includes(word)).forEach((word) =>
    entities.push({ type: "place", value: word })
  );
  FINANCE_VENDORS.filter((word) => text.includes(word)).forEach((word) =>
    entities.push({ type: "vendor", value: word })
  );
  STUDY_SUBJECTS.filter((word) => text.includes(word)).forEach((word) =>
    entities.push({ type: "subject", value: word })
  );
  MEDICATION_WORDS.filter((word) => text.includes(word)).forEach((word) =>
    entities.push({ type: "medication", value: word })
  );
  return entities;
};

const formatEntityValue = (value = "") =>
  String(value || "")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());

const firstEntityValue = (entities: IntentEntity[], type: string) => {
  const match = entities
    .filter((entity) => entity?.type === type && entity?.value)
    .sort((left, right) => String(right.value).length - String(left.value).length)[0];
  return formatEntityValue(match?.value || "");
};

const inferSubtype = (domain: string, text: string) => {
  if (domain === "cooking") return text.includes("meal prep") ? "meal-prep" : "recipe";
  if (domain === "sports") return text.includes("match") ? "match" : "training";
  if (domain === "health") return text.includes("vitamin") || text.includes("medication") ? "medication" : "wellness";
  if (domain === "travel") return "trip";
  if (domain === "finance") return "money";
  if (domain === "study") return "learning";
  return "work";
};

const inferDynamicFields = (domain: string, text: string, entities: IntentEntity[]): Record<string, unknown> => {
  if (domain === "cooking") {
    return {
      ingredients: FOOD_WORDS.filter((word) => text.includes(word)),
      steps: [],
      servings: "",
      cook_time: "",
      grocery: text.includes("buy") || text.includes("need") || text.includes("ingredients"),
    };
  }
  if (domain === "sports") {
    return {
      training_type: text.includes("match") ? "match prep" : text.includes("practice") ? "practice" : "",
      equipment: [],
      duration: "",
      players_or_team: SPORT_WORDS.find((word) => text.includes(word)) || "",
      score_or_goal: "",
    };
  }
  if (domain === "health") {
    const medication = firstEntityValue(entities, "medication");
    return {
      symptoms_or_goal: text.includes("vitamin") ? "Take vitamins" : "",
      medication: medication || (text.includes("vitamin") ? "Vitamins" : ""),
      hydration: text.includes("water") ? "Hydrate" : "",
      duration: "",
      metrics: [],
    };
  }
  if (domain === "travel") {
    const destination = firstEntityValue(entities, "place");
    return {
      destination,
      transport: text.includes("flight") ? "Flight" : text.includes("train") ? "Train" : "",
      stay: text.includes("hotel") ? "Hotel" : "",
      packing_list: [],
      budget: "",
    };
  }
  if (domain === "finance") {
    const vendor = firstEntityValue(entities, "vendor");
    return {
      amount: "",
      payment_type: text.includes("rent") ? "Rent" : text.includes("bill") ? "Bill" : "",
      due_context: "",
      account_or_vendor: vendor,
      notes: "",
    };
  }
  if (domain === "study") {
    const subject = firstEntityValue(entities, "subject");
    return {
      subject,
      topic_list: [],
      study_duration: "",
      exam_date: "",
      resources: [],
    };
  }
  return {};
};

const pickDomainFromEntities = (entities: IntentEntity[]) => {
  if (entities.some((entity) => entity?.type === "finance")) return "finance";
  if (entities.some((entity) => entity?.type === "travel")) return "travel";
  if (entities.some((entity) => entity?.type === "health")) return "health";
  if (entities.some((entity) => entity?.type === "sport")) return "sports";
  if (entities.some((entity) => entity?.type === "food")) return "cooking";
  return "";
};

const unique = (values: unknown[]) => [...new Set(values.filter(Boolean))];

export function inferTaskProfile(
  rawText: string,
  overrides: {
    domain?: string;
    subtype?: string;
    confidence?: number;
    entities?: IntentEntity[];
    workspace?: string;
    dynamicFields?: Record<string, unknown>;
    source?: string;
    dueDate?: string;
  } = {}
): TaskIntentProfile {
  const text = String(rawText || "").trim();
  const normalizedText = text.toLowerCase();
  const scoredDomains = TASK_DOMAIN_OPTIONS.map((domain) => ({
    domain,
    score: scoreDomain(normalizedText, domain),
  })).sort((a, b) => b.score - a.score);
  const bestMatch = scoredDomains[0];
  const extractedEntities = unique([...(overrides.entities || []), ...extractEntities(normalizedText)]).map(
    (entity) => (typeof entity === "string" ? { type: "keyword", value: entity } : entity)
  ) as IntentEntity[];
  const entityDomain = pickDomainFromEntities(extractedEntities);
  const domain = normalizeTaskDomain(
    overrides.domain || entityDomain || (bestMatch?.score > 0 ? bestMatch.domain : "work")
  );
  const confidence =
    overrides.confidence ??
    (domain === "work" ? 0.34 : Math.min(0.98, 0.55 + Math.min(0.4, (bestMatch?.score || 0) * 0.08)));
  const dynamicFields = {
    ...inferDynamicFields(domain, normalizedText, extractedEntities),
    ...(overrides.dynamicFields || {}),
  };

  return {
    workspace: normalizeTaskWorkspace(overrides.workspace || inferWorkspaceFromText(normalizedText)),
    intent: {
      domain,
      subtype: String(overrides.subtype || inferSubtype(domain, normalizedText)),
      confidence: Number(confidence.toFixed(2)),
      entities: extractedEntities,
      source: overrides.source || "ige-hybrid-ontology",
    },
    capabilities: [...DOMAIN_CONFIGS[domain].capabilities],
    dynamicFields,
    dueDate: overrides.dueDate || inferDueDateFromText(normalizedText),
  };
}

export function getDomainConfig(domain: string): DomainConfig {
  return DOMAIN_CONFIGS[normalizeTaskDomain(domain)];
}

export function getDomainFieldDefinitions(domain: string): DomainFieldDefinition[] {
  const normalizedDomain = normalizeTaskDomain(domain);
  if (normalizedDomain === "cooking") {
    return [
      { key: "ingredients", label: "Ingredients", type: "string-list", placeholder: "chicken\nonion\ngarlic" },
      { key: "steps", label: "Steps", type: "string-list", placeholder: "Prep ingredients\nCook curry" },
      { key: "servings", label: "Servings", type: "text", placeholder: "4" },
      { key: "cook_time", label: "Cook time", type: "text", placeholder: "45 min" },
      { key: "grocery", label: "Need grocery prep", type: "boolean" },
    ];
  }
  if (normalizedDomain === "sports") {
    return [
      { key: "training_type", label: "Training type", type: "text", placeholder: "Practice session" },
      { key: "equipment", label: "Equipment", type: "string-list", placeholder: "Bat\nGloves\nShoes" },
      { key: "duration", label: "Duration", type: "text", placeholder: "90 min" },
      { key: "players_or_team", label: "Players or team", type: "text", placeholder: "IPL squad" },
      { key: "score_or_goal", label: "Score or goal", type: "text", placeholder: "Target: 30 mins fitness" },
    ];
  }
  if (normalizedDomain === "health") {
    return [
      { key: "symptoms_or_goal", label: "Goal or symptom", type: "text", placeholder: "Recovery, vitamins, stretch" },
      { key: "medication", label: "Medication", type: "text", placeholder: "Vitamin D" },
      { key: "hydration", label: "Hydration", type: "text", placeholder: "2L water" },
      { key: "duration", label: "Duration", type: "text", placeholder: "15 min" },
      { key: "metrics", label: "Metrics", type: "string-list", placeholder: "Sleep: 7h\nWater: 2L" },
    ];
  }
  if (normalizedDomain === "travel") {
    return [
      { key: "destination", label: "Destination", type: "text", placeholder: "Goa" },
      { key: "transport", label: "Transport", type: "text", placeholder: "Flight" },
      { key: "stay", label: "Stay", type: "text", placeholder: "Hotel or host" },
      { key: "packing_list", label: "Packing list", type: "string-list", placeholder: "Passport\nCharger\nClothes" },
      { key: "budget", label: "Budget", type: "text", placeholder: "₹20,000" },
    ];
  }
  if (normalizedDomain === "finance") {
    return [
      { key: "amount", label: "Amount", type: "text", placeholder: "₹5,000" },
      { key: "payment_type", label: "Payment type", type: "text", placeholder: "Rent, EMI, bill" },
      { key: "due_context", label: "Due context", type: "text", placeholder: "End of month" },
      { key: "account_or_vendor", label: "Account or vendor", type: "text", placeholder: "HDFC, landlord" },
      { key: "notes", label: "Notes", type: "text", placeholder: "Auto debit or transfer details" },
    ];
  }
  if (normalizedDomain === "study") {
    return [
      { key: "subject", label: "Subject", type: "text", placeholder: "Maths" },
      { key: "topic_list", label: "Topics", type: "string-list", placeholder: "Algebra\nTrigonometry" },
      { key: "study_duration", label: "Study duration", type: "text", placeholder: "2 hours" },
      { key: "exam_date", label: "Exam date", type: "text", placeholder: "Next Monday" },
      { key: "resources", label: "Resources", type: "string-list", placeholder: "Notebook\nLecture video" },
    ];
  }
  return [];
}

export function normalizeDynamicFieldsForDomain(domain: string, fields: Record<string, unknown> = {}) {
  const normalizedDomain = normalizeTaskDomain(domain);
  const allowedKeys = new Set(DOMAIN_CONFIGS[normalizedDomain].dynamicFields);
  return Object.entries(fields || {}).reduce<Record<string, unknown>>((acc, [key, value]) => {
    if (!allowedKeys.has(key)) return acc;
    if (Array.isArray(value)) {
      acc[key] = value.map((item) => String(item || "").trim()).filter(Boolean);
      return acc;
    }
    if (typeof value === "boolean") {
      acc[key] = value;
      return acc;
    }
    acc[key] = String(value || "").trim();
    return acc;
  }, {});
}

export function buildTaskCreateInitialValues(
  text: string,
  base: {
    description?: string;
    priority?: string;
    dueDate?: string;
  } = {}
) {
  const inferred = inferTaskProfile(text, base);
  return {
    title: text || "",
    description: base.description || "",
    priority: base.priority || "medium",
    dueDate: inferred.dueDate || base.dueDate || "",
    workspace: inferred.workspace,
    intent: inferred.intent,
    capabilities: inferred.capabilities,
    dynamicFields: normalizeDynamicFieldsForDomain(inferred.intent.domain, inferred.dynamicFields),
  };
}

export function summarizeDynamicFields(domain: string, dynamicFields: Record<string, unknown> = {}) {
  const normalizedDomain = normalizeTaskDomain(domain);
  if (normalizedDomain === "cooking") {
    const ingredientsCount = Array.isArray(dynamicFields.ingredients) ? dynamicFields.ingredients.length : 0;
    const servings = dynamicFields.servings ? `${dynamicFields.servings} servings` : "";
    return [ingredientsCount ? `${ingredientsCount} ingredients` : "", servings, dynamicFields.cook_time].filter(Boolean);
  }
  if (normalizedDomain === "sports") {
    return [dynamicFields.training_type, dynamicFields.duration, dynamicFields.players_or_team].filter(Boolean);
  }
  if (normalizedDomain === "health") {
    return [dynamicFields.symptoms_or_goal, dynamicFields.medication, dynamicFields.hydration].filter(Boolean);
  }
  if (normalizedDomain === "travel") {
    return [dynamicFields.destination, dynamicFields.transport, dynamicFields.budget].filter(Boolean);
  }
  if (normalizedDomain === "finance") {
    return [dynamicFields.amount, dynamicFields.payment_type, dynamicFields.account_or_vendor].filter(Boolean);
  }
  if (normalizedDomain === "study") {
    const topicCount = Array.isArray(dynamicFields.topic_list) ? dynamicFields.topic_list.length : 0;
    return [dynamicFields.subject, topicCount ? `${topicCount} topics` : "", dynamicFields.study_duration].filter(Boolean);
  }
  return [] as unknown[];
}

export function getDomainSuggestionMeta(domain: string, label: string) {
  const metaByDomain: Record<string, { suggestion: string; subtitle: string; secondaryLabel: string }> = {
    cooking: { suggestion: `${label} task`, subtitle: "This looks like a dish or recipe intent.", secondaryLabel: "Add recipe note" },
    sports: { suggestion: `${label} task`, subtitle: "This looks like a sport or training intent.", secondaryLabel: "Add practice note" },
    health: { suggestion: `${label} task`, subtitle: "This looks like a health or wellness intent.", secondaryLabel: "Add health note" },
    travel: { suggestion: `${label} task`, subtitle: "This looks like a travel intent.", secondaryLabel: "Add trip note" },
    finance: { suggestion: `${label} task`, subtitle: "This looks like a payment or money intent.", secondaryLabel: "Add payment note" },
    study: { suggestion: `${label} task`, subtitle: "This looks like a learning or exam intent.", secondaryLabel: "Add study note" },
  };
  return (
    metaByDomain[normalizeTaskDomain(domain)] || {
      suggestion: `${label} task`,
      subtitle: `This looks like a ${String(label || "task").toLowerCase()} intent.`,
      secondaryLabel: "Add task note",
    }
  );
}

export const DOMAIN_LABELS: Record<string, string> = {
  work: "Work",
  cooking: "Cooking",
  sports: "Sports",
  health: "Health",
  study: "Study",
  travel: "Travel",
  finance: "Finance",
};