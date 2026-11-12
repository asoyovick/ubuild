package handler

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/ubuild/backend/internal/model"
	"github.com/ubuild/backend/internal/service"
)

func (a *API) opportunities() *service.OpportunityService {
	return service.NewOpportunityService(a.DB)
}

func (a *API) messages() *service.MessageService {
	return service.NewMessageService(a.DB)
}

// updateProject lets the client refine the brief, budget, currency and current
// construction stage that recommendations, engagements and fund allocations
// all refer to.
func (a *API) updateProject(w http.ResponseWriter, r *http.Request) {
	projectID := r.PathValue("projectId")
	u, _, ok := a.requireRole(w, r, projectID, "OWNER")
	if !ok {
		return
	}
	var in struct {
		Name              *string `json:"name"`
		Location          *string `json:"location"`
		Type              *string `json:"type"`
		Description       *string `json:"description"`
		Scope             *string `json:"scope"`
		BudgetCents       *int64  `json:"budgetCents"`
		Currency          *string `json:"currency"`
		ConstructionStage *string `json:"constructionStage"`
	}
	if !decode(w, r, &in) {
		return
	}
	if in.BudgetCents != nil && *in.BudgetCents < 0 {
		writeError(w, http.StatusUnprocessableEntity, "The budget cannot be negative.")
		return
	}
	if in.ConstructionStage != nil && !model.ValidProjectStage(model.ProjectStage(strings.ToUpper(strings.TrimSpace(*in.ConstructionStage)))) {
		writeError(w, http.StatusUnprocessableEntity, "Choose a valid construction stage.")
		return
	}

	tx, err := a.DB.Begin()
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Unable to update the project.")
		return
	}
	defer tx.Rollback()

	assignments := []string{}
	args := []any{}
	add := func(column string, value any) {
		args = append(args, value)
		assignments = append(assignments, column+"=$"+strconv.Itoa(len(args)))
	}
	if in.Name != nil {
		name := strings.TrimSpace(*in.Name)
		if len([]rune(name)) < 2 {
			writeError(w, http.StatusUnprocessableEntity, "Please enter a project name.")
			return
		}
		add("name", name)
	}
	if in.Location != nil {
		add("location", strings.TrimSpace(*in.Location))
	}
	if in.Type != nil {
		add("type", strings.TrimSpace(*in.Type))
	}
	if in.Description != nil {
		add("description", strings.TrimSpace(*in.Description))
	}
	if in.Scope != nil {
		add("scope", strings.TrimSpace(*in.Scope))
	}
	if in.BudgetCents != nil {
		add("budget_cents", *in.BudgetCents)
	}
	if in.Currency != nil {
		currency := strings.ToUpper(strings.TrimSpace(*in.Currency))
		if currency == "" {
			currency = "KES"
		}
		add("currency", currency)
	}
	if in.ConstructionStage != nil {
		add("construction_stage", strings.ToUpper(strings.TrimSpace(*in.ConstructionStage)))
	}
	if len(assignments) == 0 {
		writeError(w, http.StatusUnprocessableEntity, "Nothing to update.")
		return
	}
	args = append(args, model.Now(), projectID)
	assignments = append(assignments, "updated_at=$"+strconv.Itoa(len(args)-1))
	query := "UPDATE projects SET " + strings.Join(assignments, ",") + " WHERE id=$" + strconv.Itoa(len(args))
	if _, err = tx.Exec(query, args...); err != nil {
		writeError(w, http.StatusInternalServerError, "Unable to update the project.")
		return
	}
	a.recordAuditInTx(tx, projectID, u.ID, "project_updated",
		"Client updated the project brief, budget or construction stage")
	if err = tx.Commit(); err != nil {
		writeError(w, http.StatusInternalServerError, "Unable to update the project.")
		return
	}

	var p model.Project
	if err = a.DB.QueryRow(`SELECT id,owner_id,name,location,type,description,scope,budget_cents,currency,construction_stage,created_at,updated_at
		FROM projects WHERE id=$1`, projectID).Scan(&p.ID, &p.OwnerID, &p.Name, &p.Location, &p.Type, &p.Description,
		&p.Scope, &p.BudgetCents, &p.Currency, &p.ConstructionStage, &p.CreatedAt, &p.UpdatedAt); err != nil {
		writeError(w, http.StatusInternalServerError, "Unable to load the project.")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"project": p})
}

