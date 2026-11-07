package handler

import (
	"database/sql"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/ubuild/backend/internal/model"
)

func (a *API) listReports(projectID string) []model.Report {
	rows, err := a.DB.Query(`SELECT r.id,r.project_id,r.title,r.body,r.kind,r.author_id,coalesce(u.name,''),r.created_at FROM reports r LEFT JOIN users u ON u.id=r.author_id WHERE r.project_id=$1 ORDER BY r.created_at DESC`, projectID)
	if err != nil {
		return []model.Report{}
	}
	defer rows.Close()
	items := []model.Report{}
	for rows.Next() {
		var item model.Report
		if rows.Scan(&item.ID, &item.ProjectID, &item.Title, &item.Body, &item.Kind, &item.AuthorID, &item.AuthorName, &item.CreatedAt) == nil {
			items = append(items, item)
		}
	}
	return items
}

func (a *API) createReport(w http.ResponseWriter, r *http.Request) {
	access, ok := a.requireProjectAccess(w, r, permSubmitReports)
	if !ok {
		return
	}
	var input struct {
		Title string `json:"title"`
		Body  string `json:"body"`
		Kind  string `json:"kind"`
	}
	if !decode(w, r, &input) {
		return
	}
	input.Title = strings.TrimSpace(input.Title)
	input.Kind = strings.TrimSpace(input.Kind)
	if input.Kind == "" {
		input.Kind = "PROGRESS"
	}
	errs := map[string]string{}
	if len([]rune(input.Title)) < 2 {
		errs["title"] = "Please enter a report title."
	}
	if len([]rune(strings.TrimSpace(input.Body))) < 2 {
		errs["body"] = "Please write the report."
	}
	if !validReportKind(input.Kind) {
		errs["kind"] = "Choose a valid report type."
	}
	if len(errs) > 0 {
		validationError(w, errs)
		return
	}
	id := newID()
	createdAt := now()
	if _, err := a.DB.Exec(`INSERT INTO reports(id,project_id,title,body,kind,author_id,created_at) VALUES($1,$2,$3,$4,$5,$6,$7)`, id, access.Project.ID, input.Title, strings.TrimSpace(input.Body), input.Kind, access.User.ID, createdAt); err != nil {
		a.serverError(w, "Unable to submit the report.")
		return
	}
	a.recordAudit(access.Project.ID, access.User.ID, "report_submitted", input.Title)
	a.created(w, map[string]any{"report": model.Report{ID: id, ProjectID: access.Project.ID, Title: input.Title, Body: strings.TrimSpace(input.Body), Kind: input.Kind, AuthorID: access.User.ID, AuthorName: access.User.Name, CreatedAt: createdAt}})
}

func (a *API) listApprovals(projectID string) []model.Approval {
	rows, err := a.DB.Query(`SELECT id,project_id,title,details,kind,status,amount_cents,requested_by,decided_by,decided_at,created_at FROM approvals WHERE project_id=$1 ORDER BY created_at DESC`, projectID)
	if err != nil {
		return []model.Approval{}
	}
	defer rows.Close()
	items := []model.Approval{}
	for rows.Next() {
		var item model.Approval
		if rows.Scan(&item.ID, &item.ProjectID, &item.Title, &item.Details, &item.Kind, &item.Status, &item.AmountCents, &item.RequestedBy, &item.DecidedBy, &item.DecidedAt, &item.CreatedAt) == nil {
			items = append(items, item)
		}
	}
	return items
}

