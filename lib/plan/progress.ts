import type { TaskStatus } from '../domain/types';
import type { PlanItem } from './engine';

export interface PlanProgress {
  /** The builder's controls: everything the builder has to do. */
  tasks: { total: number; done: number; todo: number };
  /** The questions the tools couldn't settle, answered either way. */
  questions: { total: number; answered: number };
}

/** A control's status; one nobody has touched yet is not done. A project saved before "done or not done" may hold 'in-progress', which also reads as not done. */
export function taskStatusOf(item: PlanItem): TaskStatus {
  return item.status && 'status' in item.status && item.status.status === 'done' ? 'done' : 'todo';
}

/** How far a saved project has got. A question answered "applies" becomes a task, so it counts in both. */
export function planProgress(items: PlanItem[]): PlanProgress {
  const tasks = { total: 0, done: 0, todo: 0 };
  const questions = { total: 0, answered: 0 };
  for (const item of items) {
    if (item.heading === 'you') {
      tasks.total++;
      if (taskStatusOf(item) === 'done') tasks.done++;
      else tasks.todo++;
    }
    const answered = item.placement === 'answered-applies' || item.placement === 'answered-not-applicable';
    if (answered || item.heading === 'questions') {
      questions.total++;
      if (answered) questions.answered++;
    }
  }
  return { tasks, questions };
}
