package service

import (
	"database/sql"
	"errors"
	"fmt"
	"strings"

	"github.com/ubuild/backend/internal/model"
)

// FinanceService owns the project funds account, payment requests, the client's
// explicit payment instructions, the financial ledger and provider
// confirmation.
//
// The rules it enforces:
//   - a payment request requires an approved UBuild engagement;
//   - a request may not exceed the agreed terms unless a variation has been
//     approved;
//   - money leaves the project account only on an explicit client instruction;
//   - a professional can never authorize their own payment;
//   - a payment is complete only when the payment provider confirms it.
//
// Allocations are planning earmarks. They identify the stage or engagement the
// client intends the money for, but they never move money and they never
// substitute for the provider-confirmed balance.
type FinanceService struct {
	db *sql.DB
}

func NewFinanceService(db *sql.DB) *FinanceService {
	return &FinanceService{db: db}
}

// CreateFundsAccount opens the single project money account. UBuild stores the
// configuration and records confirmed movements; the bank or payment service
// provider holds the funds.
func (s *FinanceService) CreateFundsAccount(projectID, clientID, source string) (*model.ProjectFundsAccount, error) {
	projectID = strings.TrimSpace(projectID)
	clientID = strings.TrimSpace(clientID)
	source = strings.TrimSpace(source)
	if projectID == "" || clientID == "" || source == "" {
		return nil, fmt.Errorf("%w: project, client and funding source are required", ErrValidation)
	}

	var ownerID, currency, stage string
	err := s.db.QueryRow(`SELECT owner_id,COALESCE(NULLIF(currency,''),'KES'),COALESCE(NULLIF(construction_stage,''),'DESIGN') FROM projects WHERE id=$1`, projectID).
		Scan(&ownerID, &currency, &stage)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, fmt.Errorf("%w: project", ErrNotFound)
	}
	if err != nil {
		return nil, err
	}
	if ownerID != clientID {
		return nil, ErrUnauthorized
	}

	var existing string
	if err := s.db.QueryRow(`SELECT id FROM project_funds_accounts WHERE project_id=$1`, projectID).Scan(&existing); err == nil {
		return nil, fmt.Errorf("%w: this project already has a funds account", ErrConflict)
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
	if _, err = tx.Exec(`INSERT INTO project_funds_accounts(id,project_id,client_id,source,status,balance_cents,allocated_cents,currency,construction_stage,created_at,updated_at)
		VALUES($1,$2,$3,$4,'ACTIVE',0,0,$5,$6,$7,$7)`, id, projectID, clientID, source, currency, stage, now); err != nil {
		return nil, err
	}
	if err = recordAudit(tx, projectID, clientID, "project_funds_opened",
		"Client opened a project funds account funded from "+source+" ("+currency+")"); err != nil {
		return nil, err
	}
	if err = tx.Commit(); err != nil {
		return nil, err
	}
	return s.FundsAccount(projectID)
}

// FundsAccount returns the project money account, if one exists.
func (s *FinanceService) FundsAccount(projectID string) (*model.ProjectFundsAccount, error) {
	var account model.ProjectFundsAccount
	err := s.db.QueryRow(`SELECT id,project_id,client_id,source,status,balance_cents,allocated_cents,currency,construction_stage,created_at,updated_at
		FROM project_funds_accounts WHERE project_id=$1`, projectID).Scan(&account.ID, &account.ProjectID, &account.ClientID, &account.Source, &account.Status,
		&account.BalanceCents, &account.AllocatedCents, &account.Currency, &account.ConstructionStage, &account.CreatedAt, &account.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, fmt.Errorf("%w: project funds account", ErrNotFound)
	}
	if err != nil {
		return nil, err
	}
	return &account, nil
}

// Deposit records a client deposit. The ledger entry stays pending until the
// payment provider confirms the money arrived.
func (s *FinanceService) Deposit(projectID, clientID string, amountCents int64) (*model.LedgerEntry, error) {
	if amountCents <= 0 {
		return nil, fmt.Errorf("%w: the deposit must be positive", ErrValidation)
	}
	account, err := s.FundsAccount(projectID)
	if err != nil {
		return nil, err
	}
	if account.ClientID != clientID {
		return nil, ErrUnauthorized
	}
	if account.Status != "ACTIVE" {
		return nil, fmt.Errorf("%w: the funds account is not active", ErrConflict)
	}
	if _, err := s.providerFor(projectID); err != nil {
		return nil, err
	}

	entry, err := s.recordPendingEntry(entryInput{
		ProjectID:   projectID,
		UserID:      clientID,
		EntryType:   "DEPOSIT",
		Direction:   "CREDIT",
		AmountCents: amountCents,
		Currency:    account.Currency,
		Description: "Deposit into the project funds account",
		ProviderRef: "ub-dep-" + model.NewID()[:16],
	})
	if err != nil {
		return nil, err
	}
	return entry, nil
}