func (a *API) createApproval(w http.ResponseWriter, r *http.Request) {
	access, ok := a.requireProjectAccess(w, r, permRequestChanges)
	if !ok {
		return
	}
	var input struct {
		Title       string `json:"title"`
		Details     string `json:"details"`
		Kind        string `json:"kind"`
		AmountCents *int64 `json:"amountCents"`
	}
	if !decode(w, r, &input) {
		return
	}
	input.Title = strings.TrimSpace(input.Title)
	input.Kind = strings.TrimSpace(input.Kind)
	if input.Kind == "" {
		input.Kind = "CHANGE"
	}
	errs := map[string]string{}
	if len([]rune(input.Title)) < 2 {
		errs["title"] = "Please enter a title."
	}
	if !validApprovalKind(input.Kind) {
		errs["kind"] = "Choose a valid approval type."
	}
	if input.AmountCents != nil && *input.AmountCents <= 0 {
		errs["amountCents"] = "Enter an amount greater than zero or leave it blank."
	}
	if len(errs) > 0 {
		validationError(w, errs)
		return
	}
	id := newID()
	createdAt := now()
	if _, err := a.DB.Exec(`INSERT INTO approvals(id,project_id,title,details,kind,status,amount_cents,requested_by,created_at) VALUES($1,$2,$3,$4,$5,'PENDING',$6,$7,$8)`, id, access.Project.ID, input.Title, strings.TrimSpace(input.Details), input.Kind, input.AmountCents, access.User.ID, createdAt); err != nil {
		a.serverError(w, "Unable to create the approval request.")
		return
	}
	a.recordAudit(access.Project.ID, access.User.ID, "approval_requested", input.Title)
	a.created(w, map[string]any{"approval": model.Approval{ID: id, ProjectID: access.Project.ID, Title: input.Title, Details: strings.TrimSpace(input.Details), Kind: input.Kind, Status: "PENDING", AmountCents: input.AmountCents, RequestedBy: access.User.ID, CreatedAt: createdAt}})
}

func (a *API) decideApproval(w http.ResponseWriter, r *http.Request) {
	access, ok := a.requireProjectAccess(w, r, permDecideApprovals)
	if !ok {
		return
	}
	var input struct {
		Status string `json:"status"`
	}
	if !decode(w, r, &input) {
		return
	}
	input.Status = strings.TrimSpace(input.Status)
	if input.Status != "APPROVED" && input.Status != "REJECTED" {
		validationError(w, map[string]string{"status": "Choose approve or reject."})
		return
	}
	decidedAt := now()
	result, err := a.DB.Exec(`UPDATE approvals SET status=$1,decided_by=$2,decided_at=$3 WHERE id=$4 AND project_id=$5 AND status='PENDING'`, input.Status, access.User.ID, decidedAt, r.PathValue("approvalId"), access.Project.ID)
	if err != nil {
		a.serverError(w, "Unable to update the approval.")
		return
	}
	affected, _ := result.RowsAffected()
	if affected == 0 {
		a.notFound(w, "Approval not found or already decided.")
		return
	}
	a.recordAudit(access.Project.ID, access.User.ID, "approval_"+strings.ToLower(input.Status), r.PathValue("approvalId"))
	writeJSON(w, http.StatusOK, map[string]string{"status": input.Status})
}

func (a *API) listQuotations(projectID, userID, role string) []model.Quotation {
	query := `SELECT q.id,q.project_id,q.supplier_id,coalesce(u.name,''),q.item,q.description,q.amount_cents,q.currency,q.status,q.created_at,q.updated_at FROM quotations q LEFT JOIN users u ON u.id=q.supplier_id WHERE q.project_id=$1`
	args := []any{projectID}
	if role == "SUPPLIER" {
		query += ` AND q.supplier_id=$2`
		args = append(args, userID)
	}
	query += ` ORDER BY q.created_at DESC`
	rows, err := a.DB.Query(query, args...)
	if err != nil {
		return []model.Quotation{}
	}
	defer rows.Close()
	items := []model.Quotation{}
	for rows.Next() {
		var item model.Quotation
		if rows.Scan(&item.ID, &item.ProjectID, &item.SupplierID, &item.SupplierName, &item.Item, &item.Description, &item.AmountCents, &item.Currency, &item.Status, &item.CreatedAt, &item.UpdatedAt) == nil {
			items = append(items, item)
		}
	}
	return items
}

func (a *API) createQuotation(w http.ResponseWriter, r *http.Request) {
	access, ok := a.requireProjectAccess(w, r, permSubmitQuotes)
	if !ok {
		return
	}
	var input struct {
		Item        string `json:"item"`
		Description string `json:"description"`
		AmountCents int64  `json:"amountCents"`
	}
	if !decode(w, r, &input) {
		return
	}
	input.Item = strings.TrimSpace(input.Item)
	errs := map[string]string{}
	if len([]rune(input.Item)) < 2 {
		errs["item"] = "Please enter the quoted item or service."
	}
	if input.AmountCents <= 0 {
		errs["amountCents"] = "Enter an amount greater than zero."
	}
	if len(errs) > 0 {
		validationError(w, errs)
		return
	}
	id := newID()
	createdAt := now()
	if _, err := a.DB.Exec(`INSERT INTO quotations(id,project_id,supplier_id,item,description,amount_cents,currency,status,created_at,updated_at) VALUES($1,$2,$3,$4,$5,$6,'KES','SUBMITTED',$7,$8)`, id, access.Project.ID, access.User.ID, input.Item, strings.TrimSpace(input.Description), input.AmountCents, createdAt, createdAt); err != nil {
		a.serverError(w, "Unable to submit the quotation.")
		return
	}
	a.recordAudit(access.Project.ID, access.User.ID, "quotation_submitted", input.Item)
	a.created(w, map[string]any{"quotation": model.Quotation{ID: id, ProjectID: access.Project.ID, SupplierID: access.User.ID, SupplierName: access.User.Name, Item: input.Item, Description: strings.TrimSpace(input.Description), AmountCents: input.AmountCents, Currency: "KES", Status: "SUBMITTED", CreatedAt: createdAt, UpdatedAt: createdAt}})
}

