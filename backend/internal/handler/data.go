package handler

import (
	"database/sql"
	"errors"
	"net/http"
	"strings"

	"github.com/ubuild/backend/internal/model"
)

func (a *API) listTasks(projectID string) []model.Task {
	rows, err := a.DB.Query(`SELECT t.id,t.project_id,t.title,t.description,t.status,t.assignee_id,t.created_by,t.due_at,t.created_at,t.updated_at,coalesce(u.name,'') FROM tasks t LEFT JOIN users u ON u.id=t.assignee_id WHERE t.project_id=$1 ORDER BY t.created_at DESC`, projectID)
	if err != nil {
		return []model.Task{}
	}
	defer rows.Close()
	items := []model.Task{}
	for rows.Next() {
		var item model.Task
		if rows.Scan(&item.ID, &item.ProjectID, &item.Title, &item.Description, &item.Status, &item.AssigneeID, &item.CreatedBy, &item.DueAt, &item.CreatedAt, &item.UpdatedAt, &item.AssigneeName) == nil {
			items = append(items, item)
		}
	}
	return items
}

func (a *API) createTask(w http.ResponseWriter, r *http.Request) {
	access, ok := a.requireProjectAccess(w, r, permCreateTasks)
	if !ok {
		return
	}
	var input struct {
		Title       string `json:"title"`
		Description string `json:"description"`
		Status      string `json:"status"`
		AssigneeID  string `json:"assigneeId"`
		DueAt       string `json:"dueAt"`
	}
	if !decode(w, r, &input) {
		return
	}
	input.Title = strings.TrimSpace(input.Title)
	input.Status = strings.TrimSpace(input.Status)
	if input.Status == "" {
		input.Status = "TODO"
	}
	errs := map[string]string{}
	if len([]rune(input.Title)) < 2 {
		errs["title"] = "Please enter a task title."
	}
	if !validTaskStatus(input.Status) {
		errs["status"] = "Choose a valid task status."
	}
	var assignee *string
	if strings.TrimSpace(input.AssigneeID) != "" {
		var exists int
		if err := a.DB.QueryRow(`SELECT 1 FROM memberships WHERE project_id=$1 AND user_id=$2 AND status='ACTIVE'`, access.Project.ID, input.AssigneeID).Scan(&exists); err != nil {
			errs["assigneeId"] = "Choose an active project member."
		} else {
			value := input.AssigneeID
			assignee = &value
		}
	}
	var dueAt *string
	if strings.TrimSpace(input.DueAt) != "" {
		value := strings.TrimSpace(input.DueAt)
		dueAt = &value
	}
	if len(errs) > 0 {
		validationError(w, errs)
		return
	}
	nowValue := now()
	id := newID()
	if _, err := a.DB.Exec(`INSERT INTO tasks(id,project_id,title,description,status,assignee_id,created_by,due_at,created_at,updated_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`, id, access.Project.ID, input.Title, strings.TrimSpace(input.Description), input.Status, assignee, access.User.ID, dueAt, nowValue, nowValue); err != nil {
		a.serverError(w, "Unable to create the task.")
		return
	}
	a.recordAudit(access.Project.ID, access.User.ID, "task_created", input.Title)
	a.created(w, map[string]any{"task": model.Task{ID: id, ProjectID: access.Project.ID, Title: input.Title, Description: strings.TrimSpace(input.Description), Status: input.Status, AssigneeID: assignee, CreatedBy: access.User.ID, DueAt: dueAt, CreatedAt: nowValue, UpdatedAt: nowValue}})
}