// RequestPayment is the professional's request for payment for submitted
// deliverables. It is refused when the engagement is not approved or when the
// request would exceed the agreed terms.
func (s *FinanceService) RequestPayment(projectID, engagementID, professionalID, description string, amountCents int64, deliverableIDs []string) (*model.PaymentRequest, error) {
	projectID = strings.TrimSpace(projectID)
	engagementID = strings.TrimSpace(engagementID)
	professionalID = strings.TrimSpace(professionalID)
	description = strings.TrimSpace(description)
	deliverableIDs = cleanList(deliverableIDs)

	if projectID == "" || engagementID == "" || professionalID == "" || description == "" {
		return nil, fmt.Errorf("%w: project, engagement, professional and description are required", ErrValidation)
	}
	if amountCents <= 0 {
		return nil, fmt.Errorf("%w: the amount must be positive", ErrValidation)
	}
	if len(deliverableIDs) == 0 {
		return nil, fmt.Errorf("%w: submit at least one deliverable with the request", ErrValidation)
	}
	if err := s.validateDeliverables(projectID, deliverableIDs); err != nil {
		return nil, err
	}

	tx, err := s.db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	engagement, err := s.lockEngagement(tx, engagementID)
	if err != nil {
		return nil, err
	}
	if engagement.ProjectID != projectID || engagement.ProfessionalID != professionalID {
		return nil, ErrEngagementRequired
	}
	if engagement.Status != "APPROVED" {
		return nil, fmt.Errorf("%w: the engagement is %s", ErrEngagementRequired, strings.ToLower(engagement.Status))
	}

	agreed, err := agreedTotalTx(tx, engagementID)
	if err != nil {
		return nil, err
	}
	committed, err := committedCentsTx(tx, engagementID)
	if err != nil {
		return nil, err
	}
	if committed+amountCents > agreed {
		return nil, fmt.Errorf("%w: %d %s already requested of %d %s agreed; an approved variation is required",
			ErrExceedsAgreedTerms, committed, engagement.Currency, agreed, engagement.Currency)
	}
	var openRequests int
	if err := tx.QueryRow(`SELECT COUNT(*) FROM payment_requests WHERE engagement_id=$1 AND status IN ('SUBMITTED','REVISIONS_REQUESTED')`, engagementID).Scan(&openRequests); err != nil {
		return nil, err
	}
	if openRequests > 0 {
		return nil, fmt.Errorf("%w: a payment request is already awaiting the client's decision", ErrConflict)
	}

	id := model.NewID()
	now := model.Now()
	if _, err = tx.Exec(`INSERT INTO payment_requests(id,project_id,engagement_id,professional_id,client_id,description,amount_cents,currency,
		deliverable_ids,status,requested_by,requested_at,created_at,updated_at)
		VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,'SUBMITTED',$4,$10,$10,$10)`,
		id, projectID, engagementID, professionalID, engagement.ClientID, description, amountCents, engagement.Currency,
		strings.Join(deliverableIDs, ","), now); err != nil {
		return nil, err
	}
	if err = recordAudit(tx, projectID, professionalID, "payment_requested",
		fmt.Sprintf("Professional requested %d %s for engagement %s with deliverables %s",
			amountCents, engagement.Currency, engagementID, strings.Join(deliverableIDs, ", "))); err != nil {
		return nil, err
	}
	if err = tx.Commit(); err != nil {
		return nil, err
	}
	return s.PaymentRequest(id)
}

// validateDeliverables accepts a document on the same project or a free-text
// deliverable reference. A document id that belongs to another project is
// always refused, so supporting evidence cannot be borrowed from elsewhere.
func (s *FinanceService) validateDeliverables(projectID string, references []string) error {
	for _, reference := range references {
		var documentProject string
		err := s.db.QueryRow(`SELECT project_id FROM documents WHERE id=$1`, reference).Scan(&documentProject)
		switch {
		case err == nil:
			if documentProject != projectID {
				return fmt.Errorf("%w: a supporting document belongs to another project", ErrValidation)
			}
		case errors.Is(err, sql.ErrNoRows):
			// A descriptive reference is allowed; the professional may not
			// have uploaded a file yet. Uploading it links the same project
			// record through documents.engagement_id.
		default:
			return err
		}
	}
	return nil
}

// PaymentRequest returns one payment request.
func (s *FinanceService) PaymentRequest(id string) (*model.PaymentRequest, error) {
	request, err := scanPaymentRequest(s.db.QueryRow(`SELECT `+paymentRequestColumns+` FROM payment_requests WHERE id=$1`, id))
	if errors.Is(err, sql.ErrNoRows) {
		return nil, fmt.Errorf("%w: payment request", ErrNotFound)
	}
	if err != nil {
		return nil, err
	}
	return request, nil
}