func (a *API) decideQuotation(w http.ResponseWriter, r *http.Request) {
	access, ok := a.requireProjectAccess(w, r, permDecideQuotes)
	if !ok {
		return
	}
	var input struct {
		Status string `json:"status"`
	}
	if !decode(w, r, &input) {
		return
	}
	input.Status = strings.TrimSpace(input.Status)
	if input.Status != "ACCEPTED" && input.Status != "REJECTED" {
		validationError(w, map[string]string{"status": "Choose accept or reject."})
		return
	}
	result, err := a.DB.Exec(`UPDATE quotations SET status=$1,updated_at=$2 WHERE id=$3 AND project_id=$4 AND status='SUBMITTED'`, input.Status, now(), r.PathValue("quotationId"), access.Project.ID)
	if err != nil {
		a.serverError(w, "Unable to update the quotation.")
		return
	}
	affected, _ := result.RowsAffected()
	if affected == 0 {
		a.notFound(w, "Quotation not found or already decided.")
		return
	}
	a.recordAudit(access.Project.ID, access.User.ID, "quotation_"+strings.ToLower(input.Status), r.PathValue("quotationId"))
	writeJSON(w, http.StatusOK, map[string]string{"status": input.Status})
}

func (a *API) listBOQ(projectID string) []model.BOQItem {
	rows, err := a.DB.Query(`SELECT id,project_id,description,quantity,unit,rate_cents,created_by,created_at,updated_at FROM boq_items WHERE project_id=$1 ORDER BY created_at DESC`, projectID)
	if err != nil {
		return []model.BOQItem{}
	}
	defer rows.Close()
	items := []model.BOQItem{}
	for rows.Next() {
		var item model.BOQItem
		if rows.Scan(&item.ID, &item.ProjectID, &item.Description, &item.Quantity, &item.Unit, &item.RateCents, &item.CreatedBy, &item.CreatedAt, &item.UpdatedAt) == nil {
			items = append(items, item)
		}
	}
	return items
}

func (a *API) createBOQItem(w http.ResponseWriter, r *http.Request) {
	access, ok := a.requireProjectAccess(w, r, permSubmitBOQ)
	if !ok {
		return
	}
	var input struct {
		Description string  `json:"description"`
		Quantity    float64 `json:"quantity"`
		Unit        string  `json:"unit"`
		RateCents   int64   `json:"rateCents"`
	}
	if !decode(w, r, &input) {
		return
	}
	input.Description = strings.TrimSpace(input.Description)
	input.Unit = strings.TrimSpace(input.Unit)
	errs := map[string]string{}
	if len([]rune(input.Description)) < 2 {
		errs["description"] = "Please describe the BOQ item."
	}
	if input.Quantity <= 0 {
		errs["quantity"] = "Enter a quantity greater than zero."
	}
	if input.Unit == "" {
		errs["unit"] = "Please enter a unit."
	}
	if input.RateCents < 0 {
		errs["rateCents"] = "Enter a valid rate."
	}
	if len(errs) > 0 {
		validationError(w, errs)
		return
	}
	id := newID()
	createdAt := now()
	if _, err := a.DB.Exec(`INSERT INTO boq_items(id,project_id,description,quantity,unit,rate_cents,created_by,created_at,updated_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`, id, access.Project.ID, input.Description, input.Quantity, input.Unit, input.RateCents, access.User.ID, createdAt, createdAt); err != nil {
		a.serverError(w, "Unable to add the BOQ item.")
		return
	}
	a.recordAudit(access.Project.ID, access.User.ID, "boq_item_created", input.Description)
	a.created(w, map[string]any{"item": model.BOQItem{ID: id, ProjectID: access.Project.ID, Description: input.Description, Quantity: input.Quantity, Unit: input.Unit, RateCents: input.RateCents, CreatedBy: access.User.ID, CreatedAt: createdAt, UpdatedAt: createdAt}})
}

