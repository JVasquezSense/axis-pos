import { create } from "zustand";

const DONE_KEY = "axis-onboarding-done";

function readDone(): boolean {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(DONE_KEY) === "1";
}

interface OnboardingState {
  done: boolean;
  active: boolean;
  step: number;
  /** Se llama una vez al montar la app; abre el recorrido solo si nunca se ha visto. */
  maybeStart: () => void;
  /** Reinicia el recorrido desde el paso 0 (usado desde el menú de usuario). */
  start: () => void;
  skip: () => void;
  finish: () => void;
  next: (total: number) => void;
  prev: () => void;
}

export const useOnboardingStore = create<OnboardingState>()((set, get) => ({
  done: readDone(),
  active: false,
  step: 0,

  maybeStart: () => {
    if (!get().done && !get().active) set({ active: true, step: 0 });
  },
  start: () => set({ active: true, step: 0 }),
  skip: () => {
    window.localStorage.setItem(DONE_KEY, "1");
    set({ active: false, done: true });
  },
  finish: () => {
    window.localStorage.setItem(DONE_KEY, "1");
    set({ active: false, done: true });
  },
  next: (total) => set((s) => ({ step: Math.min(s.step + 1, total - 1) })),
  prev: () => set((s) => ({ step: Math.max(s.step - 1, 0) })),
}));
