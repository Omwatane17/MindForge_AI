import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

async function generateJSON<T>(prompt: string, fallback: T): Promise<T> {
  try {
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_api_key_here') {
      console.warn('No Gemini API key configured, using fallback');
      return fallback;
    }
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) || text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1] || jsonMatch[0]);
    }
    return JSON.parse(text);
  } catch (err) {
    console.error('AI generation error:', err);
    return fallback;
  }
}

export interface ParsedGoal {
  goal: string;
  deadline: string; // ISO date string
  priority: 'critical' | 'high' | 'medium' | 'low';
  estimatedEffortHours: number;
  description: string;
}

export async function parseGoal(text: string): Promise<ParsedGoal> {
  const today = new Date().toISOString().split('T')[0];
  const prompt = `You are an AI deadline detection engine. Parse this user input and extract goal, deadline, priority, and effort.

User input: "${text}"
Today's date: ${today}

Return ONLY valid JSON in this exact format:
\`\`\`json
{
  "goal": "clear goal title (max 60 chars)",
  "deadline": "YYYY-MM-DD format (calculate from today if relative like 'in 3 days')",
  "priority": "critical|high|medium|low",
  "estimatedEffortHours": 20,
  "description": "brief description of what needs to be accomplished"
}
\`\`\``;

  const daysFromNow = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  };

  return generateJSON<ParsedGoal>(prompt, {
    goal: text.slice(0, 60),
    deadline: daysFromNow(7),
    priority: 'high',
    estimatedEffortHours: 20,
    description: text,
  });
}

export interface GeneratedTask {
  id: string;
  title: string;
  description: string;
  estimatedMinutes: number;
  priorityScore: number;
  isCritical: boolean;
  canSkip: boolean;
  whyPriority: string;
  orderIndex: number;
}

export interface TaskDependency {
  taskId: string;
  dependsOnTaskId: string;
}

export interface TasksResult {
  tasks: GeneratedTask[];
  dependencies: TaskDependency[];
}

export async function generateTasks(goal: string, deadline: string, effortHours: number): Promise<TasksResult> {
  const prompt = `You are an AI task breakdown engine for a deadline survival application.

Goal: "${goal}"
Deadline: ${deadline}
Estimated total effort: ${effortHours} hours

Break this goal into 6-12 specific, actionable tasks. Identify which tasks are critical (blocking others), which can be skipped if time runs out, and task dependencies.

Return ONLY valid JSON:
\`\`\`json
{
  "tasks": [
    {
      "id": "task-1",
      "title": "Task title",
      "description": "What specifically needs to be done",
      "estimatedMinutes": 90,
      "priorityScore": 95,
      "isCritical": true,
      "canSkip": false,
      "whyPriority": "This task blocks 3 other tasks and is on the critical path",
      "orderIndex": 0
    }
  ],
  "dependencies": [
    { "taskId": "task-2", "dependsOnTaskId": "task-1" }
  ]
}
\`\`\`

Rules:
- priorityScore: 0-100 (higher = more urgent)
- isCritical: true if this task blocks multiple others or is essential for deadline
- canSkip: true if this is polish/nice-to-have that can be cut
- Order tasks from most fundamental to least
- Include realistic time estimates`;

  return generateJSON<TasksResult>(prompt, {
    tasks: [
      { id: 'task-1', title: 'Project Setup & Planning', description: 'Set up the project structure and plan the approach', estimatedMinutes: 60, priorityScore: 95, isCritical: true, canSkip: false, whyPriority: 'Foundation for all other tasks', orderIndex: 0 },
      { id: 'task-2', title: 'Core Implementation', description: 'Build the main functionality', estimatedMinutes: 180, priorityScore: 90, isCritical: true, canSkip: false, whyPriority: 'Central feature required for completion', orderIndex: 1 },
      { id: 'task-3', title: 'Testing & Validation', description: 'Test the implementation thoroughly', estimatedMinutes: 90, priorityScore: 75, isCritical: true, canSkip: false, whyPriority: 'Required for quality submission', orderIndex: 2 },
      { id: 'task-4', title: 'Documentation', description: 'Write necessary documentation', estimatedMinutes: 60, priorityScore: 60, isCritical: false, canSkip: true, whyPriority: 'Important but can be minimal if time is short', orderIndex: 3 },
      { id: 'task-5', title: 'Final Polish', description: 'UI/UX improvements and final touches', estimatedMinutes: 45, priorityScore: 30, isCritical: false, canSkip: true, whyPriority: 'Nice-to-have, skip if running out of time', orderIndex: 4 },
    ],
    dependencies: [
      { taskId: 'task-2', dependsOnTaskId: 'task-1' },
      { taskId: 'task-3', dependsOnTaskId: 'task-2' },
      { taskId: 'task-4', dependsOnTaskId: 'task-3' },
      { taskId: 'task-5', dependsOnTaskId: 'task-4' },
    ],
  });
}

