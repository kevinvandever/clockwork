export interface HomeValueReportStatus {
  available: boolean;
  reason: string;
}

/**
 * The home value report is records-gated and not wired yet. It ties to the
 * agentfolio seller-watch and records access (Task 11). Exported as an explicit
 * stub so callers can branch on availability rather than silently doing nothing.
 */
export function homeValueReportStatus(): HomeValueReportStatus {
  return {
    available: false,
    reason: "records access not wired (Task 11 / seller-watch)",
  };
}
