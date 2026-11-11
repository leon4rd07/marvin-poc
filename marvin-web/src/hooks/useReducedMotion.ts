// Product decision: the entrance animation (zoom into the curtain, curtain opens,
// walk through the doorway) always plays, even when the OS asks for reduced motion.
// To honour that setting again, restore the matchMedia version from git history:
//   git log -p -- src/hooks/useReducedMotion.ts
export function useReducedMotion() {
  return false;
}
