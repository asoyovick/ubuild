package handler

import (
	"crypto/subtle"
	"database/sql"
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/ubuild/backend/internal/model"
	"github.com/ubuild/backend/internal/service"
)

// projectMember returns the caller's active role on a project.
func (a *API) projectMember(userID, projectID string) (string, error) {
	var role string
	err := a.DB.QueryRow(`SELECT role FROM memberships WHERE project_id=$1 AND user_id=$2 AND status='ACTIVE'`, projectID, userID).Scan(&role)
	return role, err
}

// requireRole authenticates the caller and checks their project role.
func (a *API) requireRole(w http.ResponseWriter, r *http.Request, projectID string, allowed ...string) (model.User, string, bool) {
	u, err := a.currentUser(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "Authentication required.")
		return model.User{}, "", false
	}
	role, err := a.projectMember(u.ID, projectID)
	if errors.Is(err, sql.ErrNoRows) {
		writeError(w, http.StatusNotFound, "Project not found.")
		return model.User{}, "", false
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Unable to load the project.")
		return model.User{}, "", false
	}
	for _, candidate := range allowed {
		if role == candidate {
			return u, role, true
		}
	}
	writeError(w, http.StatusForbidden, "You do not have permission to perform this action.")
	return model.User{}, role, false
}

// writeServiceError maps a service rule failure to a precise HTTP response.
func writeServiceError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, service.ErrValidation):
		writeError(w, http.StatusUnprocessableEntity, err.Error())
	case errors.Is(err, service.ErrNotFound):
		writeError(w, http.StatusNotFound, err.Error())
	case errors.Is(err, service.ErrUnauthorized), errors.Is(err, service.ErrSelfApproval):
		writeError(w, http.StatusForbidden, err.Error())
	case errors.Is(err, service.ErrEngagementRequired),
		errors.Is(err, service.ErrExceedsAgreedTerms),
		errors.Is(err, service.ErrAuthorizationRequired),
		errors.Is(err, service.ErrProviderNotConfirmed),
		errors.Is(err, service.ErrInsufficientFunds),
		errors.Is(err, service.ErrRatingNotAllowed),
		errors.Is(err, service.ErrProviderNotConfigured),
		errors.Is(err, service.ErrConflict):
		writeError(w, http.StatusConflict, err.Error())
	default:
		writeError(w, http.StatusInternalServerError, "The request could not be completed.")
	}
}

func (a *API) marketplace() *service.MarketplaceService {
	return service.NewMarketplaceService(a.DB)
}

func (a *API) engagements() *service.EngagementService {
	return service.NewEngagementService(a.DB)
}

func (a *API) finance() *service.FinanceService {
	return service.NewFinanceService(a.DB)
}

func (a *API) providers() *service.ProviderService {
	return service.NewProviderService(a.DB)
}

// --- Professional marketplace -------------------------------------------------

func (a *API) listProfessionals(w http.ResponseWriter, r *http.Request) {
	if _, err := a.currentUser(r); err != nil {
		writeError(w, http.StatusUnauthorized, "Authentication required.")
		return
	}
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	professionals, err := a.marketplace().List(service.ProfessionalFilter{
		Query:      r.URL.Query().Get("q"),
		Discipline: r.URL.Query().Get("discipline"),
		Stage:      r.URL.Query().Get("stage"),
		Limit:      limit,
	})
	if err != nil {
		writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"professionals": professionals, "stages": model.ProjectStages()})
}

func (a *API) getProfessional(w http.ResponseWriter, r *http.Request) {
	if _, err := a.currentUser(r); err != nil {
		writeError(w, http.StatusUnauthorized, "Authentication required.")
		return
	}
	professional, err := a.marketplace().Get(r.PathValue("professionalId"))
	if err != nil {
		writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"professional": professional})
}

