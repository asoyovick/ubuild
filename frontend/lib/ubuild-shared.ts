export type ProjectStage =
  | "DESIGN"
  | "PERMIT"
  | "MOBILIZATION"
  | "FOUNDATION"
  | "FRAME"
  | "ROOFING"
  | "ENCLOSURE"
  | "MECHANICS"
  | "FINISHES"
  | "CLOSING";

export const PROJECT_STAGES: ProjectStage[] = [
  "DESIGN",
  "PERMIT",
  "MOBILIZATION",
  "FOUNDATION",
  "FRAME",
  "ROOFING",
  "ENCLOSURE",
  "MECHANICS",
  "FINISHES",
  "CLOSING",
];

export function stageLabel(stage: string): string {
  if (!stage) return "Stage not set";
  return stage.charAt(0) + stage.slice(1).toLowerCase();
}

export interface Professional {
  userId: string;
  name: string;
  headline: string;
  disciplines: string[];
  qualifications: string[];
  yearsExperience: number;
  location: string;
  availability: "AVAILABLE" | "LIMITED" | "UNAVAILABLE";
  projectRole: string;
  verified: boolean;
  ratingCount: number;
  ratingAverage: number;
  completedEngagements: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Recommendation {
  professional: Professional;
  stage: string;
  score: number;
  reasons: string[];
}

export interface Engagement {
  id: string;
  projectId: string;
  clientId: string;
  professionalId: string;
  constructionStage: string;
  scope: string;
  deliverables: string;
  timeline: string;
  startDate?: string;
  endDate?: string;
  feeCents: number;
  currency: string;
  termsHash: string;
  status: "PENDING" | "APPROVED" | "COMPLETED" | "CANCELLED";
  opportunityId?: string;
  applicationId?: string;
  approvedBy?: string;
  approvedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface EngagementVariation {
  id: string;
  engagementId: string;
  requestedBy: string;
  scope: string;
  deliverables: string;
  timeline: string;
  feeCents: number;
  currency: string;
  status: "REQUESTED" | "APPROVED" | "REJECTED";
  decidedAt?: string;
  createdAt: string;
}

export interface PaymentRequest {
  id: string;
  projectId: string;
  engagementId: string;
  professionalId: string;
  clientId: string;
  description: string;
  amountCents: number;
  currency: string;
  deliverableIds: string;
  status: "SUBMITTED" | "REVISIONS_REQUESTED" | "AUTHORIZED" | "REJECTED" | "PAID";
  requestedBy: string;
  requestedAt: string;
  decidedBy?: string;
  decidedAt?: string;
  decisionNote?: string;
  providerReference?: string;
  providerStatus?: string;
  paidAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface FundsAccount {
  id: string;
  projectId: string;
  clientId: string;
  source: string;
  status: string;
  balanceCents: number;
  allocatedCents: number;
  currency: string;
  constructionStage: string;
  createdAt: string;
  updatedAt: string;
}

export interface FundsAllocation {
  id: string;
  projectId: string;
  engagementId: string;
  constructionStage: string;
  amountCents: number;
  currency: string;
  status: "ACTIVE" | "CANCELLED";
  note: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface LedgerEntry {
  id: string;
  projectId: string;
  engagementId?: string;
  paymentRequestId?: string;
  entryType: "DEPOSIT" | "RELEASE";
  direction: "CREDIT" | "DEBIT";
  amountCents: number;
  currency: string;
  description: string;
  balanceAfterCents: number;
  providerReference: string;
  status: "PENDING_CONFIRMATION" | "POSTED" | "FAILED";
  createdAt: string;
  postedAt?: string;
}

export interface ProviderAccount {
  id: string;
  projectId: string;
  arrangement: "A" | "B";
  name: string;
  displayAccount: string;
  status: string;
  disclosures: string;
}

export interface Opportunity {
  id: string;
  projectId: string;
  clientId: string;
  title: string;
  constructionStage: string;
  scope: string;
  deliverables: string;
  budgetCents: number;
  currency: string;
  location: string;
  status: "OPEN" | "AWARDED" | "CLOSED";
  deadline: string;
  projectName?: string;
  applicationCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface OpportunityApplication {
  id: string;
  opportunityId: string;
  projectId: string;
  professionalId: string;
  professionalName?: string;
  message: string;
  proposedFeeCents: number;
  currency: string;
  availabilityNote: string;
  status: "SUBMITTED" | "SHORTLISTED" | "REJECTED" | "SELECTED" | "WITHDRAWN";
  createdAt: string;
  updatedAt: string;
}

export interface ProjectMessage {
  id: string;
  projectId: string;
  engagementId: string;
  userId: string;
  userName?: string;
  body: string;
  createdAt: string;
}

export interface ProfessionalFinancials {
  engagements: Engagement[];
  paymentRequests: PaymentRequest[];
  releases: LedgerEntry[];
  agreedTotalCents: number;
  paidTotalCents: number;
  pendingCents: number;
}

export function formatCents(cents: number, currency = "KES"): string {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function formatMoment(value: string | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
