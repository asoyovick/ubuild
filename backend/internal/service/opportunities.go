package service

import (
	"database/sql"
	"errors"
	"fmt"
	"strings"

	"github.com/ubuild/backend/internal/model"
)

// OpportunityService publishes professional opportunities and records
// applications. Applying does not create a relationship and selecting an
// applicant only proposes a platform engagement; the client must still approve
// the agreed terms before any payment request is possible.
type OpportunityService struct {
	db          *sql.DB
	engagements *EngagementService
}

func NewOpportunityService(db *sql.DB) *OpportunityService {
	return &OpportunityService{db: db, engagements: NewEngagementService(db)}
}

type CreateOpportunityInput struct {
	ProjectID         string
	ClientID          string
	Title             string
	ConstructionStage string
	Scope             string
	Deliverables      string
	BudgetCents       int64
	Currency          string
	Location          string
	Deadline          string
}

func (s *OpportunityService) Create(in CreateOpportunityInput) (*model.Opportunity, error) {
	in.ProjectID = strings.TrimSpace(in.ProjectID)
	in.ClientID = strings.TrimSpace(in.ClientID)
	in.Title = strings.TrimSpace(in.Title)
	in.ConstructionStage = strings.ToUpper(strings.TrimSpace(in.ConstructionStage))
	in.Scope = strings.TrimSpace(in.Scope)
	in.Deliverables = strings.TrimSpace(in.Deliverables)
	in.Currency = strings.ToUpper(strings.TrimSpace(in.Currency))
	in.Location = strings.TrimSpace(in.Location)
	in.Deadline = strings.TrimSpace(in.Deadline)
	if in.Currency == "" {
		in.Currency = "KES"
	}
	if in.ProjectID == "" || in.ClientID == "" || in.Title == "" || in.Scope == "" {
		return nil, fmt.Errorf("%w: project, title and scope are required", ErrValidation)
	}
	if !model.ValidProjectStage(model.ProjectStage(in.ConstructionStage)) {
		return nil, fmt.Errorf("%w: choose a valid construction stage", ErrValidation)
	}
	if in.BudgetCents < 0 {
		return nil, fmt.Errorf("%w: the budget cannot be negative", ErrValidation)
	}

	id := model.NewID()
	now := model.Now()
	tx, err := s.db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()
	if _, err = tx.Exec(`INSERT INTO opportunities(id,project_id,client_id,title,construction_stage,scope,deliverables,
		budget_cents,currency,location,status,deadline,created_at,updated_at)
		VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'OPEN',$11,$12,$12)`,
		id, in.ProjectID, in.ClientID, in.Title, in.ConstructionStage, in.Scope, in.Deliverables,
		in.BudgetCents, in.Currency, in.Location, in.Deadline, now); err != nil {
		return nil, err
	}
	if err = recordAudit(tx, in.ProjectID, in.ClientID, "opportunity_published",
		fmt.Sprintf("Opportunity %s published for the %s stage with a budget of %d %s", id, in.ConstructionStage, in.BudgetCents, in.Currency)); err != nil {
		return nil, err
	}
	if err = tx.Commit(); err != nil {
		return nil, err
	}
	return s.Get(id)
}

const opportunityColumns = `o.id,o.project_id,o.client_id,o.title,o.construction_stage,o.scope,o.deliverables,
	o.budget_cents,o.currency,o.location,o.status,o.deadline,o.created_at,o.updated_at,
	(SELECT COUNT(*) FROM opportunity_applications a WHERE a.opportunity_id=o.id)`