// saveProfessionalProfile lets the signed-in user describe the professional
// services they offer. It is information only and grants no project access.
func (a *API) saveProfessionalProfile(w http.ResponseWriter, r *http.Request) {
	u, err := a.currentUser(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "Authentication required.")
		return
	}
	var in struct {
		Headline        string   `json:"headline"`
		Disciplines     []string `json:"disciplines"`
		Qualifications  []string `json:"qualifications"`
		YearsExperience int      `json:"yearsExperience"`
		Location        string   `json:"location"`
		Availability    string   `json:"availability"`
		ProjectRole     string   `json:"projectRole"`
	}
	if !decode(w, r, &in) {
		return
	}
	professional, err := a.marketplace().UpsertProfile(u.ID, in.Headline, in.Disciplines, in.Qualifications, in.YearsExperience, in.Location, in.Availability, in.ProjectRole)
	if err != nil {
		writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"professional": professional})
}

// recommendProfessionals returns a suitability ranking for a stage and scope.
// The ranking is advisory: it approves nothing and releases nothing.
func (a *API) recommendProfessionals(w http.ResponseWriter, r *http.Request) {
	if _, err := a.currentUser(r); err != nil {
		writeError(w, http.StatusUnauthorized, "Authentication required.")
		return
	}
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	recommendations, err := a.marketplace().Recommend(r.URL.Query().Get("stage"), r.URL.Query().Get("scope"), limit)
	if err != nil {
		writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"recommendations": recommendations,
		"disclaimer":      "Ranking only. A recommendation never approves an engagement and never releases funds.",
	})
}

// --- Engagements --------------------------------------------------------------

func (a *API) listEngagements(w http.ResponseWriter, r *http.Request) {
	projectID := r.PathValue("projectId")
	u, role, ok := a.requireRole(w, r, projectID, "OWNER", "COORDINATOR", "ARCHITECT", "ENGINEER", "QUANTITY_SURVEYOR", "SITE_SUPERVISOR", "CONTRACTOR")
	if !ok {
		return
	}
	items, err := a.engagements().List(projectID)
	if err != nil {
		writeServiceError(w, err)
		return
	}
	visible := []model.Engagement{}
	for _, engagement := range items {
		// A professional only sees the engagements that are theirs; other
		// project members see the engagement but no money detail is required
		// here because the fee is part of the agreed terms everyone signed.
		if role == "CONTRACTOR" && engagement.ProfessionalID != u.ID {
			continue
		}
		visible = append(visible, engagement)
	}
	writeJSON(w, http.StatusOK, map[string]any{"engagements": visible})
}

func (a *API) createEngagement(w http.ResponseWriter, r *http.Request) {
	projectID := r.PathValue("projectId")
	u, _, ok := a.requireRole(w, r, projectID, "OWNER")
	if !ok {
		return
	}
	var in struct {
		ProfessionalID    string `json:"professionalId"`
		ConstructionStage string `json:"constructionStage"`
		Scope             string `json:"scope"`
		Deliverables      string `json:"deliverables"`
		Timeline          string `json:"timeline"`
		StartDate         string `json:"startDate"`
		EndDate           string `json:"endDate"`
		FeeCents          int64  `json:"feeCents"`
		Currency          string `json:"currency"`
		OpportunityID     string `json:"opportunityId"`
		ApplicationID     string `json:"applicationId"`
	}
	if !decode(w, r, &in) {
		return
	}
	engagement, err := a.engagements().Create(service.CreateEngagementInput{
		ProjectID:         projectID,
		ClientID:          u.ID,
		ProfessionalID:    in.ProfessionalID,
		ConstructionStage: in.ConstructionStage,
		Scope:             in.Scope,
		Deliverables:      in.Deliverables,
		Timeline:          in.Timeline,
		StartDate:         in.StartDate,
		EndDate:           in.EndDate,
		FeeCents:          in.FeeCents,
		Currency:          in.Currency,
		OpportunityID:     in.OpportunityID,
		ApplicationID:     in.ApplicationID,
	})
	if err != nil {
		writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"engagement": engagement})
}

