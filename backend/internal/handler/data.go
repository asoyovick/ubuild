package handler

import (
	"database/sql"
	"errors"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/ubuild/backend/internal/model"
)

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
	input.Description = strings.TrimSpace(input.Description)
	input.Status = strings.TrimSpace(input.Status)
	input.DueAt = strings.TrimSpace(input.DueAt)
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
	if input.AssigneeID != "" {
		var exists int
		if err := a.DB.QueryRow(`SELECT 1 FROM memberships WHERE project_id=$1 AND user_id=$2 AND status='ACTIVE'`, access.Project.ID, input.AssigneeID).Scan(&exists); err != nil {
			errs["assigneeId"] = "Choose an active project member."
		}
	}
	if len(errs) > 0 {
		writeError(w, http.StatusBadRequest, "validation error")
		return
	}
	id := uuid.New().String()
	createdAt := a.now()
	var status string
	if input.Status == "" {
		status = "TODO"
	} else {
		status = input.Status
	}
	var assigneeID sql.NullString
	if input.AssigneeID != "" {
		assigneeID.String = input.AssigneeID
		assigneeID.Valid = true
	}
	var dueAt sql.NullString
	if input.DueAt != "" {
		dueAt.String = input.DueAt
		dueAt.Valid = true
	}
	if _, err := a.DB.Exec(`INSERT INTO tasks(id,project_id,title,description,status,assignee_id,created_by,due_at,created_at,updated_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$9)`, id, access.Project.ID, input.Title, input.Description, status, assigneeID, access.User.ID, dueAt, createdAt); err != nil {
		log.Printf("create task: %v", err)
		writeError(w, http.StatusInternalServerError, "Unable to create the task.")
		return
	}
	a.recordAudit(access.Project.ID, access.User.ID, "task_created", "Task created: "+input.Title)
	task := model.Task{
		ID:          id,
		ProjectID:   access.Project.ID,
		Title:       input.Title,
		Description: input.Description,
		Status:      status,
		AssigneeID:  nil,
		CreatedBy:   access.User.ID,
		DueAt:       nil,
		CreatedAt:   createdAt,
		UpdatedAt:   createdAt,
	}
	if assigneeID.Valid {
		task.AssigneeID = &assigneeID.String
	}
	if dueAt.Valid {
		task.DueAt = &dueAt.String
	}
	writeJSON(w, http.StatusCreated, task)
}

func (a *API) listTasksByProject(w http.ResponseWriter, r *http.Request) {
	access, ok := a.requireProjectAccess(w, r, "")
	if !ok {
		return
	}
	if !can(access.Membership.Role, permEditTasks) && !can(access.Membership.Role, permCreateTasks) {
		writeError(w, http.StatusForbidden, "You do not have permission to view tasks.")
		return
	}
	tasks, err := a.fetchTasksForProject(access.Project.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load tasks")
		return
	}
	if tasks == nil {
		tasks = []model.Task{}
	}
	writeJSON(w, http.StatusOK, tasks)
}

func (a *API) listTasks(pid string) []model.Task {
	tasks, _ := a.fetchTasksForProject(pid)
	if tasks == nil {
		tasks = []model.Task{}
	}
	return tasks
}

