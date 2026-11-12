package handler

import (
	"database/sql"
	"errors"
	"net/http"
	"time"

	"github.com/ubuild/backend/internal/model"
)

// budgetView aggregates budget items and expenses for the frontend.
type budgetView struct {
	Items                []model.BudgetItem `json:"items"`
	Expenses             []model.Expense    `json:"expenses"`
	TotalBudgetCents     int64              `json:"totalBudgetCents"`
	ApprovedExpenseCents int64              `json:"approvedExpenseCents"`
	PendingExpenseCents  int64              `json:"pendingExpenseCents"`
	CommittedCents       int64              `json:"committedCents"`
	RemainingCents       int64              `json:"remainingCents"`
}

func (a *API) buildBudgetView(projectID string, role string) (*budgetView, bool) {
	if !can(role, permViewBudget) {
		return nil, false
	}
	items := a.listBudget(projectID)
	expenses := a.listExpenses(projectID)

	if items == nil {
		items = []model.BudgetItem{}
	}
	if expenses == nil {
		expenses = []model.Expense{}
	}

	totalBudget := int64(0)
	for _, item := range items {
		totalBudget += item.AmountCents
	}

	approved := int64(0)
	pending := int64(0)
	for _, e := range expenses {
		switch e.Status {
		case "APPROVED":
			approved += e.AmountCents
		case "PENDING":
			pending += e.AmountCents
		}
	}

	return &budgetView{
		Items:                items,
		Expenses:             expenses,
		TotalBudgetCents:     totalBudget,
		ApprovedExpenseCents: approved,
		PendingExpenseCents:  pending,
		CommittedCents:       approved + pending,
		RemainingCents:       totalBudget - (approved + pending),
	}, true
}

type projectAccess struct {
	User       model.User
	Project    model.Project
	Membership model.Membership
}

// requireProjectAccess authenticates the request and confirms that the user has
// an active membership in the project. An empty permission only requires
// membership; otherwise the role permission is checked as well.
func (a *API) requireProjectAccess(w http.ResponseWriter, r *http.Request, permission string) (*projectAccess, bool) {
	u, err := a.currentUser(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "Authentication required.")
		return nil, false
	}
	projectID := r.PathValue("projectId")
	var access projectAccess
	access.User = u
	err = a.DB.QueryRow(`SELECT p.id,p.owner_id,p.name,p.location,p.type,p.description,p.scope,p.budget_cents,p.currency,p.construction_stage,p.created_at,p.updated_at,m.id,m.user_id,m.project_id,m.role,m.status,m.joined_at,m.updated_at FROM projects p JOIN memberships m ON m.project_id=p.id WHERE p.id=$1 AND m.user_id=$2 AND m.status='ACTIVE'`, projectID, u.ID).Scan(
		&access.Project.ID, &access.Project.OwnerID, &access.Project.Name, &access.Project.Location, &access.Project.Type, &access.Project.Description, &access.Project.Scope, &access.Project.BudgetCents, &access.Project.Currency, &access.Project.ConstructionStage, &access.Project.CreatedAt, &access.Project.UpdatedAt,
		&access.Membership.ID, &access.Membership.UserID, &access.Membership.ProjectID, &access.Membership.Role, &access.Membership.Status, &access.Membership.JoinedAt, &access.Membership.UpdatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		writeError(w, http.StatusNotFound, "Project not found.")
		return nil, false
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Unable to load project.")
		return nil, false
	}
	if permission != "" && !can(access.Membership.Role, permission) {
		writeError(w, http.StatusForbidden, "You do not have permission to do that in this project.")
		return nil, false
	}
	return &access, true
}

func (a *API) recordAudit(projectID, userID, action, details string) {
	_, _ = a.DB.Exec(`INSERT INTO audit_entries(id,project_id,user_id,action,details,created_at) VALUES($1,$2,$3,$4,$5,$6)`, newID(), projectID, userID, action, details, now())
}

func now() string { return time.Now().UTC().Format(time.RFC3339Nano) }

func countQuery(db *sql.DB, query string, args ...any) int {
	var value int
	if err := db.QueryRow(query, args...).Scan(&value); err != nil {
		return 0
	}
	return value
}