func (a *API) approveEngagement(w http.ResponseWriter, r *http.Request) {
	projectID := r.PathValue("projectId")
	u, _, ok := a.requireRole(w, r, projectID, "OWNER")
	if !ok {
		return
	}
	engagement, err := a.engagements().Approve(r.PathValue("engagementId"), u.ID)
	if err != nil {
		writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"engagement": engagement})
}

func (a *API) completeEngagement(w http.ResponseWriter, r *http.Request) {
	projectID := r.PathValue("projectId")
	u, _, ok := a.requireRole(w, r, projectID, "OWNER")
	if !ok {
		return
	}
	engagement, err := a.engagements().Complete(r.PathValue("engagementId"), u.ID)
	if err != nil {
		writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"engagement": engagement})
}

func (a *API) listVariations(w http.ResponseWriter, r *http.Request) {
	projectID := r.PathValue("projectId")
	if _, _, ok := a.requireRole(w, r, projectID, "OWNER", "COORDINATOR"); !ok {
		return
	}
	variations, err := a.engagements().ListVariations(r.PathValue("engagementId"))
	if err != nil {
		writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"variations": variations})
}

func (a *API) createVariation(w http.ResponseWriter, r *http.Request) {
	projectID := r.PathValue("projectId")
	u, err := a.currentUser(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "Authentication required.")
		return
	}
	engagement, err := a.engagements().Get(r.PathValue("engagementId"))
	if err != nil || engagement.ProjectID != projectID {
		writeError(w, http.StatusNotFound, "Engagement not found.")
		return
	}
	if u.ID != engagement.ClientID && u.ID != engagement.ProfessionalID {
		writeError(w, http.StatusForbidden, "Only the client or the engaged professional can vary these terms.")
		return
	}
	var in struct {
		Scope        string `json:"scope"`
		Deliverables string `json:"deliverables"`
		Timeline     string `json:"timeline"`
		FeeCents     int64  `json:"feeCents"`
		Currency     string `json:"currency"`
	}
	if !decode(w, r, &in) {
		return
	}
	variation, err := a.engagements().CreateVariation(engagement.ID, u.ID, in.Scope, in.Deliverables, in.Timeline, in.FeeCents, in.Currency)
	if err != nil {
		writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"variation": variation})
}

func (a *API) decideVariation(w http.ResponseWriter, r *http.Request) {
	projectID := r.PathValue("projectId")
	u, _, ok := a.requireRole(w, r, projectID, "OWNER")
	if !ok {
		return
	}
	var in struct {
		Approve bool   `json:"approve"`
		Note    string `json:"note"`
	}
	if !decode(w, r, &in) {
		return
	}
	variation, err := a.engagements().DecideVariation(r.PathValue("variationId"), u.ID, in.Approve, in.Note)
	if err != nil {
		writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"variation": variation})
}

func (a *API) rateProfessional(w http.ResponseWriter, r *http.Request) {
	projectID := r.PathValue("projectId")
	u, _, ok := a.requireRole(w, r, projectID, "OWNER")
	if !ok {
		return
	}
	var in struct {
		Score   int    `json:"score"`
		Comment string `json:"comment"`
	}
	if !decode(w, r, &in) {
		return
	}
	rating, err := a.marketplace().Rate(u.ID, projectID, r.PathValue("engagementId"), in.Score, in.Comment)
	if err != nil {
		writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"rating": rating})
}

// --- Project funds ------------------------------------------------------------

func (a *API) projectFunds(w http.ResponseWriter, r *http.Request) {
	projectID := r.PathValue("projectId")
	if _, _, ok := a.requireRole(w, r, projectID, "OWNER"); !ok {
		return
	}
	account, err := a.finance().FundsAccount(projectID)
	if err != nil {
		writeServiceError(w, err)
		return
	}
	available, err := a.finance().AvailableCents(projectID)
	if err != nil {
		writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"funds": account, "availableCents": available})
}

