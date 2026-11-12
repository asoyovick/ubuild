package model

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"time"
)

// ProjectStage is the construction stage an engagement covers. Recommendations
// and engagement terms are scoped to a stage so a professional is matched to
// the work a project actually needs next.
type ProjectStage string

const (
	ProjectStageDesign       ProjectStage = "DESIGN"
	ProjectStagePermit       ProjectStage = "PERMIT"
	ProjectStageMobilization ProjectStage = "MOBILIZATION"
	ProjectStageFoundation   ProjectStage = "FOUNDATION"
	ProjectStageFrame        ProjectStage = "FRAME"
	ProjectStageRoofing      ProjectStage = "ROOFING"
	ProjectStageEnclosure    ProjectStage = "ENCLOSURE"
	ProjectStageMechanics    ProjectStage = "MECHANICS"
	ProjectStageFinishes     ProjectStage = "FINISHES"
	ProjectStageClosing      ProjectStage = "CLOSING"
)

var projectStages = []ProjectStage{
	ProjectStageDesign,
	ProjectStagePermit,
	ProjectStageMobilization,
	ProjectStageFoundation,
	ProjectStageFrame,
	ProjectStageRoofing,
	ProjectStageEnclosure,
	ProjectStageMechanics,
	ProjectStageFinishes,
	ProjectStageClosing,
}

// ProjectStages returns the supported construction stages in project order.
func ProjectStages() []ProjectStage { return append([]ProjectStage(nil), projectStages...) }

// ValidProjectStage reports whether s is a stage UBuild recognises.
func ValidProjectStage(s ProjectStage) bool {
	for _, candidate := range projectStages {
		if candidate == s {
			return true
		}
	}
	return false
}

// Professional is a platform user offering professional services. It is
// information about the shared account, never a separate person record.
type Professional struct {
	UserID          string   `json:"userId"`
	Name            string   `json:"name"`
	Email           string   `json:"-"`
	Headline        string   `json:"headline"`
	Disciplines     []string `json:"disciplines"`
	Qualifications  []string `json:"qualifications"`
	YearsExperience int      `json:"yearsExperience"`
	Location        string   `json:"location"`
	Availability    string   `json:"availability"`
	ProjectRole     string   `json:"projectRole"`
	Verified        bool     `json:"verified"`
	RatingCount     int      `json:"ratingCount"`
	RatingAverage   float64  `json:"ratingAverage"`
	CompletedEngagements int `json:"completedEngagements"`
	CreatedAt       string   `json:"createdAt"`
	UpdatedAt       string   `json:"updatedAt"`
}

// ProfessionalRating is a client's rating of a professional. Ratings are only
// accepted against a completed UBuild engagement, so work performed elsewhere
// cannot influence a professional's platform reputation.
type ProfessionalRating struct {
	ID             string `json:"id"`
	ProfessionalID string `json:"professionalId"`
	ProjectID      string `json:"projectId"`
	EngagementID   string `json:"engagementId"`
	ClientID       string `json:"clientId"`
	Score          int    `json:"score"`
	Comment        string `json:"comment"`
	CreatedAt      string `json:"createdAt"`
}

// Engagement is the platform record that links one project, one client and one
// professional for an agreed scope, timeline and fee. Only a platform
// engagement with an approved agreement permits payment requests.
type Engagement struct {
	ID                string `json:"id"`
	ProjectID         string `json:"projectId"`
	ClientID          string `json:"clientId"`
	ProfessionalID    string `json:"professionalId"`
	ConstructionStage string `json:"constructionStage"`
	Scope             string `json:"scope"`
	Deliverables      string `json:"deliverables"`
	Timeline          string `json:"timeline"`
	StartDate         string `json:"startDate"`
	EndDate           string `json:"endDate"`
	FeeCents          int64  `json:"feeCents"`
	Currency          string `json:"currency"`
	TermsHash         string `json:"termsHash"`
	Status            string `json:"status"`
	OpportunityID     string `json:"opportunityId,omitempty"`
	ApplicationID     string `json:"applicationId,omitempty"`
	ApprovedBy        string `json:"approvedBy,omitempty"`
	ApprovedAt        string `json:"approvedAt,omitempty"`
	CompletedAt       string `json:"completedAt,omitempty"`
	CreatedAt         string `json:"createdAt"`
	UpdatedAt         string `json:"updatedAt"`
}

