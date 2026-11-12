package service

import (
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"

	"github.com/ubuild/backend/internal/model"
)

// EngagementService manages platform engagements: the agreed scope, timeline
// and fee between a client and a professional on one project.
//
// Only an engagement recorded and approved here is a UBuild engagement. A
// payment request that does not point at an approved engagement is refused.
type EngagementService struct {
	db *sql.DB
}

func NewEngagementService(db *sql.DB) *EngagementService {
	return &EngagementService{db: db}
}

// CreateEngagementInput is the agreed terms proposed by the client.
type CreateEngagementInput struct {
	ProjectID         string
	ClientID          string
	ProfessionalID    string
	ConstructionStage string
	Scope             string
	Deliverables      string
	Timeline          string
	StartDate         string
	EndDate           string
	FeeCents          int64
	Currency          string
	OpportunityID     string
	ApplicationID     string
}

// Create records a proposed engagement. It does not authorise any payment: the
// client must approve the terms first.
func (s *EngagementService) Create(in CreateEngagementInput) (*model.Engagement, error) {
	in.ProjectID = strings.TrimSpace(in.ProjectID)
	in.ClientID = strings.TrimSpace(in.ClientID)
	in.ProfessionalID = strings.TrimSpace(in.ProfessionalID)
	in.Scope = strings.TrimSpace(in.Scope)
	in.Deliverables = strings.TrimSpace(in.Deliverables)
	in.Timeline = strings.TrimSpace(in.Timeline)
	in.StartDate = strings.TrimSpace(in.StartDate)
	in.EndDate = strings.TrimSpace(in.EndDate)
	in.Currency = strings.ToUpper(strings.TrimSpace(in.Currency))
	in.OpportunityID = strings.TrimSpace(in.OpportunityID)
	in.ApplicationID = strings.TrimSpace(in.ApplicationID)
	in.ConstructionStage = strings.ToUpper(strings.TrimSpace(in.ConstructionStage))
	if in.Currency == "" {
		in.Currency = "KES"
	}
	if in.ConstructionStage == "" {
		in.ConstructionStage = string(model.ProjectStageDesign)
	}
	if !model.ValidProjectStage(model.ProjectStage(in.ConstructionStage)) {
		return nil, fmt.Errorf("%w: construction stage is not recognised", ErrValidation)
	}
	if in.ProjectID == "" || in.ClientID == "" || in.ProfessionalID == "" || len(strings.Fields(in.Scope)) == 0 || len(strings.Fields(in.Timeline)) == 0 {
		return nil, fmt.Errorf("%w: project, client, professional, scope and timeline are required", ErrValidation)
	}
	if in.ClientID == in.ProfessionalID {
		return nil, fmt.Errorf("%w: a client cannot engage themselves", ErrValidation)
	}
	if in.FeeCents <= 0 {
		return nil, fmt.Errorf("%w: the agreed fee must be positive", ErrValidation)
	}

	var professionalExists int
	if err := s.db.QueryRow(`SELECT 1 FROM professionals WHERE user_id=$1`, in.ProfessionalID).Scan(&professionalExists); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, fmt.Errorf("%w: the professional has no marketplace profile", ErrValidation)
		}
		return nil, err
	}

	id := model.NewID()
	now := model.Now()
	engagement := &model.Engagement{
		ID: id, ProjectID: in.ProjectID, ClientID: in.ClientID, ProfessionalID: in.ProfessionalID,
		ConstructionStage: in.ConstructionStage, Scope: in.Scope, Deliverables: in.Deliverables, Timeline: in.Timeline,
		StartDate: in.StartDate, EndDate: in.EndDate,
		FeeCents: in.FeeCents, Currency: in.Currency, TermsHash: termsHash(in.Scope, in.Deliverables, in.Timeline, in.FeeCents, in.Currency),
		Status: "PENDING", OpportunityID: in.OpportunityID, ApplicationID: in.ApplicationID, CreatedAt: now, UpdatedAt: now,
	}

	tx, err := s.db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	if _, err = tx.Exec(`INSERT INTO engagements(id,project_id,client_id,professional_id,construction_stage,scope,deliverables,timeline,
		start_date,end_date,fee_cents,currency,terms_hash,status,opportunity_id,application_id,created_at,updated_at)
		VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'PENDING',$14,$15,$16,$16)`,
		id, in.ProjectID, in.ClientID, in.ProfessionalID, in.ConstructionStage, in.Scope, in.Deliverables, in.Timeline,
		in.StartDate, in.EndDate, in.FeeCents, in.Currency, engagement.TermsHash, in.OpportunityID, in.ApplicationID, now); err != nil {
		return nil, err
	}
	if err = recordAudit(tx, in.ProjectID, in.ClientID, "engagement_proposed",
		fmt.Sprintf("Engagement proposed with professional %s for %s %d at the %s stage", in.ProfessionalID, in.Currency, in.FeeCents, in.ConstructionStage)); err != nil {
		return nil, err
	}
	if err = tx.Commit(); err != nil {
		return nil, err
	}
	return engagement, nil
}