func (a *API) openFundsAccount(w http.ResponseWriter, r *http.Request) {
	projectID := r.PathValue("projectId")
	u, _, ok := a.requireRole(w, r, projectID, "OWNER")
	if !ok {
		return
	}
	var in struct {
		Source string `json:"source"`
	}
	if !decode(w, r, &in) {
		return
	}
	account, err := a.finance().CreateFundsAccount(projectID, u.ID, in.Source)
	if err != nil {
		writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"funds": account})
}

func (a *API) depositFunds(w http.ResponseWriter, r *http.Request) {
	projectID := r.PathValue("projectId")
	u, _, ok := a.requireRole(w, r, projectID, "OWNER")
	if !ok {
		return
	}
	var in struct {
		AmountCents int64 `json:"amountCents"`
	}
	if !decode(w, r, &in) {
		return
	}
	entry, err := a.finance().Deposit(projectID, u.ID, in.AmountCents)
	if err != nil {
		writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusAccepted, map[string]any{
		"entry": entry,
		"note":  "The deposit is recorded and awaits confirmation from the payment provider.",
	})
}

func (a *API) allocateFunds(w http.ResponseWriter, r *http.Request) {
	projectID := r.PathValue("projectId")
	u, _, ok := a.requireRole(w, r, projectID, "OWNER")
	if !ok {
		return
	}
	var in struct {
		AllocatedCents int64  `json:"allocatedCents"`
		AmountCents    int64  `json:"amountCents"`
		Stage          string `json:"stage"`
		EngagementID   string `json:"engagementId"`
		Note           string `json:"note"`
	}
	if !decode(w, r, &in) {
		return
	}
	amount := in.AmountCents
	if amount == 0 {
		amount = in.AllocatedCents
	}
	if in.Stage == "" {
		writeError(w, http.StatusUnprocessableEntity, "construction stage is required")
		return
	}
	if !model.ValidProjectStage(model.ProjectStage(in.Stage)) {
		writeError(w, http.StatusUnprocessableEntity, "invalid construction stage")
		return
	}
	allocation, err := a.finance().AllocateFunds(projectID, u.ID, in.EngagementID, amount, model.ProjectStage(in.Stage), in.Note)
	if err != nil {
		writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"allocation": allocation})
}

func (a *API) listAllocations(w http.ResponseWriter, r *http.Request) {
	projectID := r.PathValue("projectId")
	if _, _, ok := a.requireRole(w, r, projectID, "OWNER"); !ok {
		return
	}
	items, err := a.finance().Allocations(projectID)
	if err != nil {
		writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"allocations": items})
}

func (a *API) cancelAllocation(w http.ResponseWriter, r *http.Request) {
	projectID := r.PathValue("projectId")
	u, _, ok := a.requireRole(w, r, projectID, "OWNER")
	if !ok {
		return
	}
	allocation, err := a.finance().CancelAllocation(projectID, r.PathValue("allocationId"), u.ID)
	if err != nil {
		writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"allocation": allocation})
}

// professionalFinancials exposes only the caller's own engagements, requests
// and releases. A professional cannot read the project-wide ledger.
func (a *API) professionalFinancials(w http.ResponseWriter, r *http.Request) {
	projectID := r.PathValue("projectId")
	u, err := a.currentUser(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "Authentication required.")
		return
	}
	var engaged int
	if err := a.DB.QueryRow(`SELECT COUNT(*) FROM engagements WHERE project_id=$1 AND professional_id=$2`, projectID, u.ID).Scan(&engaged); err != nil {
		writeError(w, http.StatusInternalServerError, "Unable to load financial records.")
		return
	}
	if engaged == 0 {
		writeError(w, http.StatusForbidden, "Only an engaged professional can view these records.")
		return
	}
	financials, err := a.finance().ProfessionalFinancials(projectID, u.ID)
	if err != nil {
		writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"financials": financials})
}

