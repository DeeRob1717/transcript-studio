export const PLAN_LIMITS = {
  FREE: {
    uploadsPerMonth: 10,
    maxUploadMb: 50
  },
  PRO: {
    uploadsPerMonth: 500,
    maxUploadMb: 500
  }
} as const;

export function formatPlanName(plan: "FREE" | "PRO") {
  return plan === "PRO" ? "Pro" : "Free";
}

