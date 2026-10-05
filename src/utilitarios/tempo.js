export const uid = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export const thisMonth = () => new Date().toLocaleDateString("sv-SE").slice(0, 7);

export const monthKey = (date) => new Date(date).toLocaleDateString("sv-SE").slice(0, 7);

export function formatTime(seconds) {
  const safe = Math.max(0, seconds);
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const clock = `${String(minutes).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
  return hours ? `${String(hours).padStart(2, "0")}:${clock}` : clock;
}

export const minuteOf = (match) =>
  Math.max(1, Math.ceil((match.durationSeconds - match.remainingSeconds) / 60));

export function exerciseSeconds(exercise) {
  if (exercise.mode !== "time") return 0;
  if (exercise.targetSeconds) return Number(exercise.targetSeconds);
  const multiplier = exercise.unit === "hours" ? 3600 : exercise.unit === "minutes" ? 60 : 1;
  return Math.max(1, Number(exercise.target) || 1) * multiplier;
}

export function exerciseTargetLabel(exercise) {
  if (exercise.mode === "reps") return `${exercise.target} repetições`;
  const seconds = exerciseSeconds(exercise);
  if (exercise.unit === "hours")
    return `${exercise.target} ${Number(exercise.target) === 1 ? "hora" : "horas"}`;
  if (exercise.unit === "minutes")
    return `${exercise.target} ${Number(exercise.target) === 1 ? "minuto" : "minutos"}`;
  return `${seconds} ${seconds === 1 ? "segundo" : "segundos"}`;
}

export function formatTrainingDuration(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours) return `${hours}h ${minutes}min`;
  if (minutes) return `${minutes} min`;
  return `${seconds} s`;
}