func (a *API) projectLedger(w http.ResponseWriter, r *http.Request) {
	projectID := r.PathValue("projectId")
	if _, _, ok := a.requireRole(w, r, projectID, "OWNER"); !ok {
		return
	}
	entries, err := a.finance().Ledger(projectID)
	if err != nil {
		writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"entries": entries})
}

// --- Payment requests ---------------------------------------------------------

func (a *API) listPaymentRequests(w http.ResponseWriter, r *http.Request) {
	projectID := r.PathValue("projectId")
	u, err := a.currentUser(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "Authentication required.")
		return
	}
	role, err := a.projectMember(u.ID, projectID)
	isMember := err == nil
	if !isMember {
		// A professional engaged on the project is allowed to see their own
		// requests without being a project member.
		var count int
		if err := a.DB.QueryRow(`SELECT COUNT(*) FROM engagements WHERE project_id=$1 AND professional_id=$2`, projectID, u.ID).Scan(&count); err != nil {
			writeError(w, http.StatusInternalServerError, "Unable to load payment requests.")
			return
		}
		if count == 0 {
			writeError(w, http.StatusNotFound, "Project not found.")
			return
		}
	}
	if isMember && role != "OWNER" {
		var engaged int
		if err := a.DB.QueryRow(`SELECT COUNT(*) FROM engagements WHERE project_id=$1 AND professional_id=$2`, projectID, u.ID).Scan(&engaged); err != nil {
			writeError(w, http.StatusInternalServerError, "Unable to load payment requests.")
			return
		}
		if engaged == 0 {
			writeError(w, http.StatusForbidden, "Financial records are limited to the client and the engaged professionals.")
			return
		}
	}
	items, err := a.finance().PaymentRequests(projectID)
	if err != nil {
		writeServiceError(w, err)
		return
	}
	if role != "OWNER" {
		own := []model.PaymentRequest{}
		for _, item := range items {
			if item.ProfessionalID == u.ID {
				own = append(own, item)
			}
		}
		items = own
	}
	writeJSON(w, http.StatusOK, map[string]any{"paymentRequests": items})
}

func (a *API) createPaymentRequest(w http.ResponseWriter, r *http.Request) {
	projectID := r.PathValue("projectId")
	u, err := a.currentUser(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "Authentication required.")
		return
	}
	var in struct {
		EngagementID   string   `json:"engagementId"`
		Description    string   `json:"description"`
		AmountCents    int64    `json:"amountCents"`
		DeliverableIDs []string `json:"deliverableIds"`
	}
	if !decode(w, r, &in) {
		return
	}
	request, err := a.finance().RequestPayment(projectID, in.EngagementID, u.ID, in.Description, in.AmountCents, in.DeliverableIDs)
	if err != nil {
		writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"paymentRequest": request})
}

func (a *API) authorizePayment(w http.ResponseWriter, r *http.Request) {
	projectID := r.PathValue("projectId")
	u, _, ok := a.requireRole(w, r, projectID, "OWNER")
	if !ok {
		return
	}
	var in struct {
		Note string `json:"note"`
	}
	if !decode(w, r, &in) {
		return
	}
	request, entry, err := a.finance().Authorize(r.PathValue("requestId"), u.ID, in.Note)
	if err != nil {
		writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusAccepted, map[string]any{
		"paymentRequest": request,
		"ledgerEntry":    entry,
		"note":           "You authorized this payment. It is complete only when the payment provider confirms the transfer.",
	})
}

func (a *API) rejectPayment(w http.ResponseWriter, r *http.Request) {
	projectID := r.PathValue("projectId")
	u, _, ok := a.requireRole(w, r, projectID, "OWNER")
	if !ok {
		return
	}
	var in struct {
		Note string `json:"note"`
	}
	if !decode(w, r, &in) {
		return
	}
	request, err := a.finance().Reject(r.PathValue("requestId"), u.ID, in.Note)
	if err != nil {
		writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"paymentRequest": request})
}

