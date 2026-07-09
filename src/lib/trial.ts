export const TRIAL_DAYS = 3;

export function getTrialEndDate(from = new Date()) {
  const trialEnd = new Date(from);
  trialEnd.setDate(trialEnd.getDate() + TRIAL_DAYS);
  return trialEnd;
}