func (a *API) fetchTasksForProject(projectID string) ([]model.Task, error) {
	rows, err := a.DB.Query(`SELECT id,project_id,title,description,status,assignee_id,created_by,due_at,created_at,updated_at FROM tasks WHERE project_id=$1 ORDER BY created_at DESC`, projectID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var tasks []model.Task
	for rows.Next() {
		var t model.Task
		var dueAt sql.NullString
		if err := rows.Scan(&t.ID, &t.ProjectID, &t.Title, &t.Description, &t.Status, &t.AssigneeID, &t.CreatedBy, &dueAt, &t.CreatedAt, &t.UpdatedAt); err != nil {
			return nil, err
		}
		if dueAt.Valid {
			t.DueAt = &dueAt.String
		}
		tasks = append(tasks, t)
	}
	return tasks, rows.Err()
}

func (a *API) updateTask(w http.ResponseWriter, r *http.Request) {
	access, ok := a.requireProjectAccess(w, r, permEditTasks)
	if !ok {
		return
	}
	taskID := r.PathValue("taskId")
	if taskID == "" {
		writeError(w, http.StatusBadRequest, "taskId is required")
		return
	}
	var input struct {
		Title       *string `json:"title"`
		Description *string `json:"description"`
		Status      *string `json:"status"`
		AssigneeID  *string `json:"assigneeId"`
		DueAt       *string `json:"dueAt"`
	}
	if !decode(w, r, &input) {
		return
	}
	var existing model.Task
	err := a.DB.QueryRow(`SELECT id,project_id,title,description,status,assignee_id,created_by,due_at,created_at,updated_at FROM tasks WHERE id=$1 AND project_id=$2`, taskID, access.Project.ID).Scan(&existing.ID, &existing.ProjectID, &existing.Title, &existing.Description, &existing.Status, &existing.AssigneeID, &existing.CreatedBy, &existing.DueAt, &existing.CreatedAt, &existing.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		writeError(w, http.StatusNotFound, "task not found")
		return
	} else if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load task")
		return
	}
	if input.Title != nil {
		v := strings.TrimSpace(*input.Title)
		if len([]rune(v)) >= 2 {
			existing.Title = v
		}
	}
	if input.Description != nil {
		existing.Description = strings.TrimSpace(*input.Description)
	}
	errs := map[string]string{}
	if input.Status != nil {
		v := strings.TrimSpace(*input.Status)
		if v != "" && !validTaskStatus(v) {
			errs["status"] = "Choose a valid task status."
		} else if v != "" {
			existing.Status = v
		}
	}
	if len(errs) > 0 {
		validationError(w, errs)
		return
	}
	if input.AssigneeID != nil {
		v := strings.TrimSpace(*input.AssigneeID)
		if v == "" {
			existing.AssigneeID = nil
		} else {
			var exists int
			if err := a.DB.QueryRow(`SELECT 1 FROM memberships WHERE project_id=$1 AND user_id=$2 AND status='ACTIVE'`, access.Project.ID, v).Scan(&exists); err == nil {
				existing.AssigneeID = &v
			}
		}
	}
	if input.DueAt != nil {
		v := strings.TrimSpace(*input.DueAt)
		if v != "" {
			existing.DueAt = &v
		}
	}

	now := a.now()
	if _, err := a.DB.Exec(`UPDATE tasks SET title=$1,description=$2,status=$3,assignee_id=$4,due_at=$5,updated_at=$6 WHERE id=$7 AND project_id=$8`, existing.Title, existing.Description, existing.Status, existing.AssigneeID, existing.DueAt, now, existing.ID, access.Project.ID); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to update task")
		return
	}
	existing.UpdatedAt = now
	writeJSON(w, http.StatusOK, existing)
}

func (a *API) deleteTask(w http.ResponseWriter, r *http.Request) {
	access, ok := a.requireProjectAccess(w, r, permEditTasks)
	if !ok {
		return
	}
	taskID := r.PathValue("taskId")
	if taskID == "" {
		writeError(w, http.StatusBadRequest, "taskId is required")
		return
	}
	result, err := a.DB.Exec(`DELETE FROM tasks WHERE id=$1 AND project_id=$2`, taskID, access.Project.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to delete task")
		return
	}
	affected, _ := result.RowsAffected()
	if affected == 0 {
		writeError(w, http.StatusNotFound, "task not found")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"deleted": true})
}

