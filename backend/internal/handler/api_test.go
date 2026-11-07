package handler

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"testing"

	"github.com/ubuild/backend/internal/repository"
)

func testAPI(t *testing.T) (*sql.DB, http.Handler) {
	t.Helper()
	db, err := repository.Open(filepath.Join(t.TempDir(), "test.db"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { db.Close() })
	api := &API{DB: db, Origin: "http://localhost:3000", UploadDir: filepath.Join(t.TempDir(), "uploads")}
	return db, api.Handler()
}
func call(h http.Handler, method, path string, body any, cookie *http.Cookie) *httptest.ResponseRecorder {
	data, _ := json.Marshal(body)
	req := httptest.NewRequest(method, path, bytes.NewReader(data))
	req.Header.Set("Content-Type", "application/json")
	if cookie != nil {
		req.AddCookie(cookie)
	}
	res := httptest.NewRecorder()
	h.ServeHTTP(res, req)
	return res
}
func registerTest(h http.Handler, t *testing.T, email, role string) (*http.Cookie, string) {
	t.Helper()
	res := call(h, "POST", "/api/auth/register", map[string]string{"name": "Test User", "email": email, "role": role, "password": "correct-horse-battery", "confirmPassword": "correct-horse-battery"}, nil)
	if res.Code != 201 {
		t.Fatalf("register: status=%d body=%s", res.Code, res.Body.String())
	}
	var body struct {
		User struct {
			ID string `json:"id"`
		} `json:"user"`
	}
	if err := json.Unmarshal(res.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	cookie := res.Result().Cookies()[0]
	return cookie, body.User.ID
}

func TestRegistrationValidationDuplicateAndRole(t *testing.T) {
	db, h := testAPI(t)
	bad := call(h, "POST", "/api/auth/register", map[string]string{"name": "A", "email": "not-an-email", "role": "ADMIN", "password": "short", "confirmPassword": "mismatch"}, nil)
	if bad.Code != 422 {
		t.Fatalf("expected validation status 422, got %d", bad.Code)
	}
	var b map[string]map[string]string
	_ = json.Unmarshal(bad.Body.Bytes(), &b)
	for _, field := range []string{"name", "email", "role", "password", "confirmPassword"} {
		if b["errors"][field] == "" {
			t.Errorf("missing validation error for %s", field)
		}
	}
	_, _ = registerTest(h, t, "User@Example.test", "ARCHITECT")
	var storedHash string
	if err := db.QueryRow(`SELECT password_hash FROM users WHERE email=?`, "user@example.test").Scan(&storedHash); err != nil {
		t.Fatal(err)
	}
	if storedHash == "correct-horse-battery" || storedHash == "" {
		t.Fatal("password was not securely hashed")
	}
	var confirmationColumn int
	if err := db.QueryRow(`SELECT count(*) FROM pragma_table_info('users') WHERE name='confirmPassword'`).Scan(&confirmationColumn); err != nil || confirmationColumn != 0 {
		t.Fatal("password confirmation must not be persisted")
	}
	dupe := call(h, "POST", "/api/auth/register", map[string]string{"name": "Test User", "email": " user@example.test ", "role": "ENGINEER", "password": "correct-horse-battery", "confirmPassword": "correct-horse-battery"}, nil)
	if dupe.Code != 409 {
		t.Fatalf("duplicate status=%d", dupe.Code)
	}
}

func TestLoginAndProfileRole(t *testing.T) {
	_, h := testAPI(t)
	_, _ = registerTest(h, t, "person@example.test", "QUANTITY_SURVEYOR")
	login := call(h, "POST", "/api/auth/login", map[string]string{"email": " PERSON@example.test ", "password": "correct-horse-battery"}, nil)
	if login.Code != 200 {
		t.Fatalf("login status=%d body=%s", login.Code, login.Body.String())
	}
	authCookie := login.Result().Cookies()[0]
	me := call(h, "GET", "/api/auth/me", nil, authCookie)
	if me.Code != 200 {
		t.Fatal(me.Code)
	}
	var body struct {
		User struct {
			Email string  `json:"email"`
			Role  *string `json:"profileRole"`
		} `json:"user"`
	}
	_ = json.Unmarshal(me.Body.Bytes(), &body)
	if body.User.Email != "person@example.test" || body.User.Role == nil || *body.User.Role != "QUANTITY_SURVEYOR" {
		t.Fatalf("wrong profile: %+v", body.User)
	}
	wrong := call(h, "POST", "/api/auth/login", map[string]string{"email": "person@example.test", "password": "wrong-password"}, nil)
	if wrong.Code != 401 {
		t.Fatalf("wrong password status=%d", wrong.Code)
	}
}

func TestLegacyNodeScryptPasswordHash(t *testing.T) {
	encoded := "0123456789abcdef0123456789abcdef:2a6389fa6e25b6b6825dbdc48b528f1ea4664b8f414aaaca42c308771a248049d7ae5077d8c02cac2f5956664a51ea802e02f798daa62c6151aded48d87346cc"
	valid, err := verifyPassword("legacy-password", encoded)
	if err != nil || !valid {
		t.Fatalf("legacy Next.js password hash failed verification: valid=%v err=%v", valid, err)
	}
}

func TestProjectOwnershipMembershipAndCrossProjectDenial(t *testing.T) {
	db, h := testAPI(t)
	owner, ownerID := registerTest(h, t, "owner@example.test", "OWNER")
	other, _ := registerTest(h, t, "other@example.test", "OWNER")
	created := call(h, "POST", "/api/projects", map[string]string{"name": "Home build", "location": "Nairobi", "type": "New build"}, owner)
	if created.Code != 201 {
		t.Fatalf("create status=%d body=%s", created.Code, created.Body.String())
	}
	var body struct {
		Project struct {
			ID      string `json:"id"`
			OwnerID string `json:"ownerId"`
		} `json:"project"`
	}
	_ = json.Unmarshal(created.Body.Bytes(), &body)
	if body.Project.OwnerID != ownerID {
		t.Fatalf("project owner %s != creator %s", body.Project.OwnerID, ownerID)
	}
	var userID, role, status string
	err := db.QueryRow(`SELECT user_id,role,status FROM memberships WHERE project_id=?`, body.Project.ID).Scan(&userID, &role, &status)
	if err != nil || userID != ownerID || role != "OWNER" || status != "ACTIVE" {
		t.Fatalf("owner membership mismatch: %s %s %s err=%v", userID, role, status, err)
	}
	allowed := call(h, "GET", "/api/projects/"+body.Project.ID, nil, owner)
	if allowed.Code != 200 {
		t.Fatalf("owner denied: %d", allowed.Code)
	}
	audit := call(h, "GET", "/api/projects/"+body.Project.ID+"/audit", nil, owner)
	if audit.Code != 200 || !bytes.Contains(audit.Body.Bytes(), []byte("project_created")) {
		t.Fatalf("owner audit access failed: status=%d body=%s", audit.Code, audit.Body.String())
	}
	denied := call(h, "GET", "/api/projects/"+body.Project.ID, nil, other)
	if denied.Code != 404 {
		t.Fatalf("non-member should not see project, status=%d", denied.Code)
	}
	deniedMembers := call(h, "GET", "/api/projects/"+body.Project.ID+"/members", nil, other)
	if deniedMembers.Code != 404 {
		t.Fatalf("non-member should not see members, status=%d", deniedMembers.Code)
	}
	deniedAudit := call(h, "GET", "/api/projects/"+body.Project.ID+"/audit", nil, other)
	if deniedAudit.Code != 404 {
		t.Fatalf("non-member should not see audit history, status=%d", deniedAudit.Code)
	}
}

func TestAuthenticationMiddleware(t *testing.T) {
	_, h := testAPI(t)
	res := call(h, "POST", "/api/projects", map[string]string{"name": "A project", "location": "Nairobi", "type": "Build"}, nil)
	if res.Code != 401 {
		t.Fatalf("unauthenticated project create status=%d", res.Code)
	}
}

func createTestProject(t *testing.T, h http.Handler, cookie *http.Cookie, name string) string {
	t.Helper()
	res := call(h, "POST", "/api/projects", map[string]string{"name": name, "location": "Nairobi", "type": "New build"}, cookie)
	if res.Code != 201 {
		t.Fatalf("create project: status=%d body=%s", res.Code, res.Body.String())
	}
	var body struct {
		Project struct {
			ID string `json:"id"`
		} `json:"project"`
	}
	if err := json.Unmarshal(res.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	return body.Project.ID
}

func inviteAndAccept(t *testing.T, h http.Handler, owner *http.Cookie, projectID, email, role string) *http.Cookie {
	t.Helper()
	invite := call(h, "POST", "/api/projects/"+projectID+"/invitations", map[string]string{"email": email, "role": role}, owner)
	if invite.Code != 201 {
		t.Fatalf("invite %s: status=%d body=%s", role, invite.Code, invite.Body.String())
	}
	var inviteBody struct {
		Token string `json:"token"`
	}
	if err := json.Unmarshal(invite.Body.Bytes(), &inviteBody); err != nil {
		t.Fatal(err)
	}
	cookie, _ := registerTest(h, t, email, role)
	accept := call(h, "POST", "/api/invitations/accept", map[string]string{"token": inviteBody.Token}, cookie)
	if accept.Code != 200 {
		t.Fatalf("accept invitation %s: status=%d body=%s", role, accept.Code, accept.Body.String())
	}
	return cookie
}

func TestWorkspaceEmptyStatesAndRoleFiltering(t *testing.T) {
	_, h := testAPI(t)
	owner, _ := registerTest(h, t, "owner-workspace@example.test", "OWNER")
	outsider, _ := registerTest(h, t, "outsider-workspace@example.test", "OWNER")

	empty := call(h, "GET", "/api/dashboard", nil, owner)
	if empty.Code != 200 || !bytes.Contains(empty.Body.Bytes(), []byte(`"projects":[]`)) {
		t.Fatalf("new dashboard should have no invented projects: status=%d body=%s", empty.Code, empty.Body.String())
	}

	projectID := createTestProject(t, h, owner, "Workspace project")
	workspace := call(h, "GET", "/api/projects/"+projectID+"/workspace", nil, owner)
	if workspace.Code != 200 {
		t.Fatalf("workspace status=%d body=%s", workspace.Code, workspace.Body.String())
	}
	if !bytes.Contains(workspace.Body.Bytes(), []byte(`"tasks":[]`)) {
		t.Errorf("workspace should return an explicit empty task list: %s", workspace.Body.String())
	}
	if denied := call(h, "GET", "/api/projects/"+projectID+"/workspace", nil, outsider); denied.Code != 404 {
		t.Fatalf("non-member workspace access status=%d", denied.Code)
	}

	architect := inviteAndAccept(t, h, owner, projectID, "architect-workspace@example.test", "ARCHITECT")
	architectWorkspace := call(h, "GET", "/api/projects/"+projectID+"/workspace", nil, architect)
	if architectWorkspace.Code != 200 {
		t.Fatalf("architect workspace status=%d body=%s", architectWorkspace.Code, architectWorkspace.Body.String())
	}
	if bytes.Contains(architectWorkspace.Body.Bytes(), []byte(`"budget"`)) {
		t.Error("architect must not receive budget data")
	}
	if !bytes.Contains(architectWorkspace.Body.Bytes(), []byte(`"tasks":[]`)) {
		t.Error("architect should receive the task section")
	}
	deniedBudget := call(h, "POST", "/api/projects/"+projectID+"/budget-items", map[string]any{"category": "Structure", "amountCents": 1000}, architect)
	if deniedBudget.Code != 403 {
		t.Fatalf("architect budget write status=%d", deniedBudget.Code)
	}

	supplier := inviteAndAccept(t, h, owner, projectID, "supplier-workspace@example.test", "SUPPLIER")
	supplierWorkspace := call(h, "GET", "/api/projects/"+projectID+"/workspace", nil, supplier)
	if supplierWorkspace.Code != 200 {
		t.Fatalf("supplier workspace status=%d body=%s", supplierWorkspace.Code, supplierWorkspace.Body.String())
	}
	for _, hidden := range []string{`"budget"`, `"team"`, `"milestones"`, `"activity"`, `"approvals"`, `"issues"`} {
		if bytes.Contains(supplierWorkspace.Body.Bytes(), []byte(hidden)) {
			t.Errorf("supplier workspace leaked %s: %s", hidden, supplierWorkspace.Body.String())
		}
	}
	if bytes.Contains(supplierWorkspace.Body.Bytes(), []byte("owner-workspace@example.test")) {
		t.Error("supplier workspace leaked member emails")
	}
}

func TestWorkspaceRecordsAndDashboardCounts(t *testing.T) {
	_, h := testAPI(t)
	owner, _ := registerTest(h, t, "records-owner@example.test", "OWNER")
	projectID := createTestProject(t, h, owner, "Records project")

	task := call(h, "POST", "/api/projects/"+projectID+"/tasks", map[string]string{"title": "Pour foundation", "status": "TODO"}, owner)
	if task.Code != 201 {
		t.Fatalf("create task status=%d body=%s", task.Code, task.Body.String())
	}
	milestone := call(h, "POST", "/api/projects/"+projectID+"/milestones", map[string]string{"title": "Groundworks", "dueAt": "2026-12-01"}, owner)
	if milestone.Code != 201 {
		t.Fatalf("create milestone status=%d body=%s", milestone.Code, milestone.Body.String())
	}
	budget := call(h, "POST", "/api/projects/"+projectID+"/budget-items", map[string]any{"category": "Structure", "amountCents": 500000}, owner)
	if budget.Code != 201 {
		t.Fatalf("create budget item status=%d body=%s", budget.Code, budget.Body.String())
	}
	expense := call(h, "POST", "/api/projects/"+projectID+"/expenses", map[string]any{"description": "Cement delivery", "amountCents": 120000}, owner)
	if expense.Code != 201 {
		t.Fatalf("create expense status=%d body=%s", expense.Code, expense.Body.String())
	}
	issue := call(h, "POST", "/api/projects/"+projectID+"/issues", map[string]string{"title": "Water on site", "severity": "HIGH"}, owner)
	if issue.Code != 201 {
		t.Fatalf("create issue status=%d body=%s", issue.Code, issue.Body.String())
	}

	workspace := call(h, "GET", "/api/projects/"+projectID+"/workspace", nil, owner)
	for _, expected := range []string{"Pour foundation", "Groundworks", "Structure", "Cement delivery", "Water on site", `"totalBudgetCents":500000`, `"pendingExpenseCents":120000`} {
		if !bytes.Contains(workspace.Body.Bytes(), []byte(expected)) {
			t.Errorf("workspace missing %s: %s", expected, workspace.Body.String())
		}
	}

	dashboard := call(h, "GET", "/api/dashboard", nil, owner)
	for _, expected := range []string{`"openTasks":1`, `"openIssues":1`, `"pendingExpenses":1`, "task_created", "expense_submitted"} {
		if !bytes.Contains(dashboard.Body.Bytes(), []byte(expected)) {
			t.Errorf("dashboard missing %s: %s", expected, dashboard.Body.String())
		}
	}
}

func TestSupplierQuotationIsolation(t *testing.T) {
	_, h := testAPI(t)
	owner, _ := registerTest(h, t, "quotes-owner@example.test", "OWNER")
	projectID := createTestProject(t, h, owner, "Quotation project")
	supplierA := inviteAndAccept(t, h, owner, projectID, "supplier-a@example.test", "SUPPLIER")
	supplierB := inviteAndAccept(t, h, owner, projectID, "supplier-b@example.test", "SUPPLIER")

	quoteA := call(h, "POST", "/api/projects/"+projectID+"/quotations", map[string]any{"item": "Roof trusses", "amountCents": 250000}, supplierA)
	if quoteA.Code != 201 {
		t.Fatalf("supplier A quote status=%d body=%s", quoteA.Code, quoteA.Body.String())
	}
	quoteB := call(h, "POST", "/api/projects/"+projectID+"/quotations", map[string]any{"item": "Roof sheets", "amountCents": 300000}, supplierB)
	if quoteB.Code != 201 {
		t.Fatalf("supplier B quote status=%d body=%s", quoteB.Code, quoteB.Body.String())
	}

	supplierAWorkspace := call(h, "GET", "/api/projects/"+projectID+"/workspace", nil, supplierA)
	if !bytes.Contains(supplierAWorkspace.Body.Bytes(), []byte("Roof trusses")) {
		t.Error("supplier A should see their own quotation")
	}
	if bytes.Contains(supplierAWorkspace.Body.Bytes(), []byte("Roof sheets")) {
		t.Error("supplier A must not see supplier B's quotation")
	}
	ownerWorkspace := call(h, "GET", "/api/projects/"+projectID+"/workspace", nil, owner)
	if !bytes.Contains(ownerWorkspace.Body.Bytes(), []byte("Roof trusses")) || !bytes.Contains(ownerWorkspace.Body.Bytes(), []byte("Roof sheets")) {
		t.Error("owner should see all quotations")
	}
}

func TestDocumentUploadAuthorizationAndStorage(t *testing.T) {
	db, h := testAPI(t)
	owner, _ := registerTest(h, t, "docs-owner@example.test", "OWNER")
	outsider, _ := registerTest(h, t, "docs-outsider@example.test", "OWNER")
	projectID := createTestProject(t, h, owner, "Document project")

	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	_ = writer.WriteField("title", "Site photo")
	_ = writer.WriteField("kind", "PHOTO")
	part, _ := writer.CreateFormFile("file", "site.png")
	_, _ = part.Write([]byte("\x89PNG\r\n\x1a\n not really an image"))
	_ = writer.Close()
	req := httptest.NewRequest("POST", "/api/projects/"+projectID+"/documents", body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	req.AddCookie(owner)
	res := httptest.NewRecorder()
	h.ServeHTTP(res, req)
	if res.Code != 201 {
		t.Fatalf("upload status=%d body=%s", res.Code, res.Body.String())
	}
	var uploaded struct {
		Document struct {
			ID string `json:"id"`
		} `json:"document"`
	}
	if err := json.Unmarshal(res.Body.Bytes(), &uploaded); err != nil {
		t.Fatal(err)
	}
	var storageName string
	if err := db.QueryRow(`SELECT storage_name FROM documents WHERE id=?`, uploaded.Document.ID).Scan(&storageName); err != nil {
		t.Fatal(err)
	}
	if storageName == "" || filepath.Base(storageName) != storageName {
		t.Fatalf("unsafe storage name %q", storageName)
	}
	download := call(h, "GET", "/api/projects/"+projectID+"/documents/"+uploaded.Document.ID+"/download", nil, owner)
	if download.Code != 200 || download.Body.Len() == 0 {
		t.Fatalf("owner download status=%d", download.Code)
	}
	if denied := call(h, "GET", "/api/projects/"+projectID+"/documents/"+uploaded.Document.ID+"/download", nil, outsider); denied.Code != 404 {
		t.Fatalf("outsider download status=%d", denied.Code)
	}
}

func TestApprovalDecisionPermissions(t *testing.T) {
	_, h := testAPI(t)
	owner, _ := registerTest(h, t, "approval-owner@example.test", "OWNER")
	projectID := createTestProject(t, h, owner, "Approval project")
	architect := inviteAndAccept(t, h, owner, projectID, "approval-architect@example.test", "ARCHITECT")

	request := call(h, "POST", "/api/projects/"+projectID+"/approvals", map[string]any{"title": "Change door specification", "kind": "VARIATION"}, architect)
	if request.Code != 201 {
		t.Fatalf("architect request status=%d body=%s", request.Code, request.Body.String())
	}
	var created struct {
		Approval struct {
			ID string `json:"id"`
		} `json:"approval"`
	}
	_ = json.Unmarshal(request.Body.Bytes(), &created)
	denied := call(h, "PATCH", "/api/projects/"+projectID+"/approvals/"+created.Approval.ID, map[string]string{"status": "APPROVED"}, architect)
	if denied.Code != 403 {
		t.Fatalf("architect approval decision status=%d", denied.Code)
	}
	allowed := call(h, "PATCH", "/api/projects/"+projectID+"/approvals/"+created.Approval.ID, map[string]string{"status": "APPROVED"}, owner)
	if allowed.Code != 200 {
		t.Fatalf("owner approval decision status=%d body=%s", allowed.Code, allowed.Body.String())
	}
}