// EngagementVariation is a proposed amendment to the agreed terms. Until the
// client approves it, the original terms still cap what may be requested.
type EngagementVariation struct {
	ID           string `json:"id"`
	EngagementID string `json:"engagementId"`
	RequestedBy  string `json:"requestedBy"`
	Scope        string `json:"scope"`
	Deliverables string `json:"deliverables"`
	Timeline     string `json:"timeline"`
	FeeCents     int64  `json:"feeCents"`
	Currency     string `json:"currency"`
	Status       string `json:"status"`
	DecidedBy    string `json:"decidedBy,omitempty"`
	DecidedAt    string `json:"decidedAt,omitempty"`
	CreatedAt    string `json:"createdAt"`
	UpdatedAt    string `json:"updatedAt"`
}

// PaymentRequest is a professional's request for payment for deliverables
// submitted against an approved engagement.
type PaymentRequest struct {
	ID                string `json:"id"`
	ProjectID         string `json:"projectId"`
	EngagementID      string `json:"engagementId"`
	ProfessionalID    string `json:"professionalId"`
	ClientID          string `json:"clientId"`
	Description       string `json:"description"`
	AmountCents       int64  `json:"amountCents"`
	Currency          string `json:"currency"`
	DeliverableIDs    string `json:"deliverableIds"`
	Status            string `json:"status"`
	RequestedBy       string `json:"requestedBy"`
	RequestedAt       string `json:"requestedAt"`
	DecidedBy         string `json:"decidedBy,omitempty"`
	DecidedAt         string `json:"decidedAt,omitempty"`
	DecisionNote      string `json:"decisionNote,omitempty"`
	ProviderReference string `json:"providerReference,omitempty"`
	ProviderStatus    string `json:"providerStatus,omitempty"`
	PaidAt            string `json:"paidAt,omitempty"`
	CreatedAt         string `json:"createdAt"`
	UpdatedAt         string `json:"updatedAt"`
}

// PaymentInstruction is the client's explicit authorisation or rejection of a
// payment request. An instruction records intent; it never moves money, and it
// is never created automatically.
type PaymentInstruction struct {
	ID               string `json:"id"`
	ProjectID        string `json:"projectId"`
	PaymentRequestID string `json:"paymentRequestId"`
	ClientID         string `json:"clientId"`
	Action           string `json:"action"`
	Note             string `json:"note"`
	CreatedAt        string `json:"createdAt"`
}

// ProjectFundsAccount is the client's project money account. UBuild records
// transactions against it through the selected payment provider; the platform
// does not hold or safeguard the funds itself.
type ProjectFundsAccount struct {
	ID                string `json:"id"`
	ProjectID         string `json:"projectId"`
	ClientID          string `json:"clientId"`
	Source            string `json:"source"`
	Status            string `json:"status"`
	BalanceCents      int64  `json:"balanceCents"`
	AllocatedCents    int64  `json:"allocatedCents"`
	Currency          string `json:"currency"`
	ConstructionStage string `json:"constructionStage"`
	CreatedAt         string `json:"createdAt"`
	UpdatedAt         string `json:"updatedAt"`
}

// LedgerEntry is an immutable record of money movement. A pending entry is the
// platform's request to the provider; it becomes POSTED only when the provider
// confirms the transaction.
type LedgerEntry struct {
	ID                string `json:"id"`
	ProjectID         string `json:"projectId"`
	EngagementID      string `json:"engagementId,omitempty"`
	PaymentRequestID  string `json:"paymentRequestId,omitempty"`
	UserID            string `json:"userId"`
	EntryType         string `json:"entryType"`
	Direction         string `json:"direction"`
	AmountCents       int64  `json:"amountCents"`
	Currency          string `json:"currency"`
	Description       string `json:"description"`
	BalanceAfterCents int64  `json:"balanceAfterCents"`
	ProviderReference string `json:"providerReference"`
	Status            string `json:"status"`
	CreatedAt         string `json:"createdAt"`
	PostedAt          string `json:"postedAt,omitempty"`
}

