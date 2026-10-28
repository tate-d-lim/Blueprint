import { planProgress, taskStatusOf } from '@/lib/plan/progress';
import { makeItem } from '../helpers/factories';

const task = (id: string, status?: 'todo' | 'in-progress' | 'done') =>
  makeItem({ id, heading: 'you', placement: 'app-builder', ...(status && { status: { status } }) });

test('tasks are counted by status, and a task with no status yet is to do', () => {
  const progress = planProgress([task('a', 'done'), task('b', 'done'), task('c', 'in-progress'), task('d', 'todo'), task('e')]);
  expect(progress.tasks).toEqual({ total: 5, done: 2, inProgress: 1, todo: 2 });
});

test('a question answered "applies" counts as answered and as a task; "doesn\'t apply" counts as answered only', () => {
  const progress = planProgress([
    makeItem({ id: 'q1', heading: 'you', placement: 'answered-applies', status: { status: 'done' } }),
    makeItem({ id: 'q2', heading: 'questions', placement: 'answered-not-applicable', status: { applies: false, reason: 'No SMS.' } }),
    makeItem({ id: 'q3', heading: 'questions', placement: 'open' }),
  ]);
  expect(progress.questions).toEqual({ total: 3, answered: 2 });
  expect(progress.tasks).toEqual({ total: 1, done: 1, inProgress: 0, todo: 0 });
});

test('what the platform covers and the good-to-have extras are not part of progress', () => {
  const progress = planProgress([
    makeItem({ id: 'p', heading: 'platform', placement: 'provided' }),
    makeItem({ id: 'g', heading: 'good-to-have', placement: 'app-builder', level: 2 }),
  ]);
  expect(progress).toEqual({ tasks: { total: 0, done: 0, inProgress: 0, todo: 0 }, questions: { total: 0, answered: 0 } });
});

test('taskStatusOf reads a task status and treats anything else as to do', () => {
  expect(taskStatusOf(task('a', 'in-progress'))).toBe('in-progress');
  expect(taskStatusOf(task('b'))).toBe('todo');
  expect(taskStatusOf(makeItem({ status: { applies: false, reason: 'x' } }))).toBe('todo');
});
