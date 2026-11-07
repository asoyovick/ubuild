package handler

import "sort"

const (
	permViewProject      = "view_project"
	permEditProject      = "edit_project"
	permManageMembers    = "manage_members"
	permCreateTasks      = "create_tasks"
	permEditTasks        = "edit_tasks"
	permManageSchedule   = "manage_schedule"
	permViewBudget       = "view_budget"
	permEditBudget       = "edit_budget"
	permApproveExpenses  = "approve_expenses"
	permSubmitReports    = "submit_reports"
	permViewDocuments    = "view_documents"
	permUploadDocuments  = "upload_documents"
	permSubmitQuotes     = "submit_quotations"
	permViewApprovals    = "view_approvals"
	permDecideApprovals  = "decide_approvals"
	permRequestChanges   = "request_changes"
	permSubmitBOQ        = "submit_boq"
	permDecideQuotes     = "decide_quotations"
	permManageIssues     = "manage_issues"
	permViewExpenses     = "view_expenses"
	permSubmitExpenses   = "submit_expenses"
)

var rolePermissions = map[string]map[string]bool{
	"OWNER": permissionSet(
		permViewProject, permEditProject, permManageMembers, permCreateTasks,
		permEditTasks, permManageSchedule, permViewBudget, permEditBudget,
		permApproveExpenses, permSubmitReports, permViewDocuments,
		permUploadDocuments, permSubmitQuotes, permViewApprovals,
		permDecideApprovals, permRequestChanges, permSubmitBOQ,
		permDecideQuotes, permManageIssues, permViewExpenses, permSubmitExpenses,
	),
	"COORDINATOR": permissionSet(
		permViewProject, permEditProject, permManageMembers, permCreateTasks,
		permEditTasks, permManageSchedule, permViewBudget, permSubmitReports,
		permViewDocuments, permUploadDocuments, permViewApprovals,
		permDecideApprovals, permRequestChanges, permDecideQuotes,
		permManageIssues, permViewExpenses, permSubmitExpenses,
	),
	"ARCHITECT": permissionSet(
		permViewProject, permCreateTasks, permEditTasks, permSubmitReports,
		permViewDocuments, permUploadDocuments, permRequestChanges,
		permManageIssues,
	),
	"ENGINEER": permissionSet(
		permViewProject, permCreateTasks, permEditTasks, permSubmitReports,
		permViewDocuments, permUploadDocuments, permManageIssues,
	),
	"QUANTITY_SURVEYOR": permissionSet(
		permViewProject, permViewBudget, permEditBudget, permViewDocuments,
		permUploadDocuments, permSubmitQuotes, permViewApprovals,
		permDecideQuotes, permRequestChanges, permSubmitBOQ, permManageIssues,
		permViewExpenses, permSubmitExpenses,
	),
	"SITE_SUPERVISOR": permissionSet(
		permViewProject, permCreateTasks, permEditTasks, permSubmitReports,
		permViewDocuments, permUploadDocuments, permRequestChanges,
		permManageIssues, permSubmitExpenses,
	),
	"CONTRACTOR": permissionSet(
		permViewProject, permCreateTasks, permEditTasks, permSubmitReports,
		permViewDocuments, permUploadDocuments, permRequestChanges,
		permManageIssues, permSubmitExpenses,
	),
	"SUPPLIER": permissionSet(
		permViewProject, permViewDocuments, permUploadDocuments, permSubmitQuotes,
	),
}

func permissionSet(permissions ...string) map[string]bool {
	set := make(map[string]bool, len(permissions))
	for _, permission := range permissions {
		set[permission] = true
	}
	return set
}

func can(role, permission string) bool {
	return rolePermissions[role][permission]
}

func permissionsFor(role string) []string {
	set := rolePermissions[role]
	result := make([]string, 0, len(set))
	for permission := range set {
		result = append(result, permission)
	}
	sort.Strings(result)
	return result
}

func validRole(role string) bool {
	return roles[role]
}

func validTaskStatus(status string) bool {
	return status == "TODO" || status == "IN_PROGRESS" || status == "DONE" || status == "BLOCKED"
}

func validMilestoneStatus(status string) bool {
	return status == "PLANNED" || status == "IN_PROGRESS" || status == "COMPLETED"
}

func validExpenseStatus(status string) bool {
	return status == "PENDING" || status == "APPROVED" || status == "REJECTED"
}

func validDocumentKind(kind string) bool {
	switch kind {
	case "DRAWING", "REPORT", "PHOTO", "DELIVERY", "BOQ", "OTHER":
		return true
	}
	return false
}

func validReportKind(kind string) bool {
	return kind == "DAILY" || kind == "PROGRESS" || kind == "INSPECTION"
}

func validApprovalKind(kind string) bool {
	switch kind {
	case "MATERIAL", "VARIATION", "REPORT", "EXPENSE", "CHANGE":
		return true
	}
	return false
}

func validApprovalStatus(status string) bool {
	return status == "PENDING" || status == "APPROVED" || status == "REJECTED"
}

func validQuotationStatus(status string) bool {
	return status == "SUBMITTED" || status == "ACCEPTED" || status == "REJECTED"
}

func validIssueSeverity(severity string) bool {
	return severity == "LOW" || severity == "MEDIUM" || severity == "HIGH"
}

func validIssueStatus(status string) bool {
	return status == "OPEN" || status == "IN_PROGRESS" || status == "RESOLVED"
}