// PaymentRequests lists the payment requests on a project.
func (s *FinanceService) PaymentRequests(projectID string) ([]model.PaymentRequest, error) {
	rows, err := s.db.Query(`SELECT `+paymentRequestColumns+` FROM payment_requests WHERE project_id=$1 ORDER BY created_at DESC`, projectID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	requests := []model.PaymentRequest{}
	for rows.Next() {
		request, err := scanPaymentRequest(rows)
		if err != nil {
			return nil, err
		}
		requests = append(requests, *request)
	}
	return requests, rows.Err()
}

// Instructions lists the client instructions recorded against a payment request.
func (s *FinanceService) Instructions(paymentRequestID string) ([]model.PaymentInstruction, error) {
	rows, err := s.db.Query(`SELECT id,project_id,payment_request_id,client_id,action,note,created_at
		FROM payment_instructions WHERE payment_request_id=$1 ORDER BY created_at`, paymentRequestID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	instructions := []model.PaymentInstruction{}
	for rows.Next() {
		var instruction model.PaymentInstruction
		if err = rows.Scan(&instruction.ID, &instruction.ProjectID, &instruction.PaymentRequestID,
			&instruction.ClientID, &instruction.Action, &instruction.Note, &instruction.CreatedAt); err != nil {
			return nil, err
		}
		instructions = append(instructions, instruction)
	}
	return instructions, rows.Err()
}

// Authorize records the client's explicit instruction to pay and submits the
// release to the payment provider. The payment is not complete at this point.
func (s *FinanceService) Authorize(paymentRequestID, clientID, note string) (*model.PaymentRequest, *model.LedgerEntry, error) {
	tx, err := s.db.Begin()
	if err != nil {
		return nil, nil, err
	}
	defer tx.Rollback()

	request, err := s.lockPaymentRequest(tx, paymentRequestID)
	if err != nil {
		return nil, nil, err
	}
	if request.ClientID != clientID {
		return nil, nil, ErrUnauthorized
	}
	if request.ProfessionalID == clientID {
		return nil, nil, ErrSelfApproval
	}
	if request.Status != "SUBMITTED" {
		return nil, nil, fmt.Errorf("%w: the request is %s", ErrConflict, strings.ToLower(request.Status))
	}
	if _, err := providerForTx(tx, request.ProjectID); err != nil {
		return nil, nil, err
	}

	engagement, err := s.lockEngagement(tx, request.EngagementID)
	if err != nil {
		return nil, nil, err
	}
	if engagement.ProjectID != request.ProjectID || engagement.ClientID != clientID || engagement.ProfessionalID != request.ProfessionalID {
		return nil, nil, ErrEngagementRequired
	}
	if engagement.Status != "APPROVED" {
		return nil, nil, fmt.Errorf("%w: the engagement is %s", ErrEngagementRequired, strings.ToLower(engagement.Status))
	}

	agreed, err := agreedTotalTx(tx, request.EngagementID)
	if err != nil {
		return nil, nil, err
	}
	otherCommitted, err := committedCentsTx(tx, request.EngagementID)
	if err != nil {
		return nil, nil, err
	}
	otherCommitted -= request.AmountCents
	if otherCommitted+request.AmountCents > agreed {
		return nil, nil, fmt.Errorf("%w: the request exceeds the agreed terms", ErrExceedsAgreedTerms)
	}

	balance, pending, err := lockFunds(tx, request.ProjectID)
	if err != nil {
		return nil, nil, err
	}
	available := balance - pending
	if available < request.AmountCents {
		return nil, nil, fmt.Errorf("%w: %d %s available, %d %s requested",
			ErrInsufficientFunds, available, request.Currency, request.AmountCents, request.Currency)
	}

	now := model.Now()
	reference := "ub-rel-" + model.NewID()[:16]
	if _, err = tx.Exec(`INSERT INTO payment_instructions(id,project_id,payment_request_id,client_id,action,note,created_at)
		VALUES($1,$2,$3,$4,'AUTHORIZE',$5,$6)`, model.NewID(), request.ProjectID, request.ID, clientID, strings.TrimSpace(note), now); err != nil {
		return nil, nil, err
	}
	if _, err = tx.Exec(`UPDATE payment_requests SET status='AUTHORIZED',decided_by=$1,decided_at=$2,decision_note=$3,
		provider_reference=$4,provider_status='PENDING',updated_at=$2 WHERE id=$5`,
		clientID, now, strings.TrimSpace(note), reference, request.ID); err != nil {
		return nil, nil, err
	}
	if _, err = tx.Exec(`INSERT INTO financial_ledger(id,project_id,engagement_id,payment_request_id,user_id,entry_type,direction,
		amount_cents,currency,description,balance_after_cents,provider_reference,status,created_at)
		VALUES($1,$2,$3,$4,$5,'RELEASE','DEBIT',$6,$7,$8,0,$9,'PENDING_CONFIRMATION',$10)`,
		model.NewID(), request.ProjectID, request.EngagementID, request.ID, clientID,
		request.AmountCents, request.Currency, "Release authorized: "+request.Description, reference, now); err != nil {
		return nil, nil, err
	}
	if err = recordAudit(tx, request.ProjectID, clientID, "payment_authorized",
		fmt.Sprintf("Client explicitly authorized %d %s for payment request %s (provider reference %s); completion awaits provider confirmation",
			request.AmountCents, request.Currency, request.ID, reference)); err != nil {
		return nil, nil, err
	}
	if err = tx.Commit(); err != nil {
		return nil, nil, err
	}

	updated, err := s.PaymentRequest(request.ID)
	if err != nil {
		return nil, nil, err
	}
	entry, err := s.LedgerEntryByReference(reference)
	if err != nil {
		return nil, nil, err
	}
	return updated, entry, nil
}

// Reject records the client's explicit refusal. No money moves.
func (s *FinanceService) Reject(paymentRequestID, clientID, note string) (*model.PaymentRequest, error) {
	note = strings.TrimSpace(note)
	if note == "" {
		return nil, fmt.Errorf("%w: a rejection needs a reason", ErrValidation)
	}
	return s.decide(paymentRequestID, clientID, "REJECTED", "REJECT", note)
}

// RequestRevisions asks the professional to correct or complete the submitted
// work. No money moves and the request is not counted as committed until it is
// resubmitted.
func (s *FinanceService) RequestRevisions(paymentRequestID, clientID, note string) (*model.PaymentRequest, error) {
	note = strings.TrimSpace(note)
	if note == "" {
		return nil, fmt.Errorf("%w: requesting revisions needs a reason", ErrValidation)
	}
	return s.decide(paymentRequestID, clientID, "REVISIONS_REQUESTED", "REQUEST_REVISIONS", note)
}

func (s *FinanceService) decide(paymentRequestID, clientID, status, instruction, note string) (*model.PaymentRequest, error) {
	tx, err := s.db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()
	request, err := s.lockPaymentRequest(tx, paymentRequestID)
	if err != nil {
		return nil, err
	}
	if request.ClientID != clientID {
		return nil, ErrUnauthorized
	}
	if request.Status != "SUBMITTED" {
		return nil, fmt.Errorf("%w: the request is %s", ErrConflict, strings.ToLower(request.Status))
	}
	now := model.Now()
	if _, err = tx.Exec(`INSERT INTO payment_instructions(id,project_id,payment_request_id,client_id,action,note,created_at)
		VALUES($1,$2,$3,$4,$5,$6,$7)`, model.NewID(), request.ProjectID, request.ID, clientID, instruction, note, now); err != nil {
		return nil, err
	}
	if _, err = tx.Exec(`UPDATE payment_requests SET status=$1,decided_by=$2,decided_at=$3,decision_note=$4,updated_at=$3 WHERE id=$5`,
		status, clientID, now, note, request.ID); err != nil {
		return nil, err
	}
	action := "payment_rejected"
	if status == "REVISIONS_REQUESTED" {
		action = "payment_revisions_requested"
	}
	if err = recordAudit(tx, request.ProjectID, clientID, action,
		fmt.Sprintf("Client %s payment request %s: %s", strings.ToLower(instruction), request.ID, note)); err != nil {
		return nil, err
	}
	if err = tx.Commit(); err != nil {
		return nil, err
	}
	return s.PaymentRequest(request.ID)
}

// Resubmit lets the professional correct a request after the client asked for
// revisions. The agreed-terms cap is re-checked before the request returns to
// the client's queue.
func (s *FinanceService) Resubmit(paymentRequestID, professionalID, description string, amountCents int64, deliverableIDs []string) (*model.PaymentRequest, error) {
	description = strings.TrimSpace(description)
	deliverableIDs = cleanList(deliverableIDs)
	if description == "" || amountCents <= 0 || len(deliverableIDs) == 0 {
		return nil, fmt.Errorf("%w: description, positive amount and at least one deliverable are required", ErrValidation)
	}
	// Validate supporting documents before taking the transaction lock. On
	// SQLite the transaction owns the only connection, so a query through the
	// pool inside the transaction would deadlock.
	existing, err := s.PaymentRequest(paymentRequestID)
	if err != nil {
		return nil, err
	}
	if existing.ProfessionalID != professionalID {
		return nil, ErrUnauthorized
	}
	if err := s.validateDeliverables(existing.ProjectID, deliverableIDs); err != nil {
		return nil, err
	}
	tx, err := s.db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()
	request, err := s.lockPaymentRequest(tx, paymentRequestID)
	if err != nil {
		return nil, err
	}
	if request.ProfessionalID != professionalID {
		return nil, ErrUnauthorized
	}
	if request.Status != "REVISIONS_REQUESTED" {
		return nil, fmt.Errorf("%w: only a request awaiting revisions can be resubmitted", ErrConflict)
	}
	engagement, err := s.lockEngagement(tx, request.EngagementID)
	if err != nil {
		return nil, err
	}
	if engagement.Status != "APPROVED" {
		return nil, fmt.Errorf("%w: the engagement is %s", ErrEngagementRequired, strings.ToLower(engagement.Status))
	}
	agreed, err := agreedTotalTx(tx, request.EngagementID)
	if err != nil {
		return nil, err
	}
	committed, err := committedCentsTx(tx, request.EngagementID)
	if err != nil {
		return nil, err
	}
	committed -= request.AmountCents
	if committed+amountCents > agreed {
		return nil, fmt.Errorf("%w: %d %s already requested of %d %s agreed", ErrExceedsAgreedTerms, committed, engagement.Currency, agreed, engagement.Currency)
	}
	now := model.Now()
	if _, err = tx.Exec(`UPDATE payment_requests SET description=$1,amount_cents=$2,deliverable_ids=$3,status='SUBMITTED',
		decided_by=NULL,decided_at=NULL,decision_note='',provider_status='',updated_at=$4 WHERE id=$5`,
		description, amountCents, strings.Join(deliverableIDs, ","), now, request.ID); err != nil {
		return nil, err
	}
	if err = recordAudit(tx, request.ProjectID, professionalID, "payment_request_resubmitted",
		fmt.Sprintf("Professional resubmitted payment request %s for %d %s", request.ID, amountCents, engagement.Currency)); err != nil {
		return nil, err
	}
	if err = tx.Commit(); err != nil {
		return nil, err
	}
	return s.PaymentRequest(request.ID)
}

// ConfirmProviderTransaction records the payment provider's confirmation. Only
// this call can complete a payment: a client authorization on its own leaves
// the request AUTHORIZED and the ledger entry pending.
func (s *FinanceService) ConfirmProviderTransaction(reference, outcome, providerReference string) (*model.LedgerEntry, error) {
	reference = strings.TrimSpace(reference)
	if reference == "" {
		return nil, fmt.Errorf("%w: a provider reference is required", ErrValidation)
	}
	outcome = strings.ToUpper(strings.TrimSpace(outcome))
	if outcome != "SUCCEEDED" && outcome != "FAILED" {
		return nil, fmt.Errorf("%w: outcome must be SUCCEEDED or FAILED", ErrValidation)
	}

	tx, err := s.db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	entry, err := s.lockLedgerEntry(tx, reference)
	if err != nil {
		return nil, err
	}
	if entry.Status == "POSTED" && outcome == "SUCCEEDED" {
		// Repeating a successful confirmation does not move money twice.
		if err = tx.Commit(); err != nil {
			return nil, err
		}
		return s.LedgerEntryByReference(reference)
	}
	if entry.Status != "PENDING_CONFIRMATION" {
		return nil, fmt.Errorf("%w: the ledger entry is %s", ErrConflict, strings.ToLower(entry.Status))
	}

	now := model.Now()
	if outcome == "FAILED" {
		if _, err = tx.Exec(`UPDATE financial_ledger SET status='FAILED' WHERE id=$1`, entry.ID); err != nil {
			return nil, err
		}
		if entry.PaymentRequestID != "" {
			if _, err = tx.Exec(`UPDATE payment_requests SET status='SUBMITTED',provider_status='FAILED',updated_at=$1 WHERE id=$2`,
				now, entry.PaymentRequestID); err != nil {
				return nil, err
			}
		}
		if err = recordAudit(tx, entry.ProjectID, entry.UserID, "provider_payment_failed",
			fmt.Sprintf("Payment provider did not complete %s (%s); no money moved and the request returned to the professional", entry.ProviderReference, providerReference)); err != nil {
			return nil, err
		}
		if err = tx.Commit(); err != nil {
			return nil, err
		}
		return s.LedgerEntryByReference(reference)
	}

	var balance int64
	err = tx.QueryRow(`SELECT balance_cents FROM project_funds_accounts WHERE project_id=$1`, entry.ProjectID).Scan(&balance)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, fmt.Errorf("%w: project funds account", ErrNotFound)
	}
	if err != nil {
		return nil, err
	}
	after := balance
	if entry.Direction == "CREDIT" {
		after = balance + entry.AmountCents
	} else {
		if balance < entry.AmountCents {
			return nil, ErrInsufficientFunds
		}
		// A release is only posted when an explicit client authorization was
		// recorded for the payment request.
		if entry.PaymentRequestID == "" {
			return nil, ErrAuthorizationRequired
		}
		var authorizations int
		if err := tx.QueryRow(`SELECT COUNT(*) FROM payment_instructions WHERE payment_request_id=$1 AND action='AUTHORIZE'`, entry.PaymentRequestID).Scan(&authorizations); err != nil {
			return nil, err
		}
		if authorizations == 0 {
			return nil, ErrAuthorizationRequired
		}
		after = balance - entry.AmountCents
	}

	if _, err = tx.Exec(`UPDATE financial_ledger SET status='POSTED',posted_at=$1,balance_after_cents=$2 WHERE id=$3`,
		now, after, entry.ID); err != nil {
		return nil, err
	}
	if _, err = tx.Exec(`UPDATE project_funds_accounts SET balance_cents=$1,updated_at=$2 WHERE project_id=$3`,
		after, now, entry.ProjectID); err != nil {
		return nil, err
	}
	if entry.PaymentRequestID != "" {
		if _, err = tx.Exec(`UPDATE payment_requests SET status='PAID',provider_status='CONFIRMED',paid_at=$1,updated_at=$1 WHERE id=$2`,
			now, entry.PaymentRequestID); err != nil {
			return nil, err
		}
	}
	if err = recordAudit(tx, entry.ProjectID, entry.UserID, "provider_payment_confirmed",
		fmt.Sprintf("Payment provider confirmed %s (%s); %s balance %d %s. Only provider confirmation completes the payment.",
			entry.ProviderReference, providerReference, entry.Direction, after, entry.Currency)); err != nil {
		return nil, err
	}
	if err = tx.Commit(); err != nil {
		return nil, err
	}
	return s.LedgerEntryByReference(reference)
}

// LedgerEntryByReference returns a ledger entry by its provider reference.
func (s *FinanceService) LedgerEntryByReference(reference string) (*model.LedgerEntry, error) {
	entry, err := scanLedgerEntry(s.db.QueryRow(`SELECT `+ledgerColumns+` FROM financial_ledger WHERE provider_reference=$1`, reference))
	if errors.Is(err, sql.ErrNoRows) {
		return nil, fmt.Errorf("%w: ledger entry", ErrNotFound)
	}
	if err != nil {
		return nil, err
	}
	return entry, nil
}

// Ledger lists the project ledger, newest first.
func (s *FinanceService) Ledger(projectID string) ([]model.LedgerEntry, error) {
	rows, err := s.db.Query(`SELECT `+ledgerColumns+` FROM financial_ledger WHERE project_id=$1 ORDER BY created_at DESC, id DESC`, projectID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	entries := []model.LedgerEntry{}
	for rows.Next() {
		entry, err := scanLedgerEntry(rows)
		if err != nil {
			return nil, err
		}
		entries = append(entries, *entry)
	}
	return entries, rows.Err()
}

// AvailableCents is the provider-confirmed balance less releases already
// authorized and awaiting provider confirmation. Allocations are planning
// earmarks and do not make confirmed money unspendable.
func (s *FinanceService) AvailableCents(projectID string) (int64, error) {
	account, err := s.FundsAccount(projectID)
	if err != nil {
		return 0, err
	}
	var pending int64
	if err := s.db.QueryRow(`SELECT COALESCE(SUM(amount_cents),0) FROM financial_ledger
		WHERE project_id=$1 AND entry_type='RELEASE' AND status='PENDING_CONFIRMATION'`, projectID).Scan(&pending); err != nil {
		return 0, err
	}
	return account.BalanceCents - pending, nil
}

// AllocateFunds records the client's planning earmark for a construction stage
// and, optionally, a specific engagement. It never moves money. The sum of
// active earmarks may not exceed the provider-confirmed balance.
func (s *FinanceService) AllocateFunds(projectID, clientID, engagementID string, amountCents int64, stage model.ProjectStage, note string) (*model.FundsAllocation, error) {
	projectID = strings.TrimSpace(projectID)
	clientID = strings.TrimSpace(clientID)
	engagementID = strings.TrimSpace(engagementID)
	if amountCents <= 0 {
		return nil, fmt.Errorf("%w: the allocation must be positive", ErrValidation)
	}
	if !model.ValidProjectStage(stage) {
		return nil, fmt.Errorf("%w: choose a valid construction stage", ErrValidation)
	}

	tx, err := s.db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	var accountClient, currency, accountStage string
	var balance int64
	if err := tx.QueryRow(`SELECT client_id,COALESCE(NULLIF(currency,''),'KES'),COALESCE(NULLIF(construction_stage,''),'DESIGN'),balance_cents
		FROM project_funds_accounts WHERE project_id=$1`, projectID).Scan(&accountClient, &currency, &accountStage, &balance); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, fmt.Errorf("%w: project funds account", ErrNotFound)
		}
		return nil, err
	}
	if accountClient != clientID {
		return nil, ErrUnauthorized
	}
	if engagementID != "" {
		engagement, err := s.lockEngagement(tx, engagementID)
		if err != nil {
			return nil, err
		}
		if engagement.ProjectID != projectID || engagement.ClientID != clientID {
			return nil, ErrUnauthorized
		}
		if engagement.Status != "APPROVED" && engagement.Status != "PENDING" {
			return nil, fmt.Errorf("%w: funds can only be earmarked for an active engagement", ErrConflict)
		}
		if engagement.ConstructionStage != "" && model.ProjectStage(engagement.ConstructionStage) != stage {
			return nil, fmt.Errorf("%w: the stage does not match the engagement", ErrValidation)
		}
	}
	var active int64
	if err := tx.QueryRow(`SELECT COALESCE(SUM(amount_cents),0) FROM funds_allocations WHERE project_id=$1 AND status='ACTIVE'`, projectID).Scan(&active); err != nil {
		return nil, err
	}
	if active+amountCents > balance {
		return nil, fmt.Errorf("%w: %d %s already earmarked of a %d %s confirmed balance",
			ErrInsufficientFunds, active, currency, balance, currency)
	}

	id := model.NewID()
	now := model.Now()
	if _, err = tx.Exec(`INSERT INTO funds_allocations(id,project_id,engagement_id,construction_stage,amount_cents,currency,status,note,created_by,created_at,updated_at)
		VALUES($1,$2,$3,$4,$5,$6,'ACTIVE',$7,$8,$9,$9)`,
		id, projectID, engagementID, stage, amountCents, currency, strings.TrimSpace(note), clientID, now); err != nil {
		return nil, err
	}
	if _, err = tx.Exec(`UPDATE project_funds_accounts SET allocated_cents=allocated_cents+$1,updated_at=$2 WHERE project_id=$3`,
		amountCents, now, projectID); err != nil {
		return nil, err
	}
	if err = recordAudit(tx, projectID, clientID, "funds_allocated",
		fmt.Sprintf("%d %s earmarked for stage %s%s", amountCents, currency, stage, engagementNote(engagementID))); err != nil {
		return nil, err
	}
	if err = tx.Commit(); err != nil {
		return nil, err
	}
	return s.GetAllocation(id)
}

