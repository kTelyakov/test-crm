import { expect, test } from '@playwright/test';
import { createSite, createTask, userIdOf } from '../support/factories';
import { clientFor } from '../support/supabase';
import { openAs } from '../support/ui';
import { executor1, executor2, manager } from '../support/users';

async function siteWithTasksOfBothExecutors() {
  const managerClient = await clientFor(manager);
  const site = await createSite(managerClient);
  const own = await createTask(managerClient, site.id, await userIdOf(await clientFor(executor1)));
  const foreign = await createTask(
    managerClient,
    site.id,
    await userIdOf(await clientFor(executor2)),
  );
  return { site, own, foreign };
}

// Спек sites: видимость объектов и карточка объекта в интерфейсе.
test.describe('Объекты (UI)', () => {
  test('Постановщик видит все объекты и все задачи объекта', async ({ page }) => {
    const { site, own, foreign } = await siteWithTasksOfBothExecutors();

    await openAs(page, manager, '/sites');
    await page.getByRole('link', { name: site.name }).click();

    await expect(page.getByRole('heading', { name: site.name })).toBeVisible();
    await expect(page.getByText(own.title)).toBeVisible();
    await expect(page.getByText(foreign.title)).toBeVisible();
  });

  test('Исполнитель видит только объекты со своими задачами и только свои задачи', async ({
    page,
  }) => {
    const { site, own, foreign } = await siteWithTasksOfBothExecutors();
    const managerClient = await clientFor(manager);
    const unrelated = await createSite(managerClient);

    await openAs(page, executor1, '/sites');
    await expect(page.getByRole('link', { name: site.name })).toBeVisible();
    await expect(page.getByRole('link', { name: unrelated.name })).toHaveCount(0);

    await page.getByRole('link', { name: site.name }).click();
    await expect(page.getByText(own.title)).toBeVisible();
    await expect(page.getByText(foreign.title)).toHaveCount(0);
  });

  test('Прямой переход исполнителя на чужой объект: объект недоступен', async ({ page }) => {
    const managerClient = await clientFor(manager);
    const site = await createSite(managerClient);
    await createTask(managerClient, site.id, await userIdOf(await clientFor(executor2)));

    await openAs(page, executor1, `/sites/${site.id}`);
    await expect(page.getByRole('alert')).toHaveText('Объект не найден или недоступен');
    await expect(page.getByText(site.name)).toHaveCount(0);
  });

  test('Объект без задач: у постановщика пустое состояние списка задач', async ({ page }) => {
    const site = await createSite(await clientFor(manager));

    await openAs(page, manager, `/sites/${site.id}`);
    await expect(page.getByText('Задач пока нет')).toBeVisible();
  });
});