// --- Opportunities ------------------------------------------------------------

func (a *API) createOpportunity(w http.ResponseWriter, r *http.Request) {
	projectID := r.PathValue("projectId")
	u, _, ok := a.requireRole(w, r, projectID, "OWNER")
	if !ok {
		return
	}
	var in struct {
		Title             string `json:"title"`
		ConstructionStage string `json:"constructionStage"`
		Scope             string `json:"scope"`
		Deliverables      string `json:"deliverables"`
		BudgetCents       int64  `json:"budgetCents"`
		Currency          string `json:"currency"`
		Location          string `json:"location"`
		Deadline          string `json:"deadline"`
	}
	if !decode(w, r, &in) {
		return
	}
	if in.Location == "" {
		_ = a.DB.QueryRow(`SELECT location FROM projects WHERE id=$1`, projectID).Scan(&in.Location)
	}
	opportunity, err := a.opportunities().Create(service.CreateOpportunityInput{
		ProjectID:         projectID,
		ClientID:          u.ID,
		Title:             in.Title,
		ConstructionStage: in.ConstructionStage,
		Scope:             in.Scope,
		Deliverables:      in.Deliverables,
		BudgetCents:       in.BudgetCents,
		Currency:          in.Currency,
		Location:          in.Location,
		Deadline:          in.Deadline,
	})
	if err != nil {
		writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"opportunity": opportunity})
}

func (a *API) listProjectOpportunities(w http.ResponseWriter, r *http.Request) {
	projectID := r.PathValue("projectId")
	if _, _, ok := a.requireRole(w, r, projectID, "OWNER", "COORDINATOR", "ARCHITECT", "ENGINEER", "QUANTITY_SURVEYOR", "SITE_SUPERVISOR", "CONTRACTOR"); !ok {
		return
	}
	items, err := a.opportunities().ForProject(projectID)
	if err != nil {
		writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"opportunities": items, "stages": model.ProjectStages()})
}

// listOpenOpportunities is the marketplace listing any signed-in professional
// can browse.
func (a *API) listOpenOpportunities(w http.ResponseWriter, r *http.Request) {
	if _, err := a.currentUser(r); err != nil {
		writeError(w, http.StatusUnauthorized, "Authentication required.")
		return
	}
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	items, err := a.opportunities().Open(r.URL.Query().Get("stage"), r.URL.Query().Get("q"), limit)
	if err != nil {
		writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"opportunities": items, "stages": model.ProjectStages()})
}

// getOpportunity returns the opportunity and, to its client or an applicant,
// the applications received. Other users only see the public listing.
func (a *API) getOpportunity(w http.ResponseWriter, r *http.Request) {
	u, err := a.currentUser(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "Authentication required.")
		return
	}
	opportunity, err := a.opportunities().Get(r.PathValue("opportunityId"))
	if err != nil {
		writeServiceError(w, err)
		return
	}
	applications, err := a.opportunities().Applications(opportunity.ID)
	if err != nil {
		writeServiceError(w, err)
		return
	}
	if u.ID != opportunity.ClientID {
		visible := []model.OpportunityApplication{}
		for _, application := range applications {
			if application.ProfessionalID == u.ID {
				visible = append(visible, application)
			}
		}
		applications = visible
	}
	writeJSON(w, http.StatusOK, map[string]any{"opportunity": opportunity, "applications": applications})
}

func (a *API) applyToOpportunity(w http.ResponseWriter, r *http.Request) {
	u, err := a.currentUser(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "Authentication required.")
		return
	}
	var in struct {
		Message          string `json:"message"`
		ProposedFeeCents int64  `json:"proposedFeeCents"`
		AvailabilityNote string `json:"availabilityNote"`
	}
	if !decode(w, r, &in) {
		return
	}
	application, err := a.opportunities().Apply(r.PathValue("opportunityId"), u.ID, in.Message, in.ProposedFeeCents, in.AvailabilityNote)
	if err != nil {
		writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"application": application})
}

func (a *API) listMyApplications(w http.ResponseWriter, r *http.Request) {
	u, err := a.currentUser(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "Authentication required.")
		return
	}
	items, err := a.opportunities().MyApplications(u.ID)
	if err != nil {
		writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"applications": items})
}