// CancelAllocation removes an earmark. It does not move money.
func (s *FinanceService) CancelAllocation(projectID, allocationID, clientID string) (*model.FundsAllocation, error) {
	tx, err := s.db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()
	var accountClient string
	if err := tx.QueryRow(`SELECT client_id FROM project_funds_accounts WHERE project_id=$1`, projectID).Scan(&accountClient); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, fmt.Errorf("%w: project funds account", ErrNotFound)
		}
		return nil, err
	}
	if accountClient != clientID {
		return nil, ErrUnauthorized
	}
	var amount int64
	var status string
	if err := tx.QueryRow(`SELECT amount_cents,status FROM funds_allocations WHERE id=$1 AND project_id=$2`, allocationID, projectID).Scan(&amount, &status); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, fmt.Errorf("%w: allocation", ErrNotFound)
		}
		return nil, err
	}
	if status != "ACTIVE" {
		return nil, fmt.Errorf("%w: the allocation is already %s", ErrConflict, strings.ToLower(status))
	}
	now := model.Now()
	if _, err = tx.Exec(`UPDATE funds_allocations SET status='CANCELLED',updated_at=$1 WHERE id=$2`, now, allocationID); err != nil {
		return nil, err
	}
	if _, err = tx.Exec(`UPDATE project_funds_accounts SET allocated_cents=CASE WHEN allocated_cents>=$1 THEN allocated_cents-$1 ELSE 0 END,updated_at=$2 WHERE project_id=$3`,
		amount, now, projectID); err != nil {
		return nil, err
	}
	if err = recordAudit(tx, projectID, clientID, "funds_allocation_cancelled",
		fmt.Sprintf("Client cancelled a %d allocation (%s)", amount, allocationID)); err != nil {
		return nil, err
	}
	if err = tx.Commit(); err != nil {
		return nil, err
	}
	return s.GetAllocation(allocationID)
}