export interface MindMapNode {
  id: string;
  label: string;
  type: 'goal' | 'task' | 'subtask';
  priority: number;
  status: string;
}

export interface MindMapEdge {
  source: string;
  target: string;
  label?: string;
}

export interface MindMapResult {
  nodes: MindMapNode[];
  edges: MindMapEdge[];
}

export async function generateMindMap(goal: string, tasks: Array<{ id: string; title: string; priorityScore: number; status: string }>): Promise<MindMapResult> {
  const nodes: MindMapNode[] = [
    { id: 'goal', label: goal.slice(0, 40), type: 'goal', priority: 100, status: 'active' },
    ...tasks.map(t => ({ id: t.id, label: t.title, type: 'task' as const, priority: t.priorityScore, status: t.status })),
  ];
  const edges: MindMapEdge[] = tasks.map(t => ({ source: 'goal', target: t.id }));
  return { nodes, edges };
}

export interface RiskAssessment {
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  survivalScore: number;
  predictedDelayHours: number;
  failureReason: string;
  recommendation: string;
}

export function calculateRisk(
  completedMinutes: number,
  totalMinutes: number,
  deadlineDate: string,
  availableHoursPerDay: number = 8
): RiskAssessment {
  const now = new Date();
  const deadline = new Date(deadlineDate);
  const hoursUntilDeadline = Math.max(0, (deadline.getTime() - now.getTime()) / (1000 * 60 * 60));
  const daysUntilDeadline = hoursUntilDeadline / 24;
  const availableHoursTotal = daysUntilDeadline * availableHoursPerDay;
  
  const remainingMinutes = totalMinutes - completedMinutes;
  const remainingHours = remainingMinutes / 60;
  
  const progressPct = totalMinutes > 0 ? (completedMinutes / totalMinutes) * 100 : 0;
  
  let survivalScore: number;
  let riskLevel: RiskAssessment['riskLevel'];
  let predictedDelayHours = 0;
  let failureReason = '';
  let recommendation = '';

  if (availableHoursTotal <= 0) {
    survivalScore = 0;
    riskLevel = 'critical';
    failureReason = 'Deadline has passed';
    recommendation = 'The deadline has passed. Focus on damage control.';
    predictedDelayHours = remainingHours;
  } else if (remainingHours <= 0) {
    survivalScore = 100;
    riskLevel = 'low';
    recommendation = 'All tasks completed! Great work.';
  } else {
    const ratio = availableHoursTotal / remainingHours;
    survivalScore = Math.min(100, Math.round(ratio * 60 + progressPct * 0.4));
    
    if (survivalScore >= 80) {
      riskLevel = 'low';
      recommendation = 'You are on track. Keep the current pace.';
    } else if (survivalScore >= 60) {
      riskLevel = 'medium';
      recommendation = 'You may need to increase your work pace to meet the deadline.';
    } else if (survivalScore >= 40) {
      riskLevel = 'high';
      failureReason = `You need ${remainingHours.toFixed(1)}h but only have ${availableHoursTotal.toFixed(1)}h available.`;
      recommendation = 'Consider activating Rescue Mode to identify what to skip.';
    } else {
      riskLevel = 'critical';
      predictedDelayHours = Math.max(0, remainingHours - availableHoursTotal);
      failureReason = `Shortfall of ${predictedDelayHours.toFixed(1)} hours. Original plan will fail.`;
      recommendation = 'ACTIVATE RESCUE MODE NOW. Identify critical tasks and skip non-essentials.';
    }
  }

  return { riskLevel, survivalScore: Math.max(0, survivalScore), predictedDelayHours, failureReason, recommendation };
}

export interface RescuePlan {
  criticalTasks: string[];
  skipTasks: string[];
  reorderedTasks: string[];
  timeSavedHours: number;
  newCompletionEstimate: string;
  newSurvivalScore: number;
  explanation: string;
}

