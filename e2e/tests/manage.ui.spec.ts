import { expect, test } from '@playwright/test';
import { createSite, createTask, unique, userIdOf } from '../support/factories';
import { clientFor } from '../support/supabase';
import { openAs } from '../support/ui';
import { changeStatus } from '../support/workflow';
import { executor1, manager } from '../support/users';

const dialog = (page: import('@playwright/test').Page) => page.getByRole('dialog');

async function siteWithTask() {
  const managerClient = await clientFor(manager);
  const site = await createSite(managerClient);
  const task = await createTask(managerClient, site.id, await userIdOf(await clientFor(executor1)));
  return { site, task, managerClient };
}

// Спеки sites и tasks: управление объектами и задачами постановщиком.
test.describe('Объекты: управление (UI)', () => {
  test('Создание объекта: объект появляется в списке', async ({ page }) => {
    const name = unique('Новый объект');
    await openAs(page, manager, '/sites');

    await page.getByRole('button', { name: 'Добавить объект' }).click();
    await dialog(page).getByLabel('Название').fill(name);
    await dialog(page).getByLabel('Адрес').fill('ул. Строителей, 10');
    await dialog(page).getByRole('button', { name: 'Сохранить' }).click();

    await expect(page.getByRole('link', { name })).toBeVisible();
  });

  test('Обязательные поля: без названия и адреса форма показывает ошибки', async ({ page }) => {
    await openAs(page, manager, '/sites');

    await page.getByRole('button', { name: 'Добавить объект' }).click();
    await dialog(page).getByRole('button', { name: 'Сохранить' }).click();

    await expect(dialog(page).getByText('Введите название')).toBeVisible();
    await expect(dialog(page).getByText('Введите адрес')).toBeVisible();
  });

  test('Редактирование объекта', async ({ page }) => {
    const site = await createSite(await clientFor(manager));
    const newName = unique('Переименованный');
    await openAs(page, manager, `/sites/${site.id}`);

    await page.getByRole('button', { name: 'Изменить' }).click();
    await dialog(page).getByLabel('Название').fill(newName);
    await dialog(page).getByRole('button', { name: 'Сохранить' }).click();

    await expect(page.getByRole('heading', { name: newName })).toBeVisible();
  });

  test('Удаление объекта с задачами: объяснение, объект остаётся', async ({ page }) => {
    const { site } = await siteWithTask();
    await openAs(page, manager, `/sites/${site.id}`);

    await page.getByRole('button', { name: 'Удалить', exact: true }).click();
    await dialog(page).getByRole('button', { name: 'Удалить объект' }).click();

    await expect(dialog(page).getByRole('alert')).toContainText('сначала удалите их');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('heading', { name: site.name })).toBeVisible();
  });

  test('Удаление пустого объекта: объект исчезает из списка', async ({ page }) => {
    const site = await createSite(await clientFor(manager));
    await openAs(page, manager, `/sites/${site.id}`);

    await page.getByRole('button', { name: 'Удалить', exact: true }).click();
    await dialog(page).getByRole('button', { name: 'Удалить объект' }).click();

    await expect(page).toHaveURL(/\/sites$/);
    await expect(page.getByRole('link', { name: site.name })).toHaveCount(0);
  });
});

test.describe('Задачи: управление (UI)', () => {
  test('Создание задачи с исполнителем: задача в статусе «Новая»', async ({ page }) => {
    const site = await createSite(await clientFor(manager));
    const title = unique('Задача');
    await openAs(page, manager, `/sites/${site.id}`);

    await page.getByRole('button', { name: 'Добавить задачу' }).click();
    await dialog(page).getByLabel('Название').fill(title);
    await dialog(page).getByLabel('Исполнитель').selectOption({ label: 'Пётр Исполнитель' });
    await dialog(page).getByRole('button', { name: 'Сохранить' }).click();

    const row = page.getByRole('link', { name: new RegExp(title) });
    await expect(row).toContainText('Новая');
    await expect(row).toContainText('Пётр Исполнитель');
  });

  test('Название и исполнитель обязательны', async ({ page }) => {
    const site = await createSite(await clientFor(manager));
    await openAs(page, manager, `/sites/${site.id}`);

    await page.getByRole('button', { name: 'Добавить задачу' }).click();
    await dialog(page).getByRole('button', { name: 'Сохранить' }).click();

    await expect(dialog(page).getByText('Введите название')).toBeVisible();
    await expect(
      dialog(page).getByRole('alert').filter({ hasText: 'Выберите исполнителя' }),
    ).toBeVisible();
  });

  test('Редактирование задачи и смена исполнителя у новой задачи', async ({ page }) => {
    const { task } = await siteWithTask();
    const newTitle = unique('Новое название');
    await openAs(page, manager, `/tasks/${task.id}`);

    await page.getByRole('button', { name: 'Изменить' }).click();
    await dialog(page).getByLabel('Название').fill(newTitle);
    await dialog(page).getByLabel('Исполнитель').selectOption({ label: 'Анна Исполнитель' });
    await dialog(page).getByRole('button', { name: 'Сохранить' }).click();

    await expect(page.getByRole('heading', { name: newTitle })).toBeVisible();
    await expect(page.getByText('Исполнитель: Анна Исполнитель')).toBeVisible();
  });

  test('Смена исполнителя у задачи в работе: показывается причина отказа', async ({ page }) => {
    const { task } = await siteWithTask();
    await changeStatus(await clientFor(executor1), task.id, 'in_progress');
    await openAs(page, manager, `/tasks/${task.id}`);

    await page.getByRole('button', { name: 'Изменить' }).click();
    await dialog(page).getByLabel('Исполнитель').selectOption({ label: 'Анна Исполнитель' });
    await dialog(page).getByRole('button', { name: 'Сохранить' }).click();

    await expect(dialog(page).getByRole('alert')).toContainText('Менять исполнителя можно только');
  });

  test('Удаление задачи', async ({ page }) => {
    const { site, task } = await siteWithTask();
    await openAs(page, manager, `/tasks/${task.id}`);

    await page.getByRole('button', { name: 'Удалить', exact: true }).click();
    await dialog(page).getByRole('button', { name: 'Удалить задачу' }).click();

    await expect(page).toHaveURL(new RegExp(`/sites/${site.id}$`));
    await expect(page.getByText(task.title)).toHaveCount(0);
  });
});

test.describe('Исполнитель не видит элементов управления (UI)', () => {
  test('Список объектов, карточка объекта и карточка задачи без кнопок управления', async ({
    page,
  }) => {
    const { site, task } = await siteWithTask();

    await openAs(page, executor1, '/sites');
    await expect(page.getByRole('link', { name: site.name })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Добавить объект' })).toHaveCount(0);

    await page.getByRole('link', { name: site.name }).click();
    await expect(page.getByText(task.title)).toBeVisible();
    for (const name of ['Изменить', 'Удалить', 'Добавить задачу']) {
      await expect(page.getByRole('button', { name })).toHaveCount(0);
    }

    await page.getByRole('link', { name: new RegExp(task.title) }).click();
    await expect(page.getByRole('heading', { name: task.title })).toBeVisible();
    for (const name of ['Изменить', 'Удалить']) {
      await expect(page.getByRole('button', { name })).toHaveCount(0);
    }
  });
});