// Allocations lists the project earmarks.
func (s *FinanceService) Allocations(projectID string) ([]model.FundsAllocation, error) {
	rows, err := s.db.Query(`SELECT `+allocationColumns+` FROM funds_allocations WHERE project_id=$1 ORDER BY created_at DESC`, projectID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []model.FundsAllocation{}
	for rows.Next() {
		allocation, err := scanAllocation(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, *allocation)
	}
	return items, rows.Err()
}

func (s *FinanceService) GetAllocation(id string) (*model.FundsAllocation, error) {
	allocation, err := scanAllocation(s.db.QueryRow(`SELECT `+allocationColumns+` FROM funds_allocations WHERE id=$1`, id))
	if errors.Is(err, sql.ErrNoRows) {
		return nil, fmt.Errorf("%w: allocation", ErrNotFound)
	}
	if err != nil {
		return nil, err
	}
	return allocation, nil
}

// ProfessionalFinancials returns only the financial records belonging to one
// engaged professional on a project.
func (s *FinanceService) ProfessionalFinancials(projectID, professionalID string) (*model.ProfessionalFinancials, error) {
	engagementService := NewEngagementService(s.db)
	engagements, err := engagementService.List(projectID)
	if err != nil {
		return nil, err
	}
	result := &model.ProfessionalFinancials{
		Engagements:     []model.Engagement{},
		PaymentRequests: []model.PaymentRequest{},
		Releases:        []model.LedgerEntry{},
	}
	engagementIDs := map[string]bool{}
	for _, engagement := range engagements {
		if engagement.ProfessionalID != professionalID {
			continue
		}
		engagementIDs[engagement.ID] = true
		result.Engagements = append(result.Engagements, engagement)
		agreed, err := agreedTotalTx(s.db, engagement.ID)
		if err != nil {
			return nil, err
		}
		result.AgreedTotalCents += agreed
	}
	requests, err := s.PaymentRequests(projectID)
	if err != nil {
		return nil, err
	}
	for _, request := range requests {
		if request.ProfessionalID != professionalID {
			continue
		}
		result.PaymentRequests = append(result.PaymentRequests, request)
		switch request.Status {
		case "PAID":
			result.PaidTotalCents += request.AmountCents
		case "AUTHORIZED":
			result.PendingCents += request.AmountCents
		}
	}
	entries, err := s.Ledger(projectID)
	if err != nil {
		return nil, err
	}
	for _, entry := range entries {
		if entry.EntryType == "RELEASE" && entry.UserID == professionalID {
			result.Releases = append(result.Releases, entry)
		}
	}
	for _, entry := range entries {
		if entry.EntryType != "RELEASE" || entry.Status != "POSTED" || !engagementIDs[entry.EngagementID] {
			continue
		}
		found := false
		for _, existing := range result.Releases {
			if existing.ID == entry.ID {
				found = true
				break
			}
		}
		if !found {
			result.Releases = append(result.Releases, entry)
		}
	}
	return result, nil
}

func engagementNote(engagementID string) string {
	if engagementID == "" {
		return ""
	}
	return " for engagement " + engagementID
}

func (s *FinanceService) lockPaymentRequest(tx *sql.Tx, id string) (*model.PaymentRequest, error) {
	// The no-op update takes the row lock in PostgreSQL and keeps SQLite's
	// single writer serialised, so two decisions cannot race.
	if _, err := tx.Exec(`UPDATE payment_requests SET updated_at=updated_at WHERE id=$1`, id); err != nil {
		return nil, err
	}
	request, err := scanPaymentRequest(tx.QueryRow(`SELECT `+paymentRequestColumns+` FROM payment_requests WHERE id=$1`, id))
	if errors.Is(err, sql.ErrNoRows) {
		return nil, fmt.Errorf("%w: payment request", ErrNotFound)
	}
	return request, err
}

func (s *FinanceService) lockEngagement(tx *sql.Tx, id string) (*model.Engagement, error) {
	if _, err := tx.Exec(`UPDATE engagements SET updated_at=updated_at WHERE id=$1`, id); err != nil {
		return nil, err
	}
	engagement, err := scanEngagement(tx.QueryRow(`SELECT `+engagementColumns+` FROM engagements WHERE id=$1`, id))
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrEngagementRequired
	}
	return engagement, err
}

