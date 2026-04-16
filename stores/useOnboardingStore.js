import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

const useOnboardingStore = create(
  persist(
    (set) => ({
      // Data for Onboarding Steps (collected once, posted at final step via POST /api/onboarding/submit)
      mobile: null,
      currentStep: 1,
      primaryGoal: null, // "earn" | "save" | "invest" | "learn"
      ageRange: null,
      gender: null,
      gamePreferences: [],
      gameStyle: null,
      gameHabit: null, // UI state, not sent to API

      // Additional fields for onboarding submit API
      improvementArea: "budgeting",
      dailyEarningGoal: 900, // default per API doc if omitted

      // Actions — only update local state; submit happens once at final onboarding (permissions Agree)
      setCurrentStep: (step) => set({ currentStep: step }),
      setMobile: (mobile) => set({ mobile }),
      setPrimaryGoal: (goal) => set({ primaryGoal: goal }),
      setAgeRange: (age) => set({ ageRange: age }),
      setGender: (gender) => set({ gender }),
      setGamePreferences: (preferences) =>
        set({ gamePreferences: preferences }),
      setGameStyle: (style) => set({ gameStyle: style }),
      setGameHabit: (habit) => set({ gameHabit: habit }),
      setImprovementArea: (area) => set({ improvementArea: area }),
      setDailyEarningGoal: (goal) =>
        set({ dailyEarningGoal: goal != null ? Number(goal) : 900 }),

      // Reset the store after onboarding has been submitted
      resetOnboarding: () =>
        set({
          mobile: null,
          currentStep: 1,
          primaryGoal: null,
          ageRange: null,
          gender: null,
          gamePreferences: [],
          gameStyle: null,
          gameHabit: null,
          improvementArea: "budgeting",
          dailyEarningGoal: 900,
        }),

      loadFromStorage: () => Promise.resolve(),
    }),
    {
      name: "onboarding-storage",
      storage: createJSONStorage(() => localStorage),
    }
  )
);

export default useOnboardingStore;