func (a *API) updateTask(w http.ResponseWriter, r *http.Request) {
	access, ok := a.requireProjectAccess(w, r, permEditTasks)
	if !ok {
		return
	}
	var input struct {
		Title       *string `json:"title"`
		Description *string `json:"description"`
		Status      *string `json:"status"`
		AssigneeID  *string `json:"assigneeId"`
	}
	if !decode(w, r, &input) {
		return
	}
	taskID := r.PathValue("taskId")
	var current model.Task
	err := a.DB.QueryRow(`SELECT id,project_id,title,description,status,assignee_id,created_by,due_at,created_at,updated_at FROM tasks WHERE id=$1 AND project_id=$2`, taskID, access.Project.ID).Scan(&current.ID, &current.ProjectID, &current.Title, &current.Description, &current.Status, &current.AssigneeID, &current.CreatedBy, &current.DueAt, &current.CreatedAt, &current.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		a.notFound(w, "Task not found.")
		return
	} else if err != nil {
		a.serverError(w, "Unable to update the task.")
		return
	}
	errs := map[string]string{}
	if input.Title != nil {
		value := strings.TrimSpace(*input.Title)
		if len([]rune(value)) < 2 {
			errs["title"] = "Please enter a task title."
		}
		current.Title = value
	}
	if input.Description != nil {
		current.Description = strings.TrimSpace(*input.Description)
	}
	if input.Status != nil {
		value := strings.TrimSpace(*input.Status)
		if !validTaskStatus(value) {
			errs["status"] = "Choose a valid task status."
		}
		current.Status = value
	}
	if input.AssigneeID != nil {
		value := strings.TrimSpace(*input.AssigneeID)
		if value == "" {
			current.AssigneeID = nil
		} else {
			var exists int
			if err := a.DB.QueryRow(`SELECT 1 FROM memberships WHERE project_id=$1 AND user_id=$2 AND status='ACTIVE'`, access.Project.ID, value).Scan(&exists); err != nil {
				errs["assigneeId"] = "Choose an active project member."
			} else {
				current.AssigneeID = &value
			}
		}
	}
	if len(errs) > 0 {
		validationError(w, errs)
		return
	}
	current.UpdatedAt = now()
	if _, err := a.DB.Exec(`UPDATE tasks SET title=$1,description=$2,status=$3,assignee_id=$4,updated_at=$5 WHERE id=$6 AND project_id=$7`, current.Title, current.Description, current.Status, current.AssigneeID, current.UpdatedAt, current.ID, access.Project.ID); err != nil {
		a.serverError(w, "Unable to update the task.")
		return
	}
	a.recordAudit(access.Project.ID, access.User.ID, "task_updated", current.Title)
	writeJSON(w, http.StatusOK, map[string]any{"task": current})
}

func (a *API) listMilestones(projectID string) []model.Milestone {
	rows, err := a.DB.Query(`SELECT id,project_id,title,description,status,due_at,created_by,created_at,updated_at FROM milestones WHERE project_id=$1 ORDER BY due_at`, projectID)
	if err != nil {
		return []model.Milestone{}
	}
	defer rows.Close()
	items := []model.Milestone{}
	for rows.Next() {
		var item model.Milestone
		if rows.Scan(&item.ID, &item.ProjectID, &item.Title, &item.Description, &item.Status, &item.DueAt, &item.CreatedBy, &item.CreatedAt, &item.UpdatedAt) == nil {
			items = append(items, item)
		}
	}
	return items
}

func (a *API) createMilestone(w http.ResponseWriter, r *http.Request) {
	access, ok := a.requireProjectAccess(w, r, permManageSchedule)
	if !ok {
		return
	}
	var input struct {
		Title       string `json:"title"`
		Description string `json:"description"`
		Status      string `json:"status"`
		DueAt       string `json:"dueAt"`
	}
	if !decode(w, r, &input) {
		return
	}
	input.Title = strings.TrimSpace(input.Title)
	input.Status = strings.TrimSpace(input.Status)
	input.DueAt = strings.TrimSpace(input.DueAt)
	if input.Status == "" {
		input.Status = "PLANNED"
	}
	errs := map[string]string{}
	if len([]rune(input.Title)) < 2 {
		errs["title"] = "Please enter a milestone title."
	}
	if input.DueAt == "" {
		errs["dueAt"] = "Please choose a due date."
	}
	if !validMilestoneStatus(input.Status) {
		errs["status"] = "Choose a valid milestone status."
	}
	if len(errs) > 0 {
		validationError(w, errs)
		return
	}
	nowValue := now()
	id := newID()
	if _, err := a.DB.Exec(`INSERT INTO milestones(id,project_id,title,description,status,due_at,created_by,created_at,updated_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`, id, access.Project.ID, input.Title, strings.TrimSpace(input.Description), input.Status, input.DueAt, access.User.ID, nowValue, nowValue); err != nil {
		a.serverError(w, "Unable to create the milestone.")
		return
	}
	a.recordAudit(access.Project.ID, access.User.ID, "milestone_created", input.Title)
	a.created(w, map[string]any{"milestone": model.Milestone{ID: id, ProjectID: access.Project.ID, Title: input.Title, Description: strings.TrimSpace(input.Description), Status: input.Status, DueAt: input.DueAt, CreatedBy: access.User.ID, CreatedAt: nowValue, UpdatedAt: nowValue}})
}

