import { planProgress, taskStatusOf } from '@/lib/plan/progress';
import { makeItem } from '../helpers/factories';

const task = (id: string, status?: 'todo' | 'done') =>
  makeItem({ id, heading: 'you', placement: 'app-builder', ...(status && { status: { status } }) });

test('tasks are counted as done or not done, and a task with no status yet is not done', () => {
  const progress = planProgress([task('a', 'done'), task('b', 'done'), task('c', 'todo'), task('d')]);
  expect(progress.tasks).toEqual({ total: 4, done: 2, todo: 2 });
});

test('a question answered "applies" counts as answered and as a task; "doesn\'t apply" counts as answered only', () => {
  const progress = planProgress([
    makeItem({ id: 'q1', heading: 'you', placement: 'answered-applies', status: { status: 'done' } }),
    makeItem({ id: 'q2', heading: 'questions', placement: 'answered-not-applicable', status: { applies: false, reason: 'No SMS.' } }),
    makeItem({ id: 'q3', heading: 'questions', placement: 'open' }),
  ]);
  expect(progress.questions).toEqual({ total: 3, answered: 2 });
  expect(progress.tasks).toEqual({ total: 1, done: 1, todo: 0 });
});

test('what the platform covers and the good-to-have extras are not part of progress', () => {
  const progress = planProgress([
    makeItem({ id: 'p', heading: 'platform', placement: 'provided' }),
    makeItem({ id: 'g', heading: 'good-to-have', placement: 'app-builder', level: 2 }),
  ]);
  expect(progress).toEqual({ tasks: { total: 0, done: 0, todo: 0 }, questions: { total: 0, answered: 0 } });
});

test('taskStatusOf reads a task status and treats anything else as not done', () => {
  expect(taskStatusOf(task('a', 'done'))).toBe('done');
  expect(taskStatusOf(task('b'))).toBe('todo');
  expect(taskStatusOf(makeItem({ status: { applies: false, reason: 'x' } }))).toBe('todo');
  // A project saved before "done or not done" may hold 'in-progress'.
  expect(taskStatusOf(makeItem({ status: { status: 'in-progress' } as never }))).toBe('todo');
});
