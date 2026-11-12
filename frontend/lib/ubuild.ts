import { backendRequest, type BackendResult } from "@/lib/backend-api";
import type {
  Engagement,
  EngagementVariation,
  FundsAccount,
  FundsAllocation,
  LedgerEntry,
  Opportunity,
  OpportunityApplication,
  PaymentRequest,
  Professional,
  ProfessionalFinancials,
  ProjectMessage,
  ProviderAccount,
  Recommendation,
} from "@/lib/ubuild-shared";

export * from "@/lib/ubuild-shared";

export function getProfessionalDirectory(): Promise<
  BackendResult<{ professionals: Professional[]; stages: string[] }>
> {
  return backendRequest("/professionals");
}

export function getProjectEngagements(projectId: string): Promise<BackendResult<{ engagements: Engagement[] }>> {
  return backendRequest(`/projects/${projectId}/engagements`);
}

export function getProjectPaymentRequests(
  projectId: string,
): Promise<BackendResult<{ paymentRequests: PaymentRequest[] }>> {
  return backendRequest(`/projects/${projectId}/payment-requests`);
}

export function getProjectFunds(
  projectId: string,
): Promise<BackendResult<{ funds: FundsAccount; availableCents: number }>> {
  return backendRequest(`/projects/${projectId}/funds`);
}

export function getProjectLedger(projectId: string): Promise<BackendResult<{ entries: LedgerEntry[] }>> {
  return backendRequest(`/projects/${projectId}/ledger`);
}

export function getProjectProvider(projectId: string): Promise<BackendResult<{ provider: ProviderAccount }>> {
  return backendRequest(`/projects/${projectId}/provider`);
}

export function getEngagementVariations(
  projectId: string,
  engagementId: string,
): Promise<BackendResult<{ variations: EngagementVariation[] }>> {
  return backendRequest(`/projects/${projectId}/engagements/${engagementId}/variations`);
}

// --- Opportunities -----------------------------------------------------------

export function getOpenOpportunities(options?: {
  stage?: string;
  query?: string;
  limit?: number;
}): Promise<BackendResult<{ opportunities: Opportunity[]; stages: string[] }>> {
  const params = new URLSearchParams();
  if (options?.stage) params.set("stage", options.stage);
  if (options?.query) params.set("q", options.query);
  if (options?.limit) params.set("limit", String(options.limit));
  const suffix = params.toString();
  return backendRequest(`/opportunities${suffix ? `?${suffix}` : ""}`);
}

export function getOpportunity(
  opportunityId: string,
): Promise<BackendResult<{ opportunity: Opportunity; applications: OpportunityApplication[] }>> {
  return backendRequest(`/opportunities/${opportunityId}`);
}

export function getProjectOpportunities(
  projectId: string,
): Promise<BackendResult<{ opportunities: Opportunity[]; stages: string[] }>> {
  return backendRequest(`/projects/${projectId}/opportunities`);
}

export function getMyApplications(): Promise<BackendResult<{ applications: OpportunityApplication[] }>> {
  return backendRequest("/professionals/me/applications");
}

export function getProjectRecommendations(
  projectId: string,
  options?: { stage?: string; scope?: string; limit?: number },
): Promise<BackendResult<{ recommendations: Recommendation[]; disclaimer: string }>> {
  const params = new URLSearchParams();
  if (options?.stage) params.set("stage", options.stage);
  if (options?.scope) params.set("scope", options.scope);
  if (options?.limit) params.set("limit", String(options.limit));
  const suffix = params.toString();
  return backendRequest(`/projects/${projectId}/recommendations${suffix ? `?${suffix}` : ""}`);
}

// --- Funds and professional financial visibility -----------------------------

export function getProjectAllocations(
  projectId: string,
): Promise<BackendResult<{ allocations: FundsAllocation[] }>> {
  return backendRequest(`/projects/${projectId}/allocations`);
}

export function getProfessionalFinancials(
  projectId: string,
): Promise<BackendResult<{ financials: ProfessionalFinancials }>> {
  return backendRequest(`/projects/${projectId}/financials/me`);
}

// --- Collaboration -----------------------------------------------------------

export function getProjectMessages(
  projectId: string,
  limit?: number,
): Promise<BackendResult<{ messages: ProjectMessage[] }>> {
  const suffix = limit ? `?limit=${limit}` : "";
  return backendRequest(`/projects/${projectId}/messages${suffix}`);
}