func (s *FinanceService) lockLedgerEntry(tx *sql.Tx, reference string) (*model.LedgerEntry, error) {
	if _, err := tx.Exec(`UPDATE financial_ledger SET status=status WHERE provider_reference=$1`, reference); err != nil {
		return nil, err
	}
	entry, err := scanLedgerEntry(tx.QueryRow(`SELECT `+ledgerColumns+` FROM financial_ledger WHERE provider_reference=$1`, reference))
	if errors.Is(err, sql.ErrNoRows) {
		return nil, fmt.Errorf("%w: ledger entry", ErrNotFound)
	}
	return entry, err
}

func lockFunds(tx *sql.Tx, projectID string) (balance int64, pending int64, err error) {
	if _, err = tx.Exec(`UPDATE project_funds_accounts SET updated_at=updated_at WHERE project_id=$1`, projectID); err != nil {
		return 0, 0, err
	}
	if err = tx.QueryRow(`SELECT balance_cents FROM project_funds_accounts WHERE project_id=$1`, projectID).Scan(&balance); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return 0, 0, fmt.Errorf("%w: project funds account", ErrNotFound)
		}
		return 0, 0, err
	}
	if err = tx.QueryRow(`SELECT COALESCE(SUM(amount_cents),0) FROM financial_ledger
		WHERE project_id=$1 AND entry_type='RELEASE' AND status='PENDING_CONFIRMATION'`, projectID).Scan(&pending); err != nil {
		return 0, 0, err
	}
	return balance, pending, nil
}