export async function activateRescueMode(
  availableHours: number,
  tasks: Array<{ id: string; title: string; estimatedMinutes: number; isCritical: boolean; canSkip: boolean; status: string; priorityScore: number }>
): Promise<RescuePlan> {
  const pendingTasks = tasks.filter(t => t.status === 'pending' || t.status === 'in_progress');
  const requiredHours = pendingTasks.reduce((sum, t) => sum + t.estimatedMinutes / 60, 0);

  const prompt = `You are a LAST-MINUTE RESCUE AI for a deadline survival application.

Available time: ${availableHours} hours
Required work: ${requiredHours.toFixed(1)} hours
Time deficit: ${(requiredHours - availableHours).toFixed(1)} hours

Pending tasks:
${pendingTasks.map(t => `- ${t.id}: "${t.title}" (${t.estimatedMinutes}min, critical:${t.isCritical}, skippable:${t.canSkip}, priority:${t.priorityScore})`).join('\n')}

Determine the optimal rescue plan: which tasks MUST be done, which to skip, and the new survival probability.

Return ONLY valid JSON:
\`\`\`json
{
  "criticalTasks": ["task-id-1", "task-id-2"],
  "skipTasks": ["task-id-3"],
  "reorderedTasks": ["task-id-1", "task-id-2"],
  "timeSavedHours": 2.5,
  "newCompletionEstimate": "5h 20m",
  "newSurvivalScore": 82,
  "explanation": "By skipping X and Y, you save 2.5 hours and can focus on the critical path."
}
\`\`\``;

  // Deterministic fallback calculation
  const sortedByPriority = [...pendingTasks].sort((a, b) => b.priorityScore - a.priorityScore);
  const criticalTasks: string[] = [];
  const skipTasks: string[] = [];
  let accumulatedHours = 0;

  for (const task of sortedByPriority) {
    const taskHours = task.estimatedMinutes / 60;
    if (accumulatedHours + taskHours <= availableHours && !task.canSkip) {
      criticalTasks.push(task.id);
      accumulatedHours += taskHours;
    } else if (task.canSkip) {
      skipTasks.push(task.id);
    } else if (accumulatedHours + taskHours <= availableHours) {
      criticalTasks.push(task.id);
      accumulatedHours += taskHours;
    } else {
      skipTasks.push(task.id);
    }
  }

  const timeSaved = skipTasks.reduce((sum, id) => {
    const task = tasks.find(t => t.id === id);
    return sum + (task ? task.estimatedMinutes / 60 : 0);
  }, 0);

  const newRequired = requiredHours - timeSaved;
  const newSurvival = Math.min(100, Math.round((availableHours / Math.max(newRequired, 0.1)) * 70));
  const newMinutes = Math.round(newRequired * 60);
  const newH = Math.floor(newMinutes / 60);
  const newM = newMinutes % 60;

  const fallback: RescuePlan = {
    criticalTasks,
    skipTasks,
    reorderedTasks: criticalTasks,
    timeSavedHours: timeSaved,
    newCompletionEstimate: `${newH}h ${newM}m`,
    newSurvivalScore: Math.max(0, newSurvival),
    explanation: `By skipping ${skipTasks.length} non-critical tasks, you save ${timeSaved.toFixed(1)} hours. Focus on the ${criticalTasks.length} critical tasks.`,
  };

  return generateJSON<RescuePlan>(prompt, fallback);
}

export async function generateActionPlan(
  tasks: Array<{ id: string; title: string; estimatedMinutes: number; priorityScore: number }>,
  deadline: string,
  availableHoursPerDay: number
): Promise<Array<{ taskId: string; dayNumber: number; plannedDate: string; plannedHours: number }>> {
  const sortedTasks = [...tasks].sort((a, b) => b.priorityScore - a.priorityScore);
  const plan: Array<{ taskId: string; dayNumber: number; plannedDate: string; plannedHours: number }> = [];
  
  let currentDay = 0;
  let hoursUsedToday = 0;
  const now = new Date();

  for (const task of sortedTasks) {
    const taskHours = task.estimatedMinutes / 60;
    
    if (hoursUsedToday + taskHours > availableHoursPerDay) {
      currentDay++;
      hoursUsedToday = 0;
    }

    const plannedDate = new Date(now);
    plannedDate.setDate(plannedDate.getDate() + currentDay);
    
    plan.push({
      taskId: task.id,
      dayNumber: currentDay + 1,
      plannedDate: plannedDate.toISOString().split('T')[0],
      plannedHours: taskHours,
    });

    hoursUsedToday += taskHours;
  }

  return plan;
}