func (a *API) listIssues(projectID string) []model.Issue {
	rows, err := a.DB.Query(`SELECT id,project_id,title,details,severity,status,raised_by,created_at,updated_at FROM issues WHERE project_id=$1 ORDER BY created_at DESC`, projectID)
	if err != nil {
		return []model.Issue{}
	}
	defer rows.Close()
	items := []model.Issue{}
	for rows.Next() {
		var item model.Issue
		if rows.Scan(&item.ID, &item.ProjectID, &item.Title, &item.Details, &item.Severity, &item.Status, &item.RaisedBy, &item.CreatedAt, &item.UpdatedAt) == nil {
			items = append(items, item)
		}
	}
	return items
}

func (a *API) createIssue(w http.ResponseWriter, r *http.Request) {
	access, ok := a.requireProjectAccess(w, r, permManageIssues)
	if !ok {
		return
	}
	var input struct {
		Title    string `json:"title"`
		Details  string `json:"details"`
		Severity string `json:"severity"`
	}
	if !decode(w, r, &input) {
		return
	}
	input.Title = strings.TrimSpace(input.Title)
	input.Severity = strings.TrimSpace(input.Severity)
	if input.Severity == "" {
		input.Severity = "MEDIUM"
	}
	errs := map[string]string{}
	if len([]rune(input.Title)) < 2 {
		errs["title"] = "Please enter an issue title."
	}
	if !validIssueSeverity(input.Severity) {
		errs["severity"] = "Choose a valid severity."
	}
	if len(errs) > 0 {
		validationError(w, errs)
		return
	}
	id := newID()
	createdAt := now()
	if _, err := a.DB.Exec(`INSERT INTO issues(id,project_id,title,details,severity,status,raised_by,created_at,updated_at) VALUES($1,$2,$3,$4,$5,'OPEN',$6,$7,$8)`, id, access.Project.ID, input.Title, strings.TrimSpace(input.Details), input.Severity, access.User.ID, createdAt, createdAt); err != nil {
		a.serverError(w, "Unable to raise the issue.")
		return
	}
	a.recordAudit(access.Project.ID, access.User.ID, "issue_raised", input.Title)
	a.created(w, map[string]any{"issue": model.Issue{ID: id, ProjectID: access.Project.ID, Title: input.Title, Details: strings.TrimSpace(input.Details), Severity: input.Severity, Status: "OPEN", RaisedBy: access.User.ID, CreatedAt: createdAt, UpdatedAt: createdAt}})
}

func (a *API) updateIssue(w http.ResponseWriter, r *http.Request) {
	access, ok := a.requireProjectAccess(w, r, permManageIssues)
	if !ok {
		return
	}
	var input struct {
		Status   *string `json:"status"`
		Severity *string `json:"severity"`
	}
	if !decode(w, r, &input) {
		return
	}
	var current model.Issue
	err := a.DB.QueryRow(`SELECT id,project_id,title,details,severity,status,raised_by,created_at,updated_at FROM issues WHERE id=$1 AND project_id=$2`, r.PathValue("issueId"), access.Project.ID).Scan(&current.ID, &current.ProjectID, &current.Title, &current.Details, &current.Severity, &current.Status, &current.RaisedBy, &current.CreatedAt, &current.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		a.notFound(w, "Issue not found.")
		return
	} else if err != nil {
		a.serverError(w, "Unable to update the issue.")
		return
	}
	errs := map[string]string{}
	if input.Status != nil {
		value := strings.TrimSpace(*input.Status)
		if !validIssueStatus(value) {
			errs["status"] = "Choose a valid issue status."
		}
		current.Status = value
	}
	if input.Severity != nil {
		value := strings.TrimSpace(*input.Severity)
		if !validIssueSeverity(value) {
			errs["severity"] = "Choose a valid severity."
		}
		current.Severity = value
	}
	if len(errs) > 0 {
		validationError(w, errs)
		return
	}
	current.UpdatedAt = now()
	if _, err := a.DB.Exec(`UPDATE issues SET status=$1,severity=$2,updated_at=$3 WHERE id=$4 AND project_id=$5`, current.Status, current.Severity, current.UpdatedAt, current.ID, access.Project.ID); err != nil {
		a.serverError(w, "Unable to update the issue.")
		return
	}
	a.recordAudit(access.Project.ID, access.User.ID, "issue_updated", current.Title)
	writeJSON(w, http.StatusOK, map[string]any{"issue": current})
}

