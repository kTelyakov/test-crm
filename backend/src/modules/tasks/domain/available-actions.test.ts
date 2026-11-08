import { describe, expect, it } from 'vitest';
import type { User } from '../../identity/domain/user';
import { availableActions } from './available-actions';
import type { Task } from './task';
import type { TransitionRule } from './transition-rule';

// Те же правила, что заполняет миграция в таблице task_transitions.
const rules: TransitionRule[] = [
  {
    fromStatus: 'new',
    toStatus: 'in_progress',
    actorRole: 'executor',
    requiresAssignee: true,
    requiresComment: false,
  },
  {
    fromStatus: 'in_progress',
    toStatus: 'review',
    actorRole: 'executor',
    requiresAssignee: true,
    requiresComment: false,
  },
  {
    fromStatus: 'review',
    toStatus: 'done',
    actorRole: 'manager',
    requiresAssignee: false,
    requiresComment: false,
  },
  {
    fromStatus: 'review',
    toStatus: 'rework',
    actorRole: 'manager',
    requiresAssignee: false,
    requiresComment: true,
  },
  {
    fromStatus: 'rework',
    toStatus: 'in_progress',
    actorRole: 'executor',
    requiresAssignee: true,
    requiresComment: false,
  },
];

const assignee: User = { id: 'u-1', fullName: 'Исполнитель 1', role: 'executor' };
const otherExecutor: User = { id: 'u-2', fullName: 'Исполнитель 2', role: 'executor' };
const manager: User = { id: 'u-3', fullName: 'Руководитель', role: 'manager' };

const taskIn = (status: Task['status']): Task => ({
  id: 't-1',
  siteId: 's-1',
  title: 'Задача',
  description: '',
  status,
  assigneeId: assignee.id,
  assigneeName: assignee.fullName,
  createdBy: manager.id,
  createdAt: '2026-01-01T00:00:00Z',
});

describe('availableActions', () => {
  it('Исполнитель видит кнопку только своего перехода', () => {
    expect(availableActions(taskIn('new'), assignee, rules)).toEqual([
      { toStatus: 'in_progress', requiresComment: false },
    ]);
  });

  it('Постановщик на проверке видит «Принять» и «Вернуть на доработку» (с комментарием)', () => {
    expect(availableActions(taskIn('review'), manager, rules)).toEqual([
      { toStatus: 'done', requiresComment: false },
      { toStatus: 'rework', requiresComment: true },
    ]);
  });

  it('Не назначенный исполнитель не получает действий', () => {
    expect(availableActions(taskIn('new'), otherExecutor, rules)).toEqual([]);
  });

  it('Постановщик не получает действий исполнителя', () => {
    expect(availableActions(taskIn('new'), manager, rules)).toEqual([]);
  });

  it('Назначенный исполнитель не получает действий постановщика', () => {
    expect(availableActions(taskIn('review'), assignee, rules)).toEqual([]);
  });

  it('Из статуса «Принята» переходов нет ни у кого', () => {
    for (const user of [assignee, otherExecutor, manager]) {
      expect(availableActions(taskIn('done'), user, rules)).toEqual([]);
    }
  });

  it('Исполнитель возобновляет работу после доработки', () => {
    expect(availableActions(taskIn('rework'), assignee, rules)).toEqual([
      { toStatus: 'in_progress', requiresComment: false },
    ]);
  });

  it('Изменённое правило сразу меняет результат без правки кода', () => {
    const relaxed = rules.map((rule) =>
      rule.toStatus === 'rework' ? { ...rule, requiresComment: false } : rule,
    );
    expect(availableActions(taskIn('review'), manager, relaxed)).toContainEqual({
      toStatus: 'rework',
      requiresComment: false,
    });
  });

  it('Пустая таблица правил — нет действий', () => {
    expect(availableActions(taskIn('new'), assignee, [])).toEqual([]);
  });
});