// ProviderAccount is the configured payment arrangement for a project.
//
// Arrangement A uses an account the client already holds with a bank or mobile
// money operator. Arrangement B uses a dedicated project account operated by a
// bank or payment service provider. UBuild stores only the configuration it
// needs to coordinate authorisation, and never claims to hold the funds.
type ProviderAccount struct {
	ID             string `json:"id"`
	ProjectID      string `json:"projectId"`
	Arrangement    string `json:"arrangement"`
	Name           string `json:"name"`
	DisplayAccount string `json:"displayAccount"`
	Status         string `json:"status"`
	Disclosures    string `json:"disclosures"`
	CreatedAt      string `json:"createdAt"`
	UpdatedAt      string `json:"updatedAt"`
}

// Opportunity is a client's published professional opportunity on a project.
// Professionals discover these records and apply; the client then selects an
// applicant and records a platform engagement with agreed terms.
type Opportunity struct {
	ID                string `json:"id"`
	ProjectID         string `json:"projectId"`
	ClientID          string `json:"clientId"`
	Title             string `json:"title"`
	ConstructionStage string `json:"constructionStage"`
	Scope             string `json:"scope"`
	Deliverables      string `json:"deliverables"`
	BudgetCents       int64  `json:"budgetCents"`
	Currency          string `json:"currency"`
	Location          string `json:"location"`
	Status            string `json:"status"`
	Deadline          string `json:"deadline"`
	ProjectName       string `json:"projectName,omitempty"`
	ApplicationCount  int    `json:"applicationCount"`
	CreatedAt         string `json:"createdAt"`
	UpdatedAt         string `json:"updatedAt"`
}

// OpportunityApplication is a professional's application to a published
// opportunity. It is not an engagement and confers no payment rights.
type OpportunityApplication struct {
	ID                string `json:"id"`
	OpportunityID     string `json:"opportunityId"`
	ProjectID         string `json:"projectId"`
	ProfessionalID    string `json:"professionalId"`
	ProfessionalName  string `json:"professionalName,omitempty"`
	Message           string `json:"message"`
	ProposedFeeCents  int64  `json:"proposedFeeCents"`
	Currency          string `json:"currency"`
	AvailabilityNote  string `json:"availabilityNote"`
	Status            string `json:"status"`
	CreatedAt         string `json:"createdAt"`
	UpdatedAt         string `json:"updatedAt"`
}

// FundsAllocation earmarks project funds for a construction stage and,
// optionally, a specific engagement. It is a planning record and never moves
// money on its own.
type FundsAllocation struct {
	ID                string `json:"id"`
	ProjectID         string `json:"projectId"`
	EngagementID      string `json:"engagementId"`
	ConstructionStage string `json:"constructionStage"`
	AmountCents       int64  `json:"amountCents"`
	Currency          string `json:"currency"`
	Status            string `json:"status"`
	Note              string `json:"note"`
	CreatedBy         string `json:"createdBy"`
	CreatedAt         string `json:"createdAt"`
	UpdatedAt         string `json:"updatedAt"`
}

// ProjectMessage is a collaboration message on a project or engagement.
type ProjectMessage struct {
	ID           string `json:"id"`
	ProjectID    string `json:"projectId"`
	EngagementID string `json:"engagementId"`
	UserID       string `json:"userId"`
	UserName     string `json:"userName,omitempty"`
	Body         string `json:"body"`
	CreatedAt    string `json:"createdAt"`
}

// ProfessionalFinancials is the financial view an engaged professional may
// read: only their own engagement, releases and requests.
type ProfessionalFinancials struct {
	Engagements     []Engagement    `json:"engagements"`
	PaymentRequests []PaymentRequest `json:"paymentRequests"`
	Releases        []LedgerEntry   `json:"releases"`
	AgreedTotalCents int64          `json:"agreedTotalCents"`
	PaidTotalCents   int64          `json:"paidTotalCents"`
	PendingCents     int64          `json:"pendingCents"`
}

// Recommendation is a suitability ranking for an opportunity. It is business
// input to a client's choice and never an approval or a release of funds.
type Recommendation struct {
	Professional Professional `json:"professional"`
	Stage        ProjectStage `json:"stage"`
	Score        float64      `json:"score"`
	Reasons      []string     `json:"reasons"`
}

// NewID returns a random 128-bit identifier in hex.
func NewID() string {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return fmt.Sprintf("%d", time.Now().UnixNano())
	}
	return hex.EncodeToString(b)
}

// Now returns the current UTC timestamp in the format the API stores.
func Now() string { return time.Now().UTC().Format(time.RFC3339Nano) }