func (a *API) listInvitations(w http.ResponseWriter, r *http.Request) {
	access, ok := a.requireProjectAccess(w, r, permManageMembers)
	if !ok {
		return
	}
	rows, err := a.DB.Query(`SELECT id,project_id,invited_by_user_id,email,role,token,status,created_at,expires_at,accepted_at FROM invitations WHERE project_id=$1 ORDER BY created_at DESC`, access.Project.ID)
	if err != nil {
		a.serverError(w, "Unable to load invitations.")
		return
	}
	defer rows.Close()
	type invitationView struct {
		ID        string `json:"id"`
		Email     string `json:"email"`
		Role      string `json:"role"`
		Status    string `json:"status"`
		CreatedAt string `json:"createdAt"`
		ExpiresAt string `json:"expiresAt"`
	}
	items := []invitationView{}
	for rows.Next() {
		var id, projectID, invitedBy, email, role, token, status, createdAt, expiresAt string
		var acceptedAt sql.NullString
		if rows.Scan(&id, &projectID, &invitedBy, &email, &role, &token, &status, &createdAt, &expiresAt, &acceptedAt) == nil {
			items = append(items, invitationView{ID: id, Email: email, Role: role, Status: status, CreatedAt: createdAt, ExpiresAt: expiresAt})
		}
	}
	writeJSON(w, http.StatusOK, map[string]any{"invitations": items})
}

func (a *API) createInvitation(w http.ResponseWriter, r *http.Request) {
	access, ok := a.requireProjectAccess(w, r, permManageMembers)
	if !ok {
		return
	}
	var input struct {
		Email string `json:"email"`
		Role  string `json:"role"`
	}
	if !decode(w, r, &input) {
		return
	}
	input.Email = strings.ToLower(strings.TrimSpace(input.Email))
	input.Role = strings.TrimSpace(input.Role)
	errs := map[string]string{}
	if !validEmail(input.Email) {
		errs["email"] = "Please enter a valid email address."
	}
	if !validRole(input.Role) {
		errs["role"] = "Choose a role from the list."
	}
	if input.Role == "OWNER" {
		errs["role"] = "You cannot invite someone as the project owner."
	}
	if len(errs) > 0 {
		validationError(w, errs)
		return
	}
	var existingID string
	err := a.DB.QueryRow(`SELECT m.id FROM memberships m JOIN users u ON u.id=m.user_id WHERE m.project_id=$1 AND lower(u.email)=$2 AND m.status='ACTIVE'`, access.Project.ID, input.Email).Scan(&existingID)
	if err == nil {
		validationError(w, map[string]string{"email": "That person is already a member of this project."})
		return
	} else if !errors.Is(err, sql.ErrNoRows) {
		a.serverError(w, "Unable to create the invitation.")
		return
	}
	token := randomToken()
	id := newID()
	createdAt := now()
	expiresAt := time.Now().UTC().Add(7 * 24 * time.Hour).Format(time.RFC3339Nano)
	if _, err := a.DB.Exec(`INSERT INTO invitations(id,project_id,invited_by_user_id,email,role,token,status,created_at,expires_at) VALUES($1,$2,$3,$4,$5,$6,'PENDING',$7,$8)`, id, access.Project.ID, access.User.ID, input.Email, input.Role, token, createdAt, expiresAt); err != nil {
		a.serverError(w, "Unable to create the invitation.")
		return
	}
	a.recordAudit(access.Project.ID, access.User.ID, "invitation_created", "Invited "+input.Email+" as "+input.Role)
	a.created(w, map[string]any{"token": token, "invitation": map[string]string{"id": id, "email": input.Email, "role": input.Role, "status": "PENDING", "expiresAt": expiresAt}, "message": "Invitation created. Share the link with the recipient."})
}

func (a *API) revokeInvitation(w http.ResponseWriter, r *http.Request) {
	access, ok := a.requireProjectAccess(w, r, permManageMembers)
	if !ok {
		return
	}
	token := r.PathValue("token")
	result, err := a.DB.Exec(`UPDATE invitations SET status='REVOKED' WHERE token=$1 AND project_id=$2 AND status='PENDING'`, token, access.Project.ID)
	if err != nil {
		a.serverError(w, "Unable to revoke the invitation.")
		return
	}
	affected, _ := result.RowsAffected()
	if affected == 0 {
		a.notFound(w, "That invitation could not be revoked.")
		return
	}
	a.recordAudit(access.Project.ID, access.User.ID, "invitation_revoked", "Revoked invitation")
	writeJSON(w, http.StatusOK, map[string]string{"message": "Invitation revoked."})
}