// Approve records the client's explicit acceptance of the engagement terms.
func (s *EngagementService) Approve(engagementID, clientID string) (*model.Engagement, error) {
	engagement, err := s.Get(engagementID)
	if err != nil {
		return nil, err
	}
	if engagement.ClientID != clientID {
		return nil, ErrUnauthorized
	}
	if engagement.Status != "PENDING" {
		return nil, fmt.Errorf("%w: only a pending engagement can be approved", ErrConflict)
	}
	now := model.Now()

	tx, err := s.db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()
	if _, err = tx.Exec(`UPDATE engagements SET status='APPROVED',approved_by=$1,approved_at=$2,updated_at=$3 WHERE id=$4`,
		clientID, now, now, engagementID); err != nil {
		return nil, err
	}
	if err = ensureEngagementMembership(tx, engagement); err != nil {
		return nil, err
	}
	if err = recordAudit(tx, engagement.ProjectID, clientID, "engagement_approved",
		fmt.Sprintf("Engagement %s approved by the client with agreed fee %s %d; the professional became an active project member", engagementID, engagement.Currency, engagement.FeeCents)); err != nil {
		return nil, err
	}
	if err = tx.Commit(); err != nil {
		return nil, err
	}
	return s.Get(engagementID)
}

// Get returns one engagement.
func (s *EngagementService) Get(engagementID string) (*model.Engagement, error) {
	engagement, err := scanEngagement(s.db.QueryRow(`SELECT `+engagementColumns+` FROM engagements WHERE id=$1`, engagementID))
	if errors.Is(err, sql.ErrNoRows) {
		return nil, fmt.Errorf("%w: engagement", ErrNotFound)
	}
	if err != nil {
		return nil, err
	}
	return engagement, nil
}

// List returns the engagements on a project.
func (s *EngagementService) List(projectID string) ([]model.Engagement, error) {
	rows, err := s.db.Query(`SELECT `+engagementColumns+` FROM engagements WHERE project_id=$1 ORDER BY created_at DESC`, projectID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	engagements := []model.Engagement{}
	for rows.Next() {
		engagement, err := scanEngagement(rows)
		if err != nil {
			return nil, err
		}
		engagements = append(engagements, *engagement)
	}
	return engagements, rows.Err()
}

// AgreedTotalCents is the fee the client has actually agreed: the original
// engagement fee plus every approved variation. Payment requests are capped by
// this figure.
func (s *EngagementService) AgreedTotalCents(engagementID string) (int64, error) {
	var total int64
	if err := s.db.QueryRow(`SELECT fee_cents FROM engagements WHERE id=$1`, engagementID).Scan(&total); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return 0, fmt.Errorf("%w: engagement", ErrNotFound)
		}
		return 0, err
	}
	var approved int64
	if err := s.db.QueryRow(`SELECT COALESCE(SUM(fee_cents),0) FROM engagement_variations WHERE engagement_id=$1 AND status='APPROVED'`, engagementID).Scan(&approved); err != nil {
		return 0, err
	}
	return total + approved, nil
}

// Complete marks an approved engagement complete. It requires every agreed
// shilling to have been released through a provider-confirmed payment, so
// completion can never run ahead of the money.
func (s *EngagementService) Complete(engagementID, clientID string) (*model.Engagement, error) {
	engagement, err := s.Get(engagementID)
	if err != nil {
		return nil, err
	}
	if engagement.ClientID != clientID {
		return nil, ErrUnauthorized
	}
	if engagement.Status != "APPROVED" {
		return nil, fmt.Errorf("%w: only an approved engagement can be completed", ErrConflict)
	}

	agreed, err := s.AgreedTotalCents(engagementID)
	if err != nil {
		return nil, err
	}
	released, err := confirmedReleasedCents(s.db, engagementID)
	if err != nil {
		return nil, err
	}
	if released < agreed {
		return nil, fmt.Errorf("%w: %d of %d %s released so far", ErrProviderNotConfirmed, released, agreed, engagement.Currency)
	}
	var openRequests int
	if err := s.db.QueryRow(`SELECT COUNT(*) FROM payment_requests WHERE engagement_id=$1 AND status IN ('SUBMITTED','AUTHORIZED')`, engagementID).Scan(&openRequests); err != nil {
		return nil, err
	}
	if openRequests > 0 {
		return nil, fmt.Errorf("%w: payment requests are still open", ErrConflict)
	}

	now := model.Now()
	tx, err := s.db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()
	if _, err = tx.Exec(`UPDATE engagements SET status='COMPLETED',completed_at=$1,updated_at=$1 WHERE id=$2`, now, engagementID); err != nil {
		return nil, err
	}
	if err = recordAudit(tx, engagement.ProjectID, clientID, "engagement_completed",
		fmt.Sprintf("Engagement %s completed after %s %d in provider-confirmed payments", engagementID, engagement.Currency, released)); err != nil {
		return nil, err
	}
	if err = tx.Commit(); err != nil {
		return nil, err
	}
	return s.Get(engagementID)
}