func agreedTotalTx(q queryer, engagementID string) (int64, error) {
	var total int64
	if err := q.QueryRow(`SELECT fee_cents FROM engagements WHERE id=$1`, engagementID).Scan(&total); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return 0, ErrEngagementRequired
		}
		return 0, err
	}
	var approved int64
	if err := q.QueryRow(`SELECT COALESCE(SUM(fee_cents),0) FROM engagement_variations WHERE engagement_id=$1 AND status='APPROVED'`, engagementID).Scan(&approved); err != nil {
		return 0, err
	}
	return total + approved, nil
}

func committedCentsTx(q queryer, engagementID string) (int64, error) {
	// REVISIONS_REQUESTED is included because the professional still intends
	// to claim that amount; a resubmission replaces it rather than adding to
	// the cap.
	var committed int64
	err := q.QueryRow(`SELECT COALESCE(SUM(amount_cents),0) FROM payment_requests
		WHERE engagement_id=$1 AND status IN ('SUBMITTED','AUTHORIZED','PAID','REVISIONS_REQUESTED')`, engagementID).Scan(&committed)
	return committed, err
}

type queryer interface {
	QueryRow(query string, args ...any) *sql.Row
}

const paymentRequestColumns = `id,project_id,engagement_id,professional_id,client_id,description,amount_cents,currency,
	deliverable_ids,status,requested_by,requested_at,COALESCE(decided_by,''),COALESCE(decided_at,''),decision_note,
	provider_reference,provider_status,COALESCE(paid_at,''),created_at,updated_at`