func (a *API) dashboard(w http.ResponseWriter, r *http.Request) {
	u, err := a.currentUser(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "Authentication required.")
		return
	}
	rows, err := a.DB.Query(`SELECT p.id,p.owner_id,p.name,p.location,p.type,p.description,p.scope,p.budget_cents,p.currency,p.construction_stage,p.created_at,p.updated_at,m.id,m.user_id,m.project_id,m.role,m.status,m.joined_at,m.updated_at FROM projects p JOIN memberships m ON m.project_id=p.id WHERE m.user_id=$1 AND m.status='ACTIVE' ORDER BY p.updated_at DESC`, u.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Unable to load your dashboard.")
		return
	}
	type projectSummary struct {
		OpenTasks           int `json:"openTasks"`
		CompletedTasks      int `json:"completedTasks"`
		TotalTasks          int `json:"totalTasks"`
		OpenIssues          int `json:"openIssues"`
		PendingApprovals    int `json:"pendingApprovals"`
		PendingExpenses     int `json:"pendingExpenses"`
		OverdueMilestones   int `json:"overdueMilestones"`
		CompletedMilestones int `json:"completedMilestones"`
		TotalMilestones     int `json:"totalMilestones"`
		Documents           int `json:"documents"`
	}
	type dashboardProject struct {
		Project    model.Project    `json:"project"`
		Membership model.Membership `json:"membership"`
		Summary    projectSummary   `json:"summary"`
	}
	items := []dashboardProject{}
	for rows.Next() {
		var item dashboardProject
		if err = rows.Scan(&item.Project.ID, &item.Project.OwnerID, &item.Project.Name, &item.Project.Location, &item.Project.Type, &item.Project.Description, &item.Project.Scope, &item.Project.BudgetCents, &item.Project.Currency, &item.Project.ConstructionStage, &item.Project.CreatedAt, &item.Project.UpdatedAt, &item.Membership.ID, &item.Membership.UserID, &item.Membership.ProjectID, &item.Membership.Role, &item.Membership.Status, &item.Membership.JoinedAt, &item.Membership.UpdatedAt); err != nil {
			rows.Close()
			writeError(w, http.StatusInternalServerError, "Unable to load your dashboard.")
			return
		}
		items = append(items, item)
	}
	if err = rows.Err(); err != nil {
		rows.Close()
		writeError(w, http.StatusInternalServerError, "Unable to load your dashboard.")
		return
	}
	rows.Close()

	// Counts are queried after the project rows are closed because SQLite is
	// intentionally limited to one connection in development.
	for index := range items {
		pid := items[index].Project.ID
		role := items[index].Membership.Role
		if can(role, permEditTasks) || can(role, permCreateTasks) {
			items[index].Summary.OpenTasks = countQuery(a.DB, `SELECT count(*) FROM tasks WHERE project_id=$1 AND status<>'DONE'`, pid)
			items[index].Summary.CompletedTasks = countQuery(a.DB, `SELECT count(*) FROM tasks WHERE project_id=$1 AND status='DONE'`, pid)
			items[index].Summary.TotalTasks = countQuery(a.DB, `SELECT count(*) FROM tasks WHERE project_id=$1`, pid)
		}
		if can(role, permManageIssues) {
			items[index].Summary.OpenIssues = countQuery(a.DB, `SELECT count(*) FROM issues WHERE project_id=$1 AND status<>'RESOLVED'`, pid)
		}
		if can(role, permViewApprovals) {
			items[index].Summary.PendingApprovals = countQuery(a.DB, `SELECT count(*) FROM approvals WHERE project_id=$1 AND status='PENDING'`, pid)
		}
		if can(role, permViewBudget) {
			items[index].Summary.PendingExpenses = countQuery(a.DB, `SELECT count(*) FROM expenses WHERE project_id=$1 AND status='PENDING'`, pid)
		}
		// Schedule health is project-confidential and is not shown to suppliers.
		if role != "SUPPLIER" {
			items[index].Summary.OverdueMilestones = countQuery(a.DB, `SELECT count(*) FROM milestones WHERE project_id=$1 AND status<>'COMPLETED' AND due_at<$2`, pid, now())
			items[index].Summary.CompletedMilestones = countQuery(a.DB, `SELECT count(*) FROM milestones WHERE project_id=$1 AND status='COMPLETED'`, pid)
			items[index].Summary.TotalMilestones = countQuery(a.DB, `SELECT count(*) FROM milestones WHERE project_id=$1`, pid)
		}
		items[index].Summary.Documents = countQuery(a.DB, `SELECT count(*) FROM documents WHERE project_id=$1`, pid)
	}

	activity := []map[string]any{}
	if len(items) > 0 {
		activityRows, activityErr := a.DB.Query(`SELECT e.id,e.project_id,e.user_id,e.action,e.details,e.created_at,p.name FROM audit_entries e JOIN projects p ON p.id=e.project_id JOIN memberships m ON m.project_id=e.project_id WHERE m.user_id=$1 AND m.status='ACTIVE' AND m.role<>'SUPPLIER' ORDER BY e.created_at DESC LIMIT 12`, u.ID)
		if activityErr == nil {
			defer activityRows.Close()
			for activityRows.Next() {
				var id, projectID, userID, action, details, createdAt, projectName string
				if activityRows.Scan(&id, &projectID, &userID, &action, &details, &createdAt, &projectName) == nil {
					activity = append(activity, map[string]any{"id": id, "projectId": projectID, "projectName": projectName, "userId": userID, "action": action, "details": details, "createdAt": createdAt})
				}
			}
		}
	}

	type dashboardTask struct {
		ID          string  `json:"id"`
		ProjectID   string  `json:"projectId"`
		ProjectName string  `json:"projectName"`
		Title       string  `json:"title"`
		Description string  `json:"description"`
		Status      string  `json:"status"`
		DueAt       *string `json:"dueAt"`
		CreatedAt   string  `json:"createdAt"`
	}
	assignedTasks := []dashboardTask{}
	if len(items) > 0 {
		tRows, tErr := a.DB.Query(`SELECT t.id,t.project_id,p.name,t.title,t.description,t.status,t.due_at,t.created_at FROM tasks t JOIN projects p ON p.id=t.project_id JOIN memberships m ON m.project_id=t.project_id AND m.user_id=$1 AND m.status='ACTIVE' WHERE t.assignee_id=$2 AND t.status<>'DONE' ORDER BY t.due_at IS NULL, t.due_at ASC, t.created_at DESC LIMIT 10`, u.ID, u.ID)
		if tErr == nil {
			defer tRows.Close()
			for tRows.Next() {
				var t dashboardTask
				if tRows.Scan(&t.ID, &t.ProjectID, &t.ProjectName, &t.Title, &t.Description, &t.Status, &t.DueAt, &t.CreatedAt) == nil {
					assignedTasks = append(assignedTasks, t)
				}
			}
		}
	}

	type dashboardDeadline struct {
		ID          string `json:"id"`
		ProjectID   string `json:"projectId"`
		ProjectName string `json:"projectName"`
		Title       string `json:"title"`
		Status      string `json:"status"`
		DueAt       string `json:"dueAt"`
	}
	upcomingDeadlines := []dashboardDeadline{}
	if len(items) > 0 {
		dRows, dErr := a.DB.Query(`SELECT m.id,m.project_id,p.name,m.title,m.status,m.due_at FROM milestones m JOIN projects p ON p.id=m.project_id JOIN memberships mem ON mem.project_id=m.project_id AND mem.user_id=$1 AND mem.status='ACTIVE' AND mem.role<>'SUPPLIER' WHERE m.status<>'COMPLETED' ORDER BY m.due_at ASC LIMIT 8`, u.ID)
		if dErr == nil {
			defer dRows.Close()
			for dRows.Next() {
				var dl dashboardDeadline
				if dRows.Scan(&dl.ID, &dl.ProjectID, &dl.ProjectName, &dl.Title, &dl.Status, &dl.DueAt) == nil {
					upcomingDeadlines = append(upcomingDeadlines, dl)
				}
			}
		}
	}

	type dashboardPendingAction struct {
		ID          string `json:"id"`
		ProjectID   string `json:"projectId"`
		ProjectName string `json:"projectName"`
		Title       string `json:"title"`
		Kind        string `json:"kind"`
		AmountCents *int64 `json:"amountCents,omitempty"`
		CreatedAt   string `json:"createdAt"`
		ActionType  string `json:"actionType"`
	}
	pendingActions := []dashboardPendingAction{}
	if len(items) > 0 {
		for _, item := range items {
			pid := item.Project.ID
			pName := item.Project.Name
			role := item.Membership.Role
			if can(role, permDecideApprovals) {
				appRows, appErr := a.DB.Query(`SELECT id,title,kind,amount_cents,created_at FROM approvals WHERE project_id=$1 AND status='PENDING' ORDER BY created_at DESC LIMIT 5`, pid)
				if appErr == nil {
					for appRows.Next() {
						var pa dashboardPendingAction
						pa.ProjectID = pid
						pa.ProjectName = pName
						pa.ActionType = "APPROVAL"
						if appRows.Scan(&pa.ID, &pa.Title, &pa.Kind, &pa.AmountCents, &pa.CreatedAt) == nil {
							pendingActions = append(pendingActions, pa)
						}
					}
					appRows.Close()
				}
			}
			if can(role, permApproveExpenses) {
				expRows, expErr := a.DB.Query(`SELECT id,description,amount_cents,created_at FROM expenses WHERE project_id=$1 AND status='PENDING' ORDER BY created_at DESC LIMIT 5`, pid)
				if expErr == nil {
					for expRows.Next() {
						var pa dashboardPendingAction
						pa.ProjectID = pid
						pa.ProjectName = pName
						pa.ActionType = "EXPENSE"
						pa.Kind = "EXPENSE"
						var amt int64
						if expRows.Scan(&pa.ID, &pa.Title, &amt, &pa.CreatedAt) == nil {
							pa.AmountCents = &amt
							pendingActions = append(pendingActions, pa)
						}
					}
					expRows.Close()
				}
			}
		}
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"user":              u,
		"projects":          items,
		"activity":          activity,
		"assignedTasks":     assignedTasks,
		"upcomingDeadlines": upcomingDeadlines,
		"pendingActions":    pendingActions,
	})
}