func (s *OpportunityService) Get(id string) (*model.Opportunity, error) {
	var o model.Opportunity
	err := s.db.QueryRow(`SELECT `+opportunityColumns+`,p.name FROM opportunities o JOIN projects p ON p.id=o.project_id WHERE o.id=$1`, id).
		Scan(&o.ID, &o.ProjectID, &o.ClientID, &o.Title, &o.ConstructionStage, &o.Scope, &o.Deliverables,
			&o.BudgetCents, &o.Currency, &o.Location, &o.Status, &o.Deadline, &o.CreatedAt, &o.UpdatedAt,
			&o.ApplicationCount, &o.ProjectName)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, fmt.Errorf("%w: opportunity", ErrNotFound)
	}
	if err != nil {
		return nil, err
	}
	return &o, nil
}

// ForProject lists every opportunity on one project.
func (s *OpportunityService) ForProject(projectID string) ([]model.Opportunity, error) {
	rows, err := s.db.Query(`SELECT `+opportunityColumns+`,p.name FROM opportunities o JOIN projects p ON p.id=o.project_id
		WHERE o.project_id=$1 ORDER BY o.created_at DESC`, projectID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []model.Opportunity{}
	for rows.Next() {
		var o model.Opportunity
		if err = rows.Scan(&o.ID, &o.ProjectID, &o.ClientID, &o.Title, &o.ConstructionStage, &o.Scope,
			&o.Deliverables, &o.BudgetCents, &o.Currency, &o.Location, &o.Status, &o.Deadline,
			&o.CreatedAt, &o.UpdatedAt, &o.ApplicationCount, &o.ProjectName); err != nil {
			return nil, err
		}
		items = append(items, o)
	}
	return items, rows.Err()
}

// Open lists every open opportunity, optionally narrowed by stage or text.
func (s *OpportunityService) Open(stage, query string, limit int) ([]model.Opportunity, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	rows, err := s.db.Query(`SELECT `+opportunityColumns+`,p.name FROM opportunities o JOIN projects p ON p.id=o.project_id
		WHERE o.status='OPEN' ORDER BY o.created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	stage = strings.ToLower(strings.TrimSpace(stage))
	query = strings.ToLower(strings.TrimSpace(query))
	items := []model.Opportunity{}
	for rows.Next() {
		var o model.Opportunity
		if err = rows.Scan(&o.ID, &o.ProjectID, &o.ClientID, &o.Title, &o.ConstructionStage, &o.Scope,
			&o.Deliverables, &o.BudgetCents, &o.Currency, &o.Location, &o.Status, &o.Deadline,
			&o.CreatedAt, &o.UpdatedAt, &o.ApplicationCount, &o.ProjectName); err != nil {
			return nil, err
		}
		if stage != "" && !containsFold(o.ConstructionStage, stage) {
			continue
		}
		if query != "" && !containsFold(o.Title, query) && !containsFold(o.Scope, query) &&
			!containsFold(o.Location, query) && !containsFold(o.ProjectName, query) {
			continue
		}
		items = append(items, o)
		if len(items) >= limit {
			break
		}
	}
	return items, rows.Err()
}

// Apply records a professional's application. An application is not an
// engagement and creates no payment rights.
func (s *OpportunityService) Apply(opportunityID, professionalID, message string, proposedFeeCents int64, availability string) (*model.OpportunityApplication, error) {
	opportunity, err := s.Get(opportunityID)
	if err != nil {
		return nil, err
	}
	if opportunity.Status != "OPEN" {
		return nil, fmt.Errorf("%w: this opportunity is no longer open", ErrConflict)
	}
	if opportunity.ClientID == professionalID {
		return nil, fmt.Errorf("%w: a client cannot apply to their own opportunity", ErrValidation)
	}
	if proposedFeeCents < 0 {
		return nil, fmt.Errorf("%w: the proposed fee cannot be negative", ErrValidation)
	}
	var profileExists int
	if err := s.db.QueryRow(`SELECT 1 FROM professionals WHERE user_id=$1`, professionalID).Scan(&profileExists); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, fmt.Errorf("%w: publish a professional profile before applying", ErrValidation)
		}
		return nil, err
	}
	var existing int
	if err := s.db.QueryRow(`SELECT 1 FROM opportunity_applications WHERE opportunity_id=$1 AND professional_id=$2`, opportunityID, professionalID).Scan(&existing); err == nil {
		return nil, fmt.Errorf("%w: you have already applied to this opportunity", ErrConflict)
	} else if !errors.Is(err, sql.ErrNoRows) {
		return nil, err
	}

	id := model.NewID()
	now := model.Now()
	tx, err := s.db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()
	if _, err = tx.Exec(`INSERT INTO opportunity_applications(id,opportunity_id,project_id,professional_id,message,
		proposed_fee_cents,currency,availability_note,status,created_at,updated_at)
		VALUES($1,$2,$3,$4,$5,$6,$7,$8,'SUBMITTED',$9,$9)`,
		id, opportunityID, opportunity.ProjectID, professionalID, strings.TrimSpace(message),
		proposedFeeCents, opportunity.Currency, strings.TrimSpace(availability), now); err != nil {
		return nil, err
	}
	if err = recordAudit(tx, opportunity.ProjectID, professionalID, "opportunity_application_submitted",
		fmt.Sprintf("Professional applied to opportunity %s with a proposed fee of %d %s", opportunityID, proposedFeeCents, opportunity.Currency)); err != nil {
		return nil, err
	}
	if err = tx.Commit(); err != nil {
		return nil, err
	}
	return s.GetApplication(id)
}

const applicationColumns = `a.id,a.opportunity_id,a.project_id,a.professional_id,a.message,a.proposed_fee_cents,
	a.currency,a.availability_note,a.status,a.created_at,a.updated_at,u.name`

func (s *OpportunityService) GetApplication(id string) (*model.OpportunityApplication, error) {
	var a model.OpportunityApplication
	err := s.db.QueryRow(`SELECT `+applicationColumns+` FROM opportunity_applications a JOIN users u ON u.id=a.professional_id WHERE a.id=$1`, id).
		Scan(&a.ID, &a.OpportunityID, &a.ProjectID, &a.ProfessionalID, &a.Message, &a.ProposedFeeCents,
			&a.Currency, &a.AvailabilityNote, &a.Status, &a.CreatedAt, &a.UpdatedAt, &a.ProfessionalName)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, fmt.Errorf("%w: application", ErrNotFound)
	}
	if err != nil {
		return nil, err
	}
	return &a, nil
}

func (s *OpportunityService) Applications(opportunityID string) ([]model.OpportunityApplication, error) {
	rows, err := s.db.Query(`SELECT `+applicationColumns+` FROM opportunity_applications a JOIN users u ON u.id=a.professional_id
		WHERE a.opportunity_id=$1 ORDER BY a.created_at DESC`, opportunityID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []model.OpportunityApplication{}
	for rows.Next() {
		var a model.OpportunityApplication
		if err = rows.Scan(&a.ID, &a.OpportunityID, &a.ProjectID, &a.ProfessionalID, &a.Message,
			&a.ProposedFeeCents, &a.Currency, &a.AvailabilityNote, &a.Status, &a.CreatedAt,
			&a.UpdatedAt, &a.ProfessionalName); err != nil {
			return nil, err
		}
		items = append(items, a)
	}
	return items, rows.Err()
}

// MyApplications lists a professional's own applications.
func (s *OpportunityService) MyApplications(professionalID string) ([]model.OpportunityApplication, error) {
	rows, err := s.db.Query(`SELECT `+applicationColumns+` FROM opportunity_applications a JOIN users u ON u.id=a.professional_id
		WHERE a.professional_id=$1 ORDER BY a.created_at DESC`, professionalID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []model.OpportunityApplication{}
	for rows.Next() {
		var a model.OpportunityApplication
		if err = rows.Scan(&a.ID, &a.OpportunityID, &a.ProjectID, &a.ProfessionalID, &a.Message,
			&a.ProposedFeeCents, &a.Currency, &a.AvailabilityNote, &a.Status, &a.CreatedAt,
			&a.UpdatedAt, &a.ProfessionalName); err != nil {
			return nil, err
		}
		items = append(items, a)
	}
	return items, rows.Err()
}

// DecideApplication shortlists or rejects an application. Selection is a
// separate action because it creates an engagement.
func (s *OpportunityService) DecideApplication(applicationID, clientID string, status string) (*model.OpportunityApplication, error) {
	status = strings.ToUpper(strings.TrimSpace(status))
	if status != "SHORTLISTED" && status != "REJECTED" {
		return nil, fmt.Errorf("%w: decision must be SHORTLISTED or REJECTED", ErrValidation)
	}
	application, err := s.GetApplication(applicationID)
	if err != nil {
		return nil, err
	}
	opportunity, err := s.Get(application.OpportunityID)
	if err != nil {
		return nil, err
	}
	if opportunity.ClientID != clientID {
		return nil, ErrUnauthorized
	}
	if opportunity.Status != "OPEN" || application.Status == "SELECTED" || application.Status == "WITHDRAWN" {
		return nil, fmt.Errorf("%w: this application can no longer be decided", ErrConflict)
	}
	tx, err := s.db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()
	if _, err = tx.Exec(`UPDATE opportunity_applications SET status=$1,updated_at=$2 WHERE id=$3`, status, model.Now(), applicationID); err != nil {
		return nil, err
	}
	if err = recordAudit(tx, opportunity.ProjectID, clientID, "opportunity_application_"+strings.ToLower(status),
		fmt.Sprintf("Application %s on opportunity %s was %s", applicationID, opportunity.ID, strings.ToLower(status))); err != nil {
		return nil, err
	}
	if err = tx.Commit(); err != nil {
		return nil, err
	}
	return s.GetApplication(applicationID)
}

// SelectApplication awards an opportunity to one applicant and proposes a
// platform engagement with the application's terms. The new engagement remains
// PENDING until the client explicitly approves it.
func (s *OpportunityService) SelectApplication(applicationID, clientID string) (*model.Engagement, error) {
	application, err := s.GetApplication(applicationID)
	if err != nil {
		return nil, err
	}
	opportunity, err := s.Get(application.OpportunityID)
	if err != nil {
		return nil, err
	}
	if opportunity.ClientID != clientID {
		return nil, ErrUnauthorized
	}
	if opportunity.Status != "OPEN" {
		return nil, fmt.Errorf("%w: this opportunity is %s", ErrConflict, strings.ToLower(opportunity.Status))
	}
	if application.Status == "SELECTED" {
		return nil, fmt.Errorf("%w: this applicant has already been selected", ErrConflict)
	}
	if application.Status == "WITHDRAWN" || application.Status == "REJECTED" {
		return nil, fmt.Errorf("%w: this application is %s", ErrConflict, strings.ToLower(application.Status))
	}
	fee := application.ProposedFeeCents
	if fee <= 0 {
		fee = opportunity.BudgetCents
	}
	if fee <= 0 {
		return nil, fmt.Errorf("%w: agreed terms need a positive fee", ErrValidation)
	}
	timeline := "Per the published opportunity"
	if opportunity.Deadline != "" {
		timeline = "Complete by " + opportunity.Deadline
	}

	engagement, err := s.engagements.Create(CreateEngagementInput{
		ProjectID:         opportunity.ProjectID,
		ClientID:          clientID,
		ProfessionalID:    application.ProfessionalID,
		ConstructionStage: opportunity.ConstructionStage,
		Scope:             opportunity.Scope,
		Deliverables:      opportunity.Deliverables,
		Timeline:          timeline,
		EndDate:           opportunity.Deadline,
		FeeCents:          fee,
		Currency:          opportunity.Currency,
		OpportunityID:     opportunity.ID,
		ApplicationID:     application.ID,
	})
	if err != nil {
		return nil, err
	}

	tx, err := s.db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()
	if _, err = tx.Exec(`UPDATE opportunity_applications SET status='SELECTED',updated_at=$1 WHERE id=$2`, model.Now(), applicationID); err != nil {
		return nil, err
	}
	if _, err = tx.Exec(`UPDATE opportunity_applications SET status='REJECTED',updated_at=$1
		WHERE opportunity_id=$2 AND id<>$3 AND status IN ('SUBMITTED','SHORTLISTED')`, model.Now(), opportunity.ID, applicationID); err != nil {
		return nil, err
	}
	if _, err = tx.Exec(`UPDATE opportunities SET status='AWARDED',updated_at=$1 WHERE id=$2`, model.Now(), opportunity.ID); err != nil {
		return nil, err
	}
	if err = recordAudit(tx, opportunity.ProjectID, clientID, "opportunity_awarded",
		fmt.Sprintf("Opportunity %s awarded to professional %s; engagement %s awaits the client's terms approval",
			opportunity.ID, application.ProfessionalID, engagement.ID)); err != nil {
		return nil, err
	}
	if err = tx.Commit(); err != nil {
		return nil, err
	}
	return engagement, nil
}

// Close closes an open opportunity without awarding it.
func (s *OpportunityService) Close(opportunityID, clientID string) (*model.Opportunity, error) {
	opportunity, err := s.Get(opportunityID)
	if err != nil {
		return nil, err
	}
	if opportunity.ClientID != clientID {
		return nil, ErrUnauthorized
	}
	if opportunity.Status != "OPEN" {
		return nil, fmt.Errorf("%w: this opportunity is %s", ErrConflict, strings.ToLower(opportunity.Status))
	}
	tx, err := s.db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()
	if _, err = tx.Exec(`UPDATE opportunities SET status='CLOSED',updated_at=$1 WHERE id=$2`, model.Now(), opportunityID); err != nil {
		return nil, err
	}
	if _, err = tx.Exec(`UPDATE opportunity_applications SET status='REJECTED',updated_at=$1
		WHERE opportunity_id=$2 AND status IN ('SUBMITTED','SHORTLISTED')`, model.Now(), opportunityID); err != nil {
		return nil, err
	}
	if err = recordAudit(tx, opportunity.ProjectID, clientID, "opportunity_closed",
		fmt.Sprintf("Opportunity %s closed without an award", opportunityID)); err != nil {
		return nil, err
	}
	if err = tx.Commit(); err != nil {
		return nil, err
	}
	return s.Get(opportunityID)
}

// Withdraw lets a professional withdraw their own pending application.
func (s *OpportunityService) Withdraw(applicationID, professionalID string) (*model.OpportunityApplication, error) {
	application, err := s.GetApplication(applicationID)
	if err != nil {
		return nil, err
	}
	if application.ProfessionalID != professionalID {
		return nil, ErrUnauthorized
	}
	if application.Status != "SUBMITTED" && application.Status != "SHORTLISTED" {
		return nil, fmt.Errorf("%w: this application is %s", ErrConflict, strings.ToLower(application.Status))
	}
	application, err = s.updateApplicationStatus(applicationID, "WITHDRAWN", professionalID, "opportunity_application_withdrawn",
		fmt.Sprintf("Professional withdrew application %s", applicationID))
	return application, err
}

func (s *OpportunityService) updateApplicationStatus(applicationID, status, actor, action, details string) (*model.OpportunityApplication, error) {
	application, err := s.GetApplication(applicationID)
	if err != nil {
		return nil, err
	}
	tx, err := s.db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()
	if _, err = tx.Exec(`UPDATE opportunity_applications SET status=$1,updated_at=$2 WHERE id=$3`, status, model.Now(), applicationID); err != nil {
		return nil, err
	}
	if err = recordAudit(tx, application.ProjectID, actor, action, details); err != nil {
		return nil, err
	}
	if err = tx.Commit(); err != nil {
		return nil, err
	}
	return s.GetApplication(applicationID)
}