func (a *API) updateMilestone(w http.ResponseWriter, r *http.Request) {
	access, ok := a.requireProjectAccess(w, r, permManageSchedule)
	if !ok {
		return
	}
	var input struct {
		Title       *string `json:"title"`
		Description *string `json:"description"`
		Status      *string `json:"status"`
		DueAt       *string `json:"dueAt"`
	}
	if !decode(w, r, &input) {
		return
	}
	var current model.Milestone
	err := a.DB.QueryRow(`SELECT id,project_id,title,description,status,due_at,created_by,created_at,updated_at FROM milestones WHERE id=$1 AND project_id=$2`, r.PathValue("milestoneId"), access.Project.ID).Scan(&current.ID, &current.ProjectID, &current.Title, &current.Description, &current.Status, &current.DueAt, &current.CreatedBy, &current.CreatedAt, &current.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		a.notFound(w, "Milestone not found.")
		return
	} else if err != nil {
		a.serverError(w, "Unable to update the milestone.")
		return
	}
	errs := map[string]string{}
	if input.Title != nil {
		value := strings.TrimSpace(*input.Title)
		if len([]rune(value)) < 2 {
			errs["title"] = "Please enter a milestone title."
		}
		current.Title = value
	}
	if input.Description != nil {
		current.Description = strings.TrimSpace(*input.Description)
	}
	if input.Status != nil {
		value := strings.TrimSpace(*input.Status)
		if !validMilestoneStatus(value) {
			errs["status"] = "Choose a valid milestone status."
		}
		current.Status = value
	}
	if input.DueAt != nil {
		value := strings.TrimSpace(*input.DueAt)
		if value == "" {
			errs["dueAt"] = "Please choose a due date."
		}
		current.DueAt = value
	}
	if len(errs) > 0 {
		validationError(w, errs)
		return
	}
	current.UpdatedAt = now()
	if _, err := a.DB.Exec(`UPDATE milestones SET title=$1,description=$2,status=$3,due_at=$4,updated_at=$5 WHERE id=$6 AND project_id=$7`, current.Title, current.Description, current.Status, current.DueAt, current.UpdatedAt, current.ID, access.Project.ID); err != nil {
		a.serverError(w, "Unable to update the milestone.")
		return
	}
	a.recordAudit(access.Project.ID, access.User.ID, "milestone_updated", current.Title)
	writeJSON(w, http.StatusOK, map[string]any{"milestone": current})
}

type budgetView struct {
	Items            []model.BudgetItem `json:"items"`
	Expenses         []model.Expense    `json:"expenses"`
	TotalBudgetCents int64              `json:"totalBudgetCents"`
	ApprovedCents    int64              `json:"approvedExpenseCents"`
	PendingCents     int64              `json:"pendingExpenseCents"`
	CommittedCents   int64              `json:"committedCents"`
	RemainingCents   int64              `json:"remainingCents"`
}

func (a *API) listBudget(projectID string) budgetView {
	view := budgetView{Items: []model.BudgetItem{}, Expenses: []model.Expense{}}
	rows, err := a.DB.Query(`SELECT id,project_id,category,description,amount_cents,currency,created_by,created_at FROM budget_items WHERE project_id=$1 ORDER BY created_at DESC`, projectID)
	if err == nil {
		for rows.Next() {
			var item model.BudgetItem
			if rows.Scan(&item.ID, &item.ProjectID, &item.Category, &item.Description, &item.AmountCents, &item.Currency, &item.CreatedBy, &item.CreatedAt) == nil {
				view.Items = append(view.Items, item)
				view.TotalBudgetCents += item.AmountCents
			}
		}
		rows.Close()
	}
	expenseRows, err := a.DB.Query(`SELECT id,project_id,description,amount_cents,currency,status,requested_by,decided_by,decided_at,incurred_at,created_at FROM expenses WHERE project_id=$1 ORDER BY created_at DESC`, projectID)
	if err == nil {
		for expenseRows.Next() {
			var item model.Expense
			if expenseRows.Scan(&item.ID, &item.ProjectID, &item.Description, &item.AmountCents, &item.Currency, &item.Status, &item.RequestedBy, &item.DecidedBy, &item.DecidedAt, &item.IncurredAt, &item.CreatedAt) == nil {
				view.Expenses = append(view.Expenses, item)
				switch item.Status {
				case "APPROVED":
					view.ApprovedCents += item.AmountCents
				case "PENDING":
					view.PendingCents += item.AmountCents
				}
			}
		}
		expenseRows.Close()
	}
	view.CommittedCents = view.ApprovedCents + view.PendingCents
	view.RemainingCents = view.TotalBudgetCents - view.CommittedCents
	return view
}

