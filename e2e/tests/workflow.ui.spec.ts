import { expect, test, type Page } from '@playwright/test';
import { createSite, createTask, userIdOf } from '../support/factories';
import { clientFor } from '../support/supabase';
import { openAs } from '../support/ui';
import { changeStatus } from '../support/workflow';
import { executor1, executor2, manager } from '../support/users';

async function newTask() {
  const managerClient = await clientFor(manager);
  const site = await createSite(managerClient);
  return createTask(managerClient, site.id, await userIdOf(await clientFor(executor1)));
}

/** Доводит задачу до «На проверке» прямыми вызовами — подготовка данных, не проверяемое действие. */
async function taskOnReview() {
  const task = await newTask();
  const executor = await clientFor(executor1);
  await changeStatus(executor, task.id, 'in_progress');
  await changeStatus(executor, task.id, 'review');
  return task;
}

const status = (page: Page, label: string) => page.getByText(label, { exact: true }).first();
const history = (page: Page) => page.getByRole('list', { name: 'История статусов' });

// Спек task-workflow: рабочий процесс через интерфейс.
test.describe('Рабочий процесс (UI)', () => {
  test('Полный цикл «Новая → Принята» с историей', async ({ browser }) => {
    const task = await newTask();

    const executorPage = await (await browser.newContext()).newPage();
    await openAs(executorPage, executor1, `/tasks/${task.id}`);
    await executorPage.getByRole('button', { name: 'Взять в работу' }).click();
    await expect(status(executorPage, 'В работе')).toBeVisible();
    await executorPage.getByRole('button', { name: 'Отправить на проверку' }).click();
    await expect(status(executorPage, 'На проверке')).toBeVisible();

    const managerPage = await (await browser.newContext()).newPage();
    await openAs(managerPage, manager, `/tasks/${task.id}`);
    await managerPage.getByRole('button', { name: 'Принять' }).click();
    await expect(status(managerPage, 'Принята')).toBeVisible();

    const entries = history(managerPage).getByRole('listitem');
    await expect(entries).toHaveCount(3);
    await expect(entries.nth(0)).toContainText('Пётр Исполнитель: Новая → В работе');
    await expect(entries.nth(1)).toContainText('Пётр Исполнитель: В работе → На проверке');
    await expect(entries.nth(2)).toContainText('Иван Руководитель: На проверке → Принята');
  });

  test('Возврат на доработку требует комментарий и сохраняет его в истории', async ({ page }) => {
    const task = await taskOnReview();
    await openAs(page, manager, `/tasks/${task.id}`);

    await page.getByRole('button', { name: 'Вернуть на доработку' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Подтвердить' }).click();
    await expect(page.getByRole('dialog').getByText('Укажите комментарий')).toBeVisible();
    await expect(status(page, 'На проверке')).toBeVisible();

    await page.getByRole('dialog').getByLabel('Комментарий').fill('Переделайте разметку');
    await page.getByRole('dialog').getByRole('button', { name: 'Подтвердить' }).click();

    await expect(status(page, 'На доработке')).toBeVisible();
    await expect(history(page)).toContainText('На проверке → На доработке');
    await expect(history(page)).toContainText('Комментарий: Переделайте разметку');
  });

  test('Исполнитель возобновляет работу после доработки', async ({ page }) => {
    const task = await taskOnReview();
    await changeStatus(await clientFor(manager), task.id, 'rework', 'Исправьте');
    await openAs(page, executor1, `/tasks/${task.id}`);

    await expect(history(page)).toContainText('Комментарий: Исправьте');
    await page.getByRole('button', { name: 'Взять в работу' }).click();
    await expect(status(page, 'В работе')).toBeVisible();
  });

  test('Исполнитель видит кнопку только своего перехода', async ({ page }) => {
    const task = await newTask();
    await openAs(page, executor1, `/tasks/${task.id}`);

    await expect(page.getByRole('button', { name: 'Взять в работу' })).toBeVisible();
    for (const name of ['Принять', 'Вернуть на доработку', 'Отправить на проверку']) {
      await expect(page.getByRole('button', { name })).toHaveCount(0);
    }
  });

  test('Постановщик на проверке видит «Принять» и «Вернуть на доработку»', async ({ page }) => {
    const task = await taskOnReview();
    await openAs(page, manager, `/tasks/${task.id}`);

    await expect(page.getByRole('button', { name: 'Принять' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Вернуть на доработку' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Взять в работу' })).toHaveCount(0);
  });

  test('Нет доступных действий: у принятой задачи кнопок смены статуса нет', async ({ page }) => {
    const task = await taskOnReview();
    await changeStatus(await clientFor(manager), task.id, 'done');
    await openAs(page, manager, `/tasks/${task.id}`);

    await expect(status(page, 'Принята')).toBeVisible();
    for (const name of [
      'Принять',
      'Вернуть на доработку',
      'Взять в работу',
      'Отправить на проверку',
    ]) {
      await expect(page.getByRole('button', { name })).toHaveCount(0);
    }
  });

  test('Не назначенный исполнитель не видит чужую задачу и её историю', async ({ page }) => {
    const task = await taskOnReview();
    await openAs(page, executor2, `/tasks/${task.id}`);

    await expect(page.getByRole('alert')).toHaveText('Задача не найдена или недоступна');
    await expect(history(page)).toHaveCount(0);
  });

  test('Задача без смен статуса: история пуста', async ({ page }) => {
    const task = await newTask();
    await openAs(page, manager, `/tasks/${task.id}`);

    await expect(page.getByText('Статус ещё не менялся')).toBeVisible();
  });
});