func (a *API) workspace(w http.ResponseWriter, r *http.Request) {
	access, ok := a.requireProjectAccess(w, r, "")
	if !ok {
		return
	}
	pid := access.Project.ID
	role := access.Membership.Role
	result := map[string]any{
		"project":     access.Project,
		"membership":  access.Membership,
		"permissions": permissionsFor(role),
		"role":        role,
	}

	// Team details are not exposed to suppliers because they may reveal the
	// commercial structure of the project.
	if role != "SUPPLIER" {
		result["team"] = a.listTeam(pid)
	}

	if can(role, permEditTasks) || can(role, permCreateTasks) {
		tasks, err := a.fetchTasksForProject(pid)
		if err != nil || tasks == nil {
			tasks = []model.Task{}
		}
		result["tasks"] = tasks
	}
	if role != "SUPPLIER" {
		milestones, err := a.fetchMilestonesForProject(pid)
		if err != nil || milestones == nil {
			milestones = []model.Milestone{}
		}
		result["milestones"] = milestones
	}
	if role != "SUPPLIER" {
		reports := a.listReports(pid)
		result["reports"] = reports
	}
	if bv, ok := a.buildBudgetView(pid, role); ok {
		result["budget"] = bv
	}
	if can(role, permViewDocuments) {
		docs := a.listDocuments(pid)
		result["documents"] = docs
	}
	if can(role, permViewApprovals) {
		approvals := a.listApprovals(pid)
		result["approvals"] = approvals
	}
	if can(role, permViewApprovals) || can(role, permSubmitBOQ) {
		boq := a.listBOQ(pid)
		result["boq"] = boq
	}
	if can(role, permManageIssues) {
		issues := a.listIssues(pid)
		result["issues"] = issues
	}
	if can(role, permSubmitQuotes) || can(role, permDecideQuotes) {
		quotations := a.listQuotations(pid, access.User.ID, role)
		result["quotations"] = quotations
	}
	if role != "SUPPLIER" {
		activity := a.listActivity(pid, 20)
		result["activity"] = activity
	}

	summary := map[string]int{
		"openTasks":           countQuery(a.DB, `SELECT count(*) FROM tasks WHERE project_id=$1 AND status<>'DONE'`, pid),
		"completedTasks":      countQuery(a.DB, `SELECT count(*) FROM tasks WHERE project_id=$1 AND status='DONE'`, pid),
		"totalTasks":          countQuery(a.DB, `SELECT count(*) FROM tasks WHERE project_id=$1`, pid),
		"openIssues":          countQuery(a.DB, `SELECT count(*) FROM issues WHERE project_id=$1 AND status<>'RESOLVED'`, pid),
		"pendingApprovals":    countQuery(a.DB, `SELECT count(*) FROM approvals WHERE project_id=$1 AND status='PENDING'`, pid),
		"pendingExpenses":     countQuery(a.DB, `SELECT count(*) FROM expenses WHERE project_id=$1 AND status='PENDING'`, pid),
		"overdueMilestones":   countQuery(a.DB, `SELECT count(*) FROM milestones WHERE project_id=$1 AND status<>'COMPLETED' AND due_at<$2`, pid, now()),
		"completedMilestones": countQuery(a.DB, `SELECT count(*) FROM milestones WHERE project_id=$1 AND status='COMPLETED'`, pid),
		"totalMilestones":     countQuery(a.DB, `SELECT count(*) FROM milestones WHERE project_id=$1`, pid),
		"documents":           countQuery(a.DB, `SELECT count(*) FROM documents WHERE project_id=$1`, pid),
	}
	if role == "SUPPLIER" {
		delete(summary, "overdueMilestones")
		delete(summary, "completedMilestones")
		delete(summary, "totalMilestones")
	}
	if !can(role, permViewBudget) {
		delete(summary, "pendingExpenses")
	}
	if !can(role, permViewApprovals) {
		delete(summary, "pendingApprovals")
	}
	if !can(role, permManageIssues) {
		delete(summary, "openIssues")
	}
	if !can(role, permEditTasks) && !can(role, permCreateTasks) {
		delete(summary, "openTasks")
		delete(summary, "completedTasks")
		delete(summary, "totalTasks")
	}
	result["summary"] = summary
	writeJSON(w, http.StatusOK, result)
}

