import { useSessionStore } from './session-store';

/** Элементы управления постановщика показываются только ему; настоящую защиту обеспечивает база. */
export const useIsManager = () => useSessionStore((state) => state.user?.role === 'manager');
