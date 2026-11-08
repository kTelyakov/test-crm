import { expect, test } from '@playwright/test';
import { createExecutor, createSite, createTask, userIdOf } from '../support/factories';
import { clientFor } from '../support/supabase';
import { openAs } from '../support/ui';
import { executor1, executor2, manager } from '../support/users';

// Спек tasks: экран «Мои задачи»; спек auth: разделы по роли.
test.describe('Мои задачи (UI)', () => {
  test('Исполнитель видит только свои задачи из всех объектов со статусами', async ({ page }) => {
    const managerClient = await clientFor(manager);
    const firstSite = await createSite(managerClient);
    const secondSite = await createSite(managerClient);
    const executor1Id = await userIdOf(await clientFor(executor1));
    const executor2Id = await userIdOf(await clientFor(executor2));
    const a = await createTask(managerClient, firstSite.id, executor1Id);
    const b = await createTask(managerClient, secondSite.id, executor1Id);
    const foreign = await createTask(managerClient, firstSite.id, executor2Id);

    await openAs(page, executor1, '/');
    await page.getByRole('link', { name: 'Мои задачи' }).click();

    await expect(page).toHaveURL(/\/my-tasks$/);
    await expect(page.getByRole('link', { name: new RegExp(a.title) })).toContainText('Новая');
    await expect(page.getByRole('link', { name: new RegExp(b.title) })).toBeVisible();
    await expect(page.getByText(foreign.title)).toHaveCount(0);
  });

  test('Пустой список: показывается пустое состояние', async ({ page }) => {
    const newcomer = await createExecutor();

    await openAs(page, newcomer, '/my-tasks');
    await expect(page.getByText('Вам пока не назначено задач')).toBeVisible();
  });

  test('Разделы по роли: у постановщика нет «Мои задачи», экран ему недоступен', async ({
    page,
  }) => {
    await openAs(page, manager, '/sites');
    await expect(page.getByRole('link', { name: 'Объекты' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Мои задачи' })).toHaveCount(0);

    await page.goto('/my-tasks');
    await expect(page).toHaveURL(/\/sites$/);
  });
});
