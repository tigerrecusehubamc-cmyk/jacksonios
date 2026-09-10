/**
 * Describes what a daily challenge asks for.
 *
 * Game challenges used to mean one thing only - play for N minutes - so the UI
 * rendered `requirements.timeLimit` as a "Time Limit" and assumed minutes
 * everywhere. They can now also ask for purchases, milestones or tasks, which
 * are counted rather than timed.
 *
 * Challenges created before objectives existed carry only timeLimit, so they
 * are resolved as play-time here rather than showing nothing.
 *
 * Mirrors utils/challengeObjective.js on the server - keep the wording in step
 * so the app and the API never describe the same challenge differently.
 */

const OBJECTIVES = ["playtime", "purchases", "milestones", "tasks"];

export function resolveObjective(challenge) {
  const req = challenge?.requirements || {};
  const raw = req.objective;

  const objective = OBJECTIVES.includes(raw)
    ? raw
    : req.timeLimit
      ? "playtime"
      : null;

  const target =
    Number(req.target) > 0
      ? Number(req.target)
      : objective === "playtime"
        ? Number(req.timeLimit) || 0
        : 0;

  return {
    objective,
    target,
    isTimed: objective === "playtime",
    gameScope: req.gameScope === "any" ? "any" : "specific",
  };
}

/** e.g. "Play for 10 minutes", "Make 2 purchases" */
export function describeObjective(challenge) {
  const { objective, target } = resolveObjective(challenge);
  if (!objective || !target) return null;

  const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

  switch (objective) {
    case "playtime":
      return `Play for ${plural(target, "minute")}`;
    case "purchases":
      return `Make ${plural(target, "purchase")}`;
    case "milestones":
      return `Complete ${plural(target, "milestone")}`;
    case "tasks":
      return `Complete ${plural(target, "task")}`;
    default:
      return null;
  }
}

/**
 * Progress as "1/2" for counted objectives. Returns null for timed ones, which
 * show a countdown instead, and when the server has not reported any progress.
 */
export function describeProgress(challenge, progress) {
  const { objective, target } = resolveObjective(challenge);
  if (!objective || objective === "playtime" || !target) return null;

  const current = Number(progress?.currentStep) || 0;
  const total = Number(progress?.totalSteps) || target;
  return { current, total, label: `${current}/${total}` };
}

/** Spin challenges: how many spins are required, defaulting to the old single spin. */
export function resolveSpinRequirement(challenge) {
  const req = challenge?.requirements || {};
  return {
    spinCount: Math.max(1, Number(req.spinCount) || 1),
    spinWindowMinutes: Number(req.spinWindowMinutes) || null,
  };
}