// CreateVariation proposes new terms. A variation has no effect until the
// client approves it.
func (s *EngagementService) CreateVariation(engagementID, requestedBy, scope, deliverables, timeline string, feeCents int64, currency string) (*model.EngagementVariation, error) {
	engagement, err := s.Get(engagementID)
	if err != nil {
		return nil, err
	}
	if engagement.Status != "APPROVED" {
		return nil, fmt.Errorf("%w: variations require an approved engagement", ErrConflict)
	}
	requestedBy = strings.TrimSpace(requestedBy)
	if requestedBy != engagement.ClientID && requestedBy != engagement.ProfessionalID {
		return nil, ErrUnauthorized
	}
	scope = strings.TrimSpace(scope)
	deliverables = strings.TrimSpace(deliverables)
	timeline = strings.TrimSpace(timeline)
	currency = strings.ToUpper(strings.TrimSpace(currency))
	if currency == "" {
		currency = engagement.Currency
	}
	if len(strings.Fields(scope)) == 0 && len(strings.Fields(deliverables)) == 0 && feeCents == 0 && len(strings.Fields(timeline)) == 0 {
		return nil, fmt.Errorf("%w: a variation must change something", ErrValidation)
	}

	id := model.NewID()
	now := model.Now()
	tx, err := s.db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()
	if _, err = tx.Exec(`INSERT INTO engagement_variations(id,engagement_id,requested_by,scope,deliverables,timeline,fee_cents,currency,status,created_at,updated_at)
		VALUES($1,$2,$3,$4,$5,$6,$7,$8,'REQUESTED',$9,$9)`,
		id, engagementID, requestedBy, scope, deliverables, timeline, feeCents, currency, now); err != nil {
		return nil, err
	}
	if err = recordAudit(tx, engagement.ProjectID, requestedBy, "variation_requested",
		fmt.Sprintf("Variation %s requested on engagement %s with a fee change of %d %s", id, engagementID, feeCents, currency)); err != nil {
		return nil, err
	}
	if err = tx.Commit(); err != nil {
		return nil, err
	}
	return s.GetVariation(id)
}

// GetVariation returns one variation.
func (s *EngagementService) GetVariation(id string) (*model.EngagementVariation, error) {
	var v model.EngagementVariation
	err := s.db.QueryRow(`SELECT id,engagement_id,requested_by,scope,deliverables,timeline,fee_cents,currency,status,
		COALESCE(decided_by,''),COALESCE(decided_at,''),created_at,updated_at FROM engagement_variations WHERE id=$1`, id).
		Scan(&v.ID, &v.EngagementID, &v.RequestedBy, &v.Scope, &v.Deliverables, &v.Timeline, &v.FeeCents,
			&v.Currency, &v.Status, &v.DecidedBy, &v.DecidedAt, &v.CreatedAt, &v.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, fmt.Errorf("%w: variation", ErrNotFound)
	}
	if err != nil {
		return nil, err
	}
	return &v, nil
}

