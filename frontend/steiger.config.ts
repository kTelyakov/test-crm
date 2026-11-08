import fsd from '@feature-sliced/steiger-plugin';
import { defineConfig } from 'steiger';

export default defineConfig([
  ...fsd.configs.recommended,
  {
    // Пользовательские сценарии (вход, смена статуса, формы) оформлены отдельными слайсами features,
    // даже когда их использует один экран: так границы действий видны в структуре проекта.
    rules: { 'fsd/insignificant-slice': 'off' },
  },
]);