func (a *API) requestRevisions(w http.ResponseWriter, r *http.Request) {
	projectID := r.PathValue("projectId")
	u, _, ok := a.requireRole(w, r, projectID, "OWNER")
	if !ok {
		return
	}
	var in struct {
		Note string `json:"note"`
	}
	if !decode(w, r, &in) {
		return
	}
	request, err := a.finance().RequestRevisions(r.PathValue("requestId"), u.ID, in.Note)
	if err != nil {
		writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"paymentRequest": request})
}

// resubmitPayment lets the engaged professional correct a request the client
// returned for revisions. The agreed-terms cap is re-checked.
func (a *API) resubmitPayment(w http.ResponseWriter, r *http.Request) {
	u, err := a.currentUser(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "Authentication required.")
		return
	}
	var in struct {
		Description    string   `json:"description"`
		AmountCents    int64    `json:"amountCents"`
		DeliverableIDs []string `json:"deliverableIds"`
	}
	if !decode(w, r, &in) {
		return
	}
	request, err := a.finance().Resubmit(r.PathValue("requestId"), u.ID, in.Description, in.AmountCents, in.DeliverableIDs)
	if err != nil {
		writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"paymentRequest": request})
}

func (a *API) paymentInstructions(w http.ResponseWriter, r *http.Request) {
	projectID := r.PathValue("projectId")
	if _, _, ok := a.requireRole(w, r, projectID, "OWNER"); !ok {
		return
	}
	instructions, err := a.finance().Instructions(r.PathValue("requestId"))
	if err != nil {
		writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"instructions": instructions})
}

// --- Payment provider ---------------------------------------------------------

func (a *API) getProvider(w http.ResponseWriter, r *http.Request) {
	projectID := r.PathValue("projectId")
	if _, _, ok := a.requireRole(w, r, projectID, "OWNER"); !ok {
		return
	}
	provider, err := a.providers().Get(projectID)
	if err != nil {
		writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"provider": provider})
}

func (a *API) configureProvider(w http.ResponseWriter, r *http.Request) {
	projectID := r.PathValue("projectId")
	u, _, ok := a.requireRole(w, r, projectID, "OWNER")
	if !ok {
		return
	}
	var in struct {
		Arrangement    string `json:"arrangement"`
		Name           string `json:"name"`
		DisplayAccount string `json:"displayAccount"`
	}
	if !decode(w, r, &in) {
		return
	}
	provider, err := a.providers().Configure(projectID, u.ID, in.Arrangement, in.Name, in.DisplayAccount)
	if err != nil {
		writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"provider": provider})
}

// providerTransaction is the intake an adapter calls after the bank or payment
// service provider has executed (or failed) a transfer. It is disabled unless a
// shared secret is configured, because until a provider is selected there is no
// authenticated caller. It is the only way a payment can be marked complete.
func (a *API) providerTransaction(w http.ResponseWriter, r *http.Request) {
	if a.ProviderSecret == "" {
		writeError(w, http.StatusNotFound, "Not found.")
		return
	}
	if subtle.ConstantTimeCompare([]byte(r.Header.Get("X-UBuild-Provider-Secret")), []byte(a.ProviderSecret)) != 1 {
		writeError(w, http.StatusUnauthorized, "Authentication required.")
		return
	}
	var in struct {
		Reference         string `json:"reference"`
		Outcome           string `json:"outcome"`
		ProviderReference string `json:"providerReference"`
	}
	if !decode(w, r, &in) {
		return
	}
	entry, err := a.finance().ConfirmProviderTransaction(strings.TrimSpace(in.Reference), in.Outcome, strings.TrimSpace(in.ProviderReference))
	if err != nil {
		writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ledgerEntry": entry})
}
