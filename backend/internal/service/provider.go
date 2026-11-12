package service

import (
	"database/sql"
	"errors"
	"fmt"
	"strings"

	"github.com/ubuild/backend/internal/model"
)

// ProviderDisclosure is stored with every configured provider and shown in the
// interface. It records the platform's position plainly: UBuild coordinates
// instructions, and the bank or payment service provider holds the money.
const ProviderDisclosure = "UBuild coordinates payment instructions between the client and the selected " +
	"bank or payment service provider. UBuild does not hold, safeguard or guarantee project funds, does not " +
	"act as an escrow agent, and does not lend. The provider holds the account and executes the transfer; " +
	"a payment is only complete once that provider confirms it. The provider capabilities offered here are " +
	"limited to what the selected provider supports, and the arrangement remains subject to the regulatory " +
	"review completed for that provider."

// ProviderService stores the payment arrangement chosen for a project.
//
// Two arrangements are supported:
//   - A: the client connects a bank or mobile money account they already hold;
//   - B: the client uses a dedicated project account operated by a bank or
//     payment service provider.
//
// The service deliberately contains no provider-specific API calls. The
// transaction intake in FinanceService is the single point an adapter built
// during provider selection calls once a transfer has actually been executed.
type ProviderService struct {
	db *sql.DB
}

func NewProviderService(db *sql.DB) *ProviderService {
	return &ProviderService{db: db}
}

// Configure records or updates the project's payment arrangement.
func (s *ProviderService) Configure(projectID, clientID, arrangement, name, displayAccount string) (*model.ProviderAccount, error) {
	projectID = strings.TrimSpace(projectID)
	clientID = strings.TrimSpace(clientID)
	arrangement = strings.ToUpper(strings.TrimSpace(arrangement))
	name = strings.TrimSpace(name)
	displayAccount = strings.TrimSpace(displayAccount)

	if projectID == "" || clientID == "" || name == "" {
		return nil, fmt.Errorf("%w: project, client and provider name are required", ErrValidation)
	}
	if arrangement != "A" && arrangement != "B" {
		return nil, fmt.Errorf("%w: arrangement must be A (existing account) or B (dedicated project account)", ErrValidation)
	}
	if len(displayAccount) > 64 {
		return nil, fmt.Errorf("%w: the account label is too long", ErrValidation)
	}

	now := model.Now()
	var existing string
	err := s.db.QueryRow(`SELECT id FROM payment_providers WHERE project_id=$1`, projectID).Scan(&existing)
	switch {
	case err == nil:
		if _, err = s.db.Exec(`UPDATE payment_providers SET arrangement=$1,name=$2,display_account=$3,status='CONFIGURED',
			disclosures=$4,updated_at=$5 WHERE id=$6`,
			arrangement, name, displayAccount, ProviderDisclosure, now, existing); err != nil {
			return nil, err
		}
	case errors.Is(err, sql.ErrNoRows):
		existing = model.NewID()
		if _, err = s.db.Exec(`INSERT INTO payment_providers(id,project_id,arrangement,name,display_account,status,disclosures,created_at,updated_at)
			VALUES($1,$2,$3,$4,$5,'CONFIGURED',$6,$7,$7)`,
			existing, projectID, arrangement, name, displayAccount, ProviderDisclosure, now); err != nil {
			return nil, err
		}
	default:
		return nil, err
	}

	if err := recordStandaloneAudit(s.db, projectID, clientID, "provider_configured",
		fmt.Sprintf("Payment arrangement %s configured with %s", arrangement, name)); err != nil {
		return nil, err
	}
	return s.Get(projectID)
}

// Get returns the configured arrangement for a project.
func (s *ProviderService) Get(projectID string) (*model.ProviderAccount, error) {
	var account model.ProviderAccount
	err := s.db.QueryRow(`SELECT id,project_id,arrangement,name,display_account,status,disclosures,created_at,updated_at
		FROM payment_providers WHERE project_id=$1`, projectID).
		Scan(&account.ID, &account.ProjectID, &account.Arrangement, &account.Name, &account.DisplayAccount,
			&account.Status, &account.Disclosures, &account.CreatedAt, &account.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrProviderNotConfigured
	}
	if err != nil {
		return nil, err
	}
	return &account, nil
}

func (s *FinanceService) providerFor(projectID string) (*model.ProviderAccount, error) {
	provider := NewProviderService(s.db)
	return provider.Get(projectID)
}

// providerForTx reads the configured arrangement inside an existing
// transaction, so a payment authorization cannot proceed against an
// arrangement that changed concurrently or was never configured.
func providerForTx(tx *sql.Tx, projectID string) (*model.ProviderAccount, error) {
	var account model.ProviderAccount
	err := tx.QueryRow(`SELECT id,project_id,arrangement,name,display_account,status,disclosures,created_at,updated_at
		FROM payment_providers WHERE project_id=$1`, projectID).
		Scan(&account.ID, &account.ProjectID, &account.Arrangement, &account.Name, &account.DisplayAccount,
			&account.Status, &account.Disclosures, &account.CreatedAt, &account.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrProviderNotConfigured
	}
	if err != nil {
		return nil, err
	}
	return &account, nil
}

func recordStandaloneAudit(db *sql.DB, projectID, userID, action, details string) error {
	_, err := db.Exec(`INSERT INTO audit_entries(id,project_id,user_id,action,details,created_at) VALUES($1,$2,$3,$4,$5,$6)`,
		model.NewID(), projectID, userID, action, details, model.Now())
	return err
}