func (a *API) createMilestone(w http.ResponseWriter, r *http.Request) {
	access, ok := a.requireProjectAccess(w, r, permManageSchedule)
	if !ok {
		return
	}
	var input struct {
		Title             string `json:"title"`
		Description       string `json:"description"`
		Status            string `json:"status"`
		DueAt             string `json:"dueAt"`
		EngagementID      string `json:"engagementId"`
		ConstructionStage string `json:"constructionStage"`
	}
	if !decode(w, r, &input) {
		return
	}
	input.Title = strings.TrimSpace(input.Title)
	input.Description = strings.TrimSpace(input.Description)
	input.DueAt = strings.TrimSpace(input.DueAt)
	input.EngagementID = strings.TrimSpace(input.EngagementID)
	input.ConstructionStage = strings.ToUpper(strings.TrimSpace(input.ConstructionStage))
	errs := map[string]string{}
	if len([]rune(input.Title)) < 2 {
		errs["title"] = "Please enter a milestone title."
	}
	if input.DueAt == "" {
		errs["dueAt"] = "Please choose a due date."
	}
	if input.Status != "" && !validMilestoneStatus(input.Status) {
		errs["status"] = "Choose a valid milestone status."
	}
	if len(errs) > 0 {
		writeError(w, http.StatusBadRequest, "validation error")
		return
	}
	id := uuid.New().String()
	createdAt := a.now()
	status := "PLANNED"
	if input.Status != "" {
		status = input.Status
	}
	if _, err := a.DB.Exec(`INSERT INTO milestones(id,project_id,engagement_id,construction_stage,title,description,status,due_at,created_by,created_at,updated_at)
		VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$10)`,
		id, access.Project.ID, input.EngagementID, input.ConstructionStage, input.Title, input.Description, status, input.DueAt, access.User.ID, createdAt); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create milestone")
		return
	}
	milestone := model.Milestone{
		ID:                id,
		ProjectID:         access.Project.ID,
		EngagementID:      input.EngagementID,
		ConstructionStage: input.ConstructionStage,
		Title:             input.Title,
		Description:       input.Description,
		Status:            status,
		DueAt:             input.DueAt,
		CreatedBy:         access.User.ID,
		CreatedAt:         createdAt,
		UpdatedAt:         createdAt,
	}
	writeJSON(w, http.StatusCreated, milestone)
}

func (a *API) listMilestonesByProject(w http.ResponseWriter, r *http.Request) {
	access, ok := a.requireProjectAccess(w, r, "")
	if !ok {
		return
	}
	if access.Membership.Role == "SUPPLIER" {
		writeError(w, http.StatusForbidden, "Suppliers cannot view milestones.")
		return
	}
	milestones, err := a.fetchMilestonesForProject(access.Project.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load milestones")
		return
	}
	if milestones == nil {
		milestones = []model.Milestone{}
	}
	writeJSON(w, http.StatusOK, milestones)
}

func (a *API) listMilestones(pid string) []model.Milestone {
	items, _ := a.fetchMilestonesForProject(pid)
	if items == nil {
		items = []model.Milestone{}
	}
	return items
}

