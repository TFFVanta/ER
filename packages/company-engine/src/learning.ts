import fs from "node:fs";

export interface LessonSummary {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  promoted: boolean;
}

export interface LearningSummary {
  hasData: boolean;
  totalLessons: number;
  promotedCount: number;
  recent: LessonSummary[];
}

interface RawLesson {
  id: string;
  title: string;
  status: string;
  created_at: string;
}

interface RawSelector {
  lesson_id: string;
}

/**
 * "Learning Labs": surfaces the lesson-capture loop that already exists in
 * apps/forge/src/objectives.js (operation learn -> lesson -> promoted to a new objective) -
 * this reads its state file directly rather than depending on apps/forge, matching every other
 * company-engine module's read-only, dependency-free pattern. Read-only: never writes lessons,
 * never promotes one - that stays an explicit `exo lesson promote` operator action.
 */
export function readLearningLabs(stateFilePath: string): LearningSummary {
  if (!fs.existsSync(stateFilePath)) {
    return { hasData: false, totalLessons: 0, promotedCount: 0, recent: [] };
  }

  const state = JSON.parse(fs.readFileSync(stateFilePath, "utf8"));
  const lessons: RawLesson[] = Array.isArray(state.lessons) ? state.lessons : [];
  const selectors: RawSelector[] = Array.isArray(state.selectors) ? state.selectors : [];
  const promotedLessonIds = new Set(selectors.map((selector) => selector.lesson_id));

  const summaries: LessonSummary[] = lessons.map((lesson) => ({
    id: lesson.id,
    title: lesson.title,
    status: lesson.status,
    createdAt: lesson.created_at,
    promoted: promotedLessonIds.has(lesson.id),
  }));

  return {
    hasData: summaries.length > 0,
    totalLessons: summaries.length,
    promotedCount: summaries.filter((summary) => summary.promoted).length,
    recent: summaries.slice(0, 5),
  };
}