func (a *API) listExpenses(projectID string) []model.Expense {
	expenses, _ := a.fetchExpensesForProject(projectID)
	return expenses
}

func (a *API) listTeam(projectID string) []model.TeamMember {
	rows, err := a.DB.Query(`SELECT u.id,u.name,u.email,m.role,m.joined_at FROM memberships m JOIN users u ON u.id=m.user_id WHERE m.project_id=$1 AND m.status='ACTIVE' ORDER BY m.joined_at`, projectID)
	if err != nil {
		return []model.TeamMember{}
	}
	defer rows.Close()
	items := []model.TeamMember{}
	for rows.Next() {
		var item model.TeamMember
		if rows.Scan(&item.UserID, &item.Name, &item.Email, &item.Role, &item.JoinedAt) == nil {
			items = append(items, item)
		}
	}
	return items
}

type activityEntry struct {
	ID        string `json:"id"`
	ProjectID string `json:"projectId"`
	UserID    string `json:"userId"`
	Action    string `json:"action"`
	Details   string `json:"details"`
	CreatedAt string `json:"createdAt"`
}

func (a *API) listActivity(projectID string, limit int) []activityEntry {
	rows, err := a.DB.Query(`SELECT id,project_id,user_id,action,details,created_at FROM audit_entries WHERE project_id=$1 ORDER BY created_at DESC LIMIT $2`, projectID, limit)
	if err != nil {
		return []activityEntry{}
	}
	defer rows.Close()
	items := []activityEntry{}
	for rows.Next() {
		var item activityEntry
		if rows.Scan(&item.ID, &item.ProjectID, &item.UserID, &item.Action, &item.Details, &item.CreatedAt) == nil {
			items = append(items, item)
		}
	}
	return items
}

func validationError(w http.ResponseWriter, errors map[string]string) {
	writeJSON(w, http.StatusUnprocessableEntity, map[string]any{"errors": errors})
}

func (a *API) created(w http.ResponseWriter, item any) {
	writeJSON(w, http.StatusCreated, item)
}

func (a *API) notFound(w http.ResponseWriter, message string) {
	writeError(w, http.StatusNotFound, message)
}

func (a *API) serverError(w http.ResponseWriter, message string) {
	writeError(w, http.StatusInternalServerError, message)
}

func mustTime(value string) time.Time {
	parsed, err := time.Parse(time.RFC3339Nano, value)
	if err != nil {
		return time.Now()
	}
	return parsed
}