func (a *API) createBudgetItem(w http.ResponseWriter, r *http.Request) {
	access, ok := a.requireProjectAccess(w, r, permEditBudget)
	if !ok {
		return
	}
	var input struct {
		Category    string `json:"category"`
		Description string `json:"description"`
		AmountCents int64  `json:"amountCents"`
	}
	if !decode(w, r, &input) {
		return
	}
	input.Category = strings.TrimSpace(input.Category)
	errs := map[string]string{}
	if len([]rune(input.Category)) < 2 {
		errs["category"] = "Please enter a budget category."
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
	if _, err := a.DB.Exec(`INSERT INTO budget_items(id,project_id,category,description,amount_cents,currency,created_by,created_at) VALUES($1,$2,$3,$4,$5,'KES',$6,$7)`, id, access.Project.ID, input.Category, strings.TrimSpace(input.Description), input.AmountCents, access.User.ID, createdAt); err != nil {
		a.serverError(w, "Unable to add the budget item.")
		return
	}
	a.recordAudit(access.Project.ID, access.User.ID, "budget_item_created", input.Category)
	a.created(w, map[string]any{"item": model.BudgetItem{ID: id, ProjectID: access.Project.ID, Category: input.Category, Description: strings.TrimSpace(input.Description), AmountCents: input.AmountCents, Currency: "KES", CreatedBy: access.User.ID, CreatedAt: createdAt}})
}

func (a *API) createExpense(w http.ResponseWriter, r *http.Request) {
	access, ok := a.requireProjectAccess(w, r, permViewBudget)
	if !ok {
		return
	}
	var input struct {
		Description string `json:"description"`
		AmountCents int64  `json:"amountCents"`
		IncurredAt  string `json:"incurredAt"`
	}
	if !decode(w, r, &input) {
		return
	}
	input.Description = strings.TrimSpace(input.Description)
	errs := map[string]string{}
	if len([]rune(input.Description)) < 2 {
		errs["description"] = "Please describe the expense."
	}
	if input.AmountCents <= 0 {
		errs["amountCents"] = "Enter an amount greater than zero."
	}
	if len(errs) > 0 {
		validationError(w, errs)
		return
	}
	var incurredAt *string
	if strings.TrimSpace(input.IncurredAt) != "" {
		value := strings.TrimSpace(input.IncurredAt)
		incurredAt = &value
	}
	id := newID()
	createdAt := now()
	if _, err := a.DB.Exec(`INSERT INTO expenses(id,project_id,description,amount_cents,currency,status,requested_by,incurred_at,created_at) VALUES($1,$2,$3,$4,'KES','PENDING',$5,$6,$7)`, id, access.Project.ID, input.Description, input.AmountCents, access.User.ID, incurredAt, createdAt); err != nil {
		a.serverError(w, "Unable to record the expense.")
		return
	}
	a.recordAudit(access.Project.ID, access.User.ID, "expense_submitted", input.Description)
	a.created(w, map[string]any{"expense": model.Expense{ID: id, ProjectID: access.Project.ID, Description: input.Description, AmountCents: input.AmountCents, Currency: "KES", Status: "PENDING", RequestedBy: access.User.ID, IncurredAt: incurredAt, CreatedAt: createdAt}})
}

func (a *API) decideExpense(w http.ResponseWriter, r *http.Request) {
	access, ok := a.requireProjectAccess(w, r, permApproveExpenses)
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
	result, err := a.DB.Exec(`UPDATE expenses SET status=$1,decided_by=$2,decided_at=$3 WHERE id=$4 AND project_id=$5 AND status='PENDING'`, input.Status, access.User.ID, decidedAt, r.PathValue("expenseId"), access.Project.ID)
	if err != nil {
		a.serverError(w, "Unable to update the expense.")
		return
	}
	affected, _ := result.RowsAffected()
	if affected == 0 {
		a.notFound(w, "Expense not found or already decided.")
		return
	}
	a.recordAudit(access.Project.ID, access.User.ID, "expense_"+strings.ToLower(input.Status), r.PathValue("expenseId"))
	writeJSON(w, http.StatusOK, map[string]string{"status": input.Status})
}