func (a *API) fetchMilestonesForProject(projectID string) ([]model.Milestone, error) {
	rows, err := a.DB.Query(`SELECT id,project_id,COALESCE(engagement_id,''),COALESCE(construction_stage,''),title,description,status,due_at,created_by,created_at,updated_at FROM milestones WHERE project_id=$1 ORDER BY due_at ASC`, projectID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []model.Milestone
	for rows.Next() {
		var m model.Milestone
		if err := rows.Scan(&m.ID, &m.ProjectID, &m.EngagementID, &m.ConstructionStage, &m.Title, &m.Description, &m.Status, &m.DueAt, &m.CreatedBy, &m.CreatedAt, &m.UpdatedAt); err != nil {
			return nil, err
		}
		items = append(items, m)
	}
	return items, rows.Err()
}

func (a *API) updateMilestone(w http.ResponseWriter, r *http.Request) {
	access, ok := a.requireProjectAccess(w, r, permManageSchedule)
	if !ok {
		return
	}
	milestoneID := r.PathValue("milestoneId")
	if milestoneID == "" {
		writeError(w, http.StatusBadRequest, "milestoneId is required")
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
	var existing model.Milestone
	err := a.DB.QueryRow(`SELECT id,project_id,title,description,status,due_at,created_by,created_at,updated_at FROM milestones WHERE id=$1 AND project_id=$2`, milestoneID, access.Project.ID).Scan(&existing.ID, &existing.ProjectID, &existing.Title, &existing.Description, &existing.Status, &existing.DueAt, &existing.CreatedBy, &existing.CreatedAt, &existing.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		writeError(w, http.StatusNotFound, "milestone not found")
		return
	} else if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load milestone")
		return
	}
	if input.Title != nil {
		v := strings.TrimSpace(*input.Title)
		if len([]rune(v)) >= 2 {
			existing.Title = v
		}
	}
	if input.Description != nil {
		existing.Description = strings.TrimSpace(*input.Description)
	}
	errs := map[string]string{}
	if input.Status != nil {
		v := strings.TrimSpace(*input.Status)
		if v != "" && !validMilestoneStatus(v) {
			errs["status"] = "Choose a valid milestone status."
		} else if v != "" {
			existing.Status = v
		}
	}
	if len(errs) > 0 {
		validationError(w, errs)
		return
	}
	if input.DueAt != nil {
		v := strings.TrimSpace(*input.DueAt)
		if v != "" {
			existing.DueAt = v
		}
	}
	now := a.now()
	if _, err := a.DB.Exec(`UPDATE milestones SET title=$1,description=$2,status=$3,due_at=$4,updated_at=$5 WHERE id=$6 AND project_id=$7`, existing.Title, existing.Description, existing.Status, existing.DueAt, now, existing.ID, access.Project.ID); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to update milestone")
		return
	}
	existing.UpdatedAt = now
	writeJSON(w, http.StatusOK, existing)
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
	input.Description = strings.TrimSpace(input.Description)
	errs := map[string]string{}
	if len([]rune(input.Category)) < 2 {
		errs["category"] = "Please enter a budget category."
	}
	// Basic budget access check.
	if !can(access.Membership.Role, permEditBudget) {
		errs["amountCents"] = "You do not have permission to add budget items."
	}
	if input.AmountCents <= 0 {
		errs["amountCents"] = "Amount must be greater than zero."
	}
	if len(errs) > 0 {
		writeError(w, http.StatusBadRequest, "validation error")
		return
	}
	id := uuid.New().String()
	createdAt := a.now()
	if _, err := a.DB.Exec(`INSERT INTO budget_items(id,project_id,category,description,amount_cents,created_by,created_at) VALUES($1,$2,$3,$4,$5,$6,$7)`, id, access.Project.ID, input.Category, input.Description, input.AmountCents, access.User.ID, createdAt); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create budget item")
		return
	}
	item := model.BudgetItem{
		ID:          id,
		ProjectID:   access.Project.ID,
		Category:    input.Category,
		Description: input.Description,
		AmountCents: input.AmountCents,
		CreatedBy:   access.User.ID,
		CreatedAt:   createdAt,
	}
	writeJSON(w, http.StatusCreated, item)
}

func (a *API) listBudgetItemsByProject(w http.ResponseWriter, r *http.Request) {
	access, ok := a.requireProjectAccess(w, r, permViewBudget)
	if !ok {
		return
	}
	role := access.Membership.Role
	if role == "SUPPLIER" {
		writeError(w, http.StatusForbidden, "suppliers cannot view budget details")
		return
	}
	items, err := a.fetchBudgetItemsForProject(access.Project.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load budget items")
		return
	}
	writeJSON(w, http.StatusOK, items)
}

func (a *API) listBudget(pid string) []model.BudgetItem {
	items, _ := a.fetchBudgetItemsForProject(pid)
	return items
}