const ledgerColumns = `id,project_id,engagement_id,payment_request_id,user_id,entry_type,direction,amount_cents,currency,
	description,balance_after_cents,provider_reference,status,created_at,COALESCE(posted_at,'')`

const allocationColumns = `id,project_id,engagement_id,construction_stage,amount_cents,currency,status,note,created_by,created_at,updated_at`

func scanPaymentRequest(row rowScanner) (*model.PaymentRequest, error) {
	var p model.PaymentRequest
	if err := row.Scan(&p.ID, &p.ProjectID, &p.EngagementID, &p.ProfessionalID, &p.ClientID, &p.Description,
		&p.AmountCents, &p.Currency, &p.DeliverableIDs, &p.Status, &p.RequestedBy, &p.RequestedAt,
		&p.DecidedBy, &p.DecidedAt, &p.DecisionNote, &p.ProviderReference, &p.ProviderStatus, &p.PaidAt,
		&p.CreatedAt, &p.UpdatedAt); err != nil {
		return nil, err
	}
	return &p, nil
}

func scanAllocation(row rowScanner) (*model.FundsAllocation, error) {
	var a model.FundsAllocation
	if err := row.Scan(&a.ID, &a.ProjectID, &a.EngagementID, &a.ConstructionStage, &a.AmountCents, &a.Currency,
		&a.Status, &a.Note, &a.CreatedBy, &a.CreatedAt, &a.UpdatedAt); err != nil {
		return nil, err
	}
	return &a, nil
}

type entryInput struct {
	ProjectID      string
	EngagementID   string
	PaymentRequest string
	UserID         string
	EntryType      string
	Direction      string
	AmountCents    int64
	Currency       string
	Description    string
	ProviderRef    string
}

func (s *FinanceService) recordPendingEntry(in entryInput) (*model.LedgerEntry, error) {
	id := model.NewID()
	now := model.Now()
	tx, err := s.db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()
	if _, err = tx.Exec(`INSERT INTO financial_ledger(id,project_id,engagement_id,payment_request_id,user_id,entry_type,direction,
		amount_cents,currency,description,balance_after_cents,provider_reference,status,created_at)
		VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,0,$11,'PENDING_CONFIRMATION',$12)`,
		id, in.ProjectID, in.EngagementID, in.PaymentRequest, in.UserID, in.EntryType, in.Direction,
		in.AmountCents, in.Currency, in.Description, in.ProviderRef, now); err != nil {
		return nil, err
	}
	if err = recordAudit(tx, in.ProjectID, in.UserID, "ledger_entry_created",
		fmt.Sprintf("%s %s %d %s recorded with provider reference %s, awaiting provider confirmation",
			in.EntryType, in.Direction, in.AmountCents, in.Currency, in.ProviderRef)); err != nil {
		return nil, err
	}
	if err = tx.Commit(); err != nil {
		return nil, err
	}
	return s.LedgerEntryByReference(in.ProviderRef)
}

func scanLedgerEntry(row rowScanner) (*model.LedgerEntry, error) {
	var e model.LedgerEntry
	if err := row.Scan(&e.ID, &e.ProjectID, &e.EngagementID, &e.PaymentRequestID, &e.UserID, &e.EntryType,
		&e.Direction, &e.AmountCents, &e.Currency, &e.Description, &e.BalanceAfterCents,
		&e.ProviderReference, &e.Status, &e.CreatedAt, &e.PostedAt); err != nil {
		return nil, err
	}
	return &e, nil
}