// ListVariations returns the variations recorded for an engagement.
func (s *EngagementService) ListVariations(engagementID string) ([]model.EngagementVariation, error) {
	rows, err := s.db.Query(`SELECT id,engagement_id,requested_by,scope,deliverables,timeline,fee_cents,currency,status,
		COALESCE(decided_by,''),COALESCE(decided_at,''),created_at,updated_at
		FROM engagement_variations WHERE engagement_id=$1 ORDER BY created_at DESC`, engagementID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	variations := []model.EngagementVariation{}
	for rows.Next() {
		var v model.EngagementVariation
		if err = rows.Scan(&v.ID, &v.EngagementID, &v.RequestedBy, &v.Scope, &v.Deliverables, &v.Timeline,
			&v.FeeCents, &v.Currency, &v.Status, &v.DecidedBy, &v.DecidedAt, &v.CreatedAt, &v.UpdatedAt); err != nil {
			return nil, err
		}
		variations = append(variations, v)
	}
	return variations, rows.Err()
}

// DecideVariation records the client's explicit decision on a variation.
func (s *EngagementService) DecideVariation(id, clientID string, approve bool, note string) (*model.EngagementVariation, error) {
	variation, err := s.GetVariation(id)
	if err != nil {
		return nil, err
	}
	engagement, err := s.Get(variation.EngagementID)
	if err != nil {
		return nil, err
	}
	if engagement.ClientID != clientID {
		return nil, ErrUnauthorized
	}
	if variation.Status != "REQUESTED" {
		return nil, fmt.Errorf("%w: the variation is already decided", ErrConflict)
	}
	if !approve && strings.TrimSpace(note) == "" {
		return nil, fmt.Errorf("%w: a rejection needs a reason", ErrValidation)
	}

	status := "REJECTED"
	if approve {
		status = "APPROVED"
	}
	now := model.Now()
	tx, err := s.db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()
	if _, err = tx.Exec(`UPDATE engagement_variations SET status=$1,decided_by=$2,decided_at=$3,updated_at=$3 WHERE id=$4`,
		status, clientID, now, id); err != nil {
		return nil, err
	}
	action := "variation_rejected"
	if approve {
		action = "variation_approved"
	}
	if err = recordAudit(tx, engagement.ProjectID, clientID, action,
		fmt.Sprintf("Variation %s on engagement %s %s", id, variation.EngagementID, strings.ToLower(status))); err != nil {
		return nil, err
	}
	if err = tx.Commit(); err != nil {
		return nil, err
	}
	return s.GetVariation(id)
}

// ensureEngagementMembership makes an approved professional an active project
// member with their declared professional role. Membership is what lets the
// same user read the project workspace, documents, milestones and their own
// financial records; it never makes them the owner or a financial approver.
func ensureEngagementMembership(tx *sql.Tx, engagement *model.Engagement) error {
	role := "CONTRACTOR"
	if err := tx.QueryRow(`SELECT COALESCE(NULLIF(project_role,''),'CONTRACTOR') FROM professionals WHERE user_id=$1`, engagement.ProfessionalID).Scan(&role); err != nil && !errors.Is(err, sql.ErrNoRows) {
		return err
	}
	if role == "OWNER" {
		role = "CONTRACTOR"
	}
	var membershipID string
	err := tx.QueryRow(`SELECT id FROM memberships WHERE project_id=$1 AND user_id=$2`, engagement.ProjectID, engagement.ProfessionalID).Scan(&membershipID)
	if errors.Is(err, sql.ErrNoRows) {
		now := model.Now()
		_, err = tx.Exec(`INSERT INTO memberships(id,user_id,project_id,role,status,joined_at,updated_at)
			VALUES($1,$2,$3,$4,'ACTIVE',$5,$5)`,
			model.NewID(), engagement.ProfessionalID, engagement.ProjectID, role, now)
		return err
	}
	if err != nil {
		return err
	}
	_, err = tx.Exec(`UPDATE memberships SET status='ACTIVE',updated_at=$1 WHERE id=$2 AND status<>'ACTIVE'`, model.Now(), membershipID)
	return err
}

func termsHash(scope, deliverables, timeline string, feeCents int64, currency string) string {
	raw := fmt.Sprintf("%s|%s|%s|%d|%s", scope, deliverables, timeline, feeCents, currency)
	sum := sha256.Sum256([]byte(raw))
	return hex.EncodeToString(sum[:])
}

const engagementColumns = `id,project_id,client_id,professional_id,construction_stage,scope,deliverables,timeline,
	start_date,end_date,fee_cents,currency,terms_hash,status,opportunity_id,application_id,
	COALESCE(approved_by,''),COALESCE(approved_at,''),COALESCE(completed_at,''),created_at,updated_at`

func scanEngagement(row rowScanner) (*model.Engagement, error) {
	var e model.Engagement
	if err := row.Scan(&e.ID, &e.ProjectID, &e.ClientID, &e.ProfessionalID, &e.ConstructionStage, &e.Scope, &e.Deliverables,
		&e.Timeline, &e.StartDate, &e.EndDate, &e.FeeCents, &e.Currency, &e.TermsHash, &e.Status,
		&e.OpportunityID, &e.ApplicationID, &e.ApprovedBy, &e.ApprovedAt,
		&e.CompletedAt, &e.CreatedAt, &e.UpdatedAt); err != nil {
		return nil, err
	}
	return &e, nil
}

func confirmedReleasedCents(db *sql.DB, engagementID string) (int64, error) {
	var released int64
	err := db.QueryRow(`SELECT COALESCE(SUM(amount_cents),0) FROM financial_ledger
		WHERE engagement_id=$1 AND entry_type='RELEASE' AND direction='DEBIT' AND status='POSTED'`, engagementID).Scan(&released)
	return released, err
}

func recordAudit(tx *sql.Tx, projectID, userID, action, details string) error {
	_, err := tx.Exec(`INSERT INTO audit_entries(id,project_id,user_id,action,details,created_at) VALUES($1,$2,$3,$4,$5,$6)`,
		model.NewID(), projectID, userID, action, details, model.Now())
	return err
}