func (a *API) decideApplication(w http.ResponseWriter, r *http.Request) {
	projectID := r.PathValue("projectId")
	u, _, ok := a.requireRole(w, r, projectID, "OWNER")
	if !ok {
		return
	}
	var in struct {
		Status string `json:"status"`
	}
	if !decode(w, r, &in) {
		return
	}
	application, err := a.opportunities().DecideApplication(r.PathValue("applicationId"), u.ID, in.Status)
	if err != nil {
		writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"application": application})
}

// selectApplication awards an opportunity and proposes the engagement that
// must still be approved by the client before any payment request is possible.
func (a *API) selectApplication(w http.ResponseWriter, r *http.Request) {
	projectID := r.PathValue("projectId")
	u, _, ok := a.requireRole(w, r, projectID, "OWNER")
	if !ok {
		return
	}
	engagement, err := a.opportunities().SelectApplication(r.PathValue("applicationId"), u.ID)
	if err != nil {
		writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{
		"engagement": engagement,
		"note":       "The engagement is pending. Approve its terms before any payment request can be submitted.",
	})
}

func (a *API) closeOpportunity(w http.ResponseWriter, r *http.Request) {
	projectID := r.PathValue("projectId")
	u, _, ok := a.requireRole(w, r, projectID, "OWNER")
	if !ok {
		return
	}
	opportunity, err := a.opportunities().Close(r.PathValue("opportunityId"), u.ID)
	if err != nil {
		writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"opportunity": opportunity})
}

func (a *API) withdrawApplication(w http.ResponseWriter, r *http.Request) {
	u, err := a.currentUser(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "Authentication required.")
		return
	}
	application, err := a.opportunities().Withdraw(r.PathValue("applicationId"), u.ID)
	if err != nil {
		writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"application": application})
}

// recommendForProject ranks professionals against the project's own stage,
// scope and location. It is advisory only.
func (a *API) recommendForProject(w http.ResponseWriter, r *http.Request) {
	projectID := r.PathValue("projectId")
	if _, _, ok := a.requireRole(w, r, projectID, "OWNER", "COORDINATOR"); !ok {
		return
	}
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	recommendations, err := a.marketplace().RecommendForProject(projectID,
		r.URL.Query().Get("stage"), r.URL.Query().Get("scope"), limit)
	if err != nil {
		writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"recommendations": recommendations,
		"disclaimer":      "Ranking only. A recommendation never approves an engagement and never releases funds.",
	})
}

// --- Project collaboration ----------------------------------------------------

func (a *API) listMessages(w http.ResponseWriter, r *http.Request) {
	projectID := r.PathValue("projectId")
	u, err := a.currentUser(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "Authentication required.")
		return
	}
	if !a.canReadProject(projectID, u.ID) {
		writeError(w, http.StatusNotFound, "Project not found.")
		return
	}
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	items, err := a.messages().List(projectID, limit)
	if err != nil {
		writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"messages": items})
}

func (a *API) postMessage(w http.ResponseWriter, r *http.Request) {
	projectID := r.PathValue("projectId")
	u, err := a.currentUser(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "Authentication required.")
		return
	}
	if !a.canReadProject(projectID, u.ID) {
		writeError(w, http.StatusNotFound, "Project not found.")
		return
	}
	var in struct {
		EngagementID string `json:"engagementId"`
		Body         string `json:"body"`
	}
	if !decode(w, r, &in) {
		return
	}
	message, err := a.messages().Post(projectID, in.EngagementID, u.ID, in.Body)
	if err != nil {
		writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"message": message})
}

// canReadProject reports whether the caller is an active project member or an
// engaged professional on the project.
func (a *API) canReadProject(projectID, userID string) bool {
	var count int
	if err := a.DB.QueryRow(`SELECT COUNT(*) FROM memberships WHERE project_id=$1 AND user_id=$2 AND status='ACTIVE'`, projectID, userID).Scan(&count); err != nil {
		return false
	}
	if count > 0 {
		return true
	}
	if err := a.DB.QueryRow(`SELECT COUNT(*) FROM engagements WHERE project_id=$1 AND professional_id=$2 AND status IN ('PENDING','APPROVED','COMPLETED')`, projectID, userID).Scan(&count); err != nil {
		return false
	}
	return count > 0
}