func (a *API) fetchBudgetItemsForProject(projectID string) ([]model.BudgetItem, error) {
	rows, err := a.DB.Query(`SELECT id,project_id,category,description,amount_cents,created_by,created_at FROM budget_items WHERE project_id=$1 ORDER BY created_at DESC`, projectID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []model.BudgetItem
	for rows.Next() {
		var it model.BudgetItem
		if err := rows.Scan(&it.ID, &it.ProjectID, &it.Category, &it.Description, &it.AmountCents, &it.CreatedBy, &it.CreatedAt); err != nil {
			return nil, err
		}
		items = append(items, it)
	}
	return items, rows.Err()
}

func (a *API) createExpense(w http.ResponseWriter, r *http.Request) {
	access, ok := a.requireProjectAccess(w, r, permSubmitExpenses)
	if !ok {
		return
	}
	var input struct {
		Title       string `json:"title"`
		Description string `json:"description"`
		AmountCents int64  `json:"amountCents"`
		Reason      string `json:"reason"`
	}
	if !decode(w, r, &input) {
		writeError(w, http.StatusBadRequest, "The request body could not be read.")
		return
	}
	desc := strings.TrimSpace(input.Title)
	if desc == "" {
		desc = strings.TrimSpace(input.Description)
	}
	input.Reason = strings.TrimSpace(input.Reason)
	errs := map[string]string{}
	if len([]rune(desc)) < 2 {
		errs["title"] = "Please enter an expense title."
	}
	if !can(access.Membership.Role, permSubmitExpenses) {
		errs["amountCents"] = "You do not have permission to submit expenses."
	}
	if input.AmountCents <= 0 {
		errs["amountCents"] = "Amount must be greater than zero."
	}
	if len(errs) > 0 {
		writeError(w, http.StatusBadRequest, "validation error")
		return
	}
	id := uuid.New().String()
	createdAt := a.now()
	status := "PENDING"
	if _, err := a.DB.Exec(`INSERT INTO expenses(id,project_id,description,amount_cents,status,requested_by,created_at) VALUES($1,$2,$3,$4,$5,$6,$7)`, id, access.Project.ID, desc, input.AmountCents, status, access.User.ID, createdAt); err != nil {
		log.Printf("create expense: %v", err)
		writeError(w, http.StatusInternalServerError, "Unable to submit the expense.")
		return
	}
	a.recordAudit(access.Project.ID, access.User.ID, "expense_submitted", "Expense submitted: "+desc)
	expense := model.Expense{
		ID:          id,
		ProjectID:   access.Project.ID,
		Description: desc,
		AmountCents: input.AmountCents,
		Amount:      input.AmountCents,
		Reason:      input.Reason,
		Status:      status,
		RequestedBy: access.User.ID,
		CreatedAt:   createdAt,
	}
	writeJSON(w, http.StatusCreated, expense)
}

func (a *API) listExpensesByProject(w http.ResponseWriter, r *http.Request) {
	access, ok := a.requireProjectAccess(w, r, permViewExpenses)
	if !ok {
		return
	}
	expenses, err := a.fetchExpensesForProject(access.Project.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load expenses")
		return
	}
	if expenses == nil {
		expenses = []model.Expense{}
	}
	writeJSON(w, http.StatusOK, expenses)
}

func (a *API) fetchExpensesForProject(projectID string) ([]model.Expense, error) {
	rows, err := a.DB.Query(`SELECT id,project_id,description,amount_cents,status,requested_by,decided_by,decided_at,created_at FROM expenses WHERE project_id=$1 ORDER BY created_at DESC`, projectID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []model.Expense
	for rows.Next() {
		var e model.Expense
		if err := rows.Scan(&e.ID, &e.ProjectID, &e.Description, &e.AmountCents, &e.Status, &e.RequestedBy, &e.DecidedBy, &e.DecidedAt, &e.CreatedAt); err != nil {
			return nil, err
		}
		items = append(items, e)
	}
	return items, rows.Err()
}

func (a *API) approveExpense(w http.ResponseWriter, r *http.Request) {
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
	errs := map[string]string{}
	if input.Status != "APPROVED" && input.Status != "REJECTED" {
		errs["status"] = "Status must be APPROVED or REJECTED."
	}
	if !can(access.Membership.Role, permApproveExpenses) {
		errs["status"] = "You do not have permission to approve expenses."
	}
	if len(errs) > 0 {
		writeError(w, http.StatusBadRequest, "validation error")
		return
	}
	expenseID := r.PathValue("expenseId")
	if expenseID == "" {
		writeError(w, http.StatusBadRequest, "expenseId is required")
		return
	}
	now := a.now()
	result, err := a.DB.Exec(`UPDATE expenses SET status=$1,decided_by=$2,decided_at=$3 WHERE id=$4 AND project_id=$5 AND status='PENDING'`, input.Status, access.User.ID, now, expenseID, access.Project.ID)
	if err != nil {
		log.Printf("approve expense: %v", err)
		writeError(w, http.StatusInternalServerError, "Unable to update the expense.")
		return
	}
	affected, _ := result.RowsAffected()
	if affected == 0 {
		writeError(w, http.StatusNotFound, "expense not found or already decided")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"updated": true})
}

func (a *API) now() string {
	return time.Now().UTC().Format("2006-01-02T15:04:05.000Z")
}