func (a *API) acceptInvitation(w http.ResponseWriter, r *http.Request) {
	u, err := a.currentUser(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "Sign in to accept an invitation.")
		return
	}
	var input struct {
		Token string `json:"token"`
	}
	if !decode(w, r, &input) {
		return
	}
	input.Token = strings.TrimSpace(input.Token)
	if input.Token == "" {
		validationError(w, map[string]string{"token": "An invitation token is required."})
		return
	}
	var invitationID, projectID, email, role, status, expiresAt string
	err = a.DB.QueryRow(`SELECT id,project_id,email,role,status,expires_at FROM invitations WHERE token=$1`, input.Token).Scan(&invitationID, &projectID, &email, &role, &status, &expiresAt)
	if errors.Is(err, sql.ErrNoRows) {
		a.notFound(w, "This invitation is invalid, expired, or has already been used.")
		return
	} else if err != nil {
		a.serverError(w, "Unable to accept the invitation.")
		return
	}
	if !strings.EqualFold(email, u.Email) || status != "PENDING" {
		a.notFound(w, "This invitation is invalid, expired, or has already been used.")
		return
	}
	expiry, parseErr := time.Parse(time.RFC3339Nano, expiresAt)
	if parseErr != nil || time.Now().After(expiry) {
		_, _ = a.DB.Exec(`UPDATE invitations SET status='EXPIRED' WHERE id=$1`, invitationID)
		a.notFound(w, "This invitation is invalid, expired, or has already been used.")
		return
	}
	var project model.Project
	if err := a.DB.QueryRow(`SELECT id,owner_id,name,location,type,description,created_at,updated_at FROM projects WHERE id=$1`, projectID).Scan(&project.ID, &project.OwnerID, &project.Name, &project.Location, &project.Type, &project.Description, &project.CreatedAt, &project.UpdatedAt); err != nil {
		a.serverError(w, "Unable to accept the invitation.")
		return
	}
	nowValue := now()
	tx, err := a.DB.Begin()
	if err != nil {
		a.serverError(w, "Unable to accept the invitation.")
		return
	}
	defer tx.Rollback()
	var membershipID, membershipStatus string
	err = tx.QueryRow(`SELECT id,status FROM memberships WHERE user_id=$1 AND project_id=$2`, u.ID, projectID).Scan(&membershipID, &membershipStatus)
	if errors.Is(err, sql.ErrNoRows) {
		membershipID = newID()
		if _, err = tx.Exec(`INSERT INTO memberships(id,user_id,project_id,role,status,joined_at,updated_at) VALUES($1,$2,$3,$4,'ACTIVE',$5,$6)`, membershipID, u.ID, projectID, role, nowValue, nowValue); err != nil {
			a.serverError(w, "Unable to accept the invitation.")
			return
		}
	} else if err != nil {
		a.serverError(w, "Unable to accept the invitation.")
		return
	} else {
		if _, err = tx.Exec(`UPDATE memberships SET role=$1,status='ACTIVE',updated_at=$2 WHERE id=$3`, role, nowValue, membershipID); err != nil {
			a.serverError(w, "Unable to accept the invitation.")
			return
		}
	}
	if _, err = tx.Exec(`UPDATE invitations SET status='ACCEPTED',accepted_at=$1 WHERE id=$2`, nowValue, invitationID); err != nil {
		a.serverError(w, "Unable to accept the invitation.")
		return
	}
	if _, err = tx.Exec(`INSERT INTO audit_entries(id,project_id,user_id,action,details,created_at) VALUES($1,$2,$3,'membership_created',$4,$5)`, newID(), projectID, u.ID, "Joined project via invitation as "+role, nowValue); err != nil {
		// Audit failure must not block membership acceptance.
		_ = err
	}
	if err = tx.Commit(); err != nil {
		a.serverError(w, "Unable to accept the invitation.")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"project": project, "membership": model.Membership{ID: membershipID, UserID: u.ID, ProjectID: projectID, Role: role, Status: "ACTIVE", JoinedAt: nowValue, UpdatedAt: nowValue}, "message": "You have joined the project."})
}
