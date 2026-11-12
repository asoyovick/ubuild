package handler

import (
	"encoding/json"
	"net/http"
	"testing"
)

func publishOpportunity(t *testing.T, h http.Handler, owner *http.Cookie, projectID string) string {
	t.Helper()
	res := call(h, "POST", "/api/projects/"+projectID+"/opportunities", map[string]any{
		"title":             "Foundation package",
		"constructionStage": "FOUNDATION",
		"scope":             "Excavate and cast the foundation to the approved drawings",
		"deliverables":      "Cured slab and inspection report",
		"budgetCents":       800_000,
		"currency":          "KES",
		"deadline":          "2026-12-31",
	}, owner)
	if res.Code != http.StatusCreated {
		t.Fatalf("publish opportunity: status=%d body=%s", res.Code, res.Body.String())
	}
	return dig(t, res, "opportunity", "id")
}

func applyToOpportunity(t *testing.T, h http.Handler, professional *http.Cookie, opportunityID string, fee int64) string {
	t.Helper()
	res := call(h, "POST", "/api/opportunities/"+opportunityID+"/applications", map[string]any{
		"message":          "I have completed comparable foundation packages.",
		"proposedFeeCents": fee,
		"availabilityNote": "Available next week",
	}, professional)
	if res.Code != http.StatusCreated {
		t.Fatalf("apply to opportunity: status=%d body=%s", res.Code, res.Body.String())
	}
	return dig(t, res, "application", "id")
}

func TestMarketplaceToEngagementWorkflow(t *testing.T) {
	db, _ := uBuildAPI(t)
	h := (&API{DB: db, Origin: "http://localhost:3000", UploadDir: t.TempDir(), ProviderSecret: testProviderSecret}).Handler()
	owner, _ := registerTest(h, t, "market-client@example.test", "OWNER")
	professional, professionalID := registerTest(h, t, "market-builder@example.test", "CONTRACTOR")
	if res := call(h, "PUT", "/api/professionals/me", map[string]any{
		"headline": "Foundation contractor", "disciplines": []string{"FOUNDATION", "FRAME"},
		"qualifications": []string{"NCA registered"}, "yearsExperience": 8,
		"location": "Nairobi", "availability": "AVAILABLE", "projectRole": "CONTRACTOR",
	}, professional); res.Code != http.StatusOK {
		t.Fatalf("profile: status=%d body=%s", res.Code, res.Body.String())
	}

	// The project records the brief, budget and stage the marketplace uses.
	created := call(h, "POST", "/api/projects", map[string]any{
		"name": "Market project", "location": "Nairobi", "type": "Residential",
		"scope": "Four bedroom family home", "budgetCents": 9_000_000, "constructionStage": "FOUNDATION",
	}, owner)
	if created.Code != http.StatusCreated {
		t.Fatalf("create project: status=%d body=%s", created.Code, created.Body.String())
	}
	projectID := dig(t, created, "project", "id")

	opportunityID := publishOpportunity(t, h, owner, projectID)

	// A professional can discover the open opportunity.
	open := call(h, "GET", "/api/opportunities?stage=FOUNDATION&q=foundation", nil, professional)
	if open.Code != http.StatusOK || !bytesContains(open.Body.Bytes(), opportunityID) {
		t.Fatalf("open opportunities: status=%d body=%s", open.Code, open.Body.String())
	}

	applicationID := applyToOpportunity(t, h, professional, opportunityID, 750_000)

	// The client sees the application and can shortlist it.
	if res := call(h, "POST", "/api/projects/"+projectID+"/applications/"+applicationID+"/decide",
		map[string]any{"status": "SHORTLISTED"}, owner); res.Code != http.StatusOK {
		t.Fatalf("shortlist: status=%d body=%s", res.Code, res.Body.String())
	}

	selected := call(h, "POST", "/api/projects/"+projectID+"/applications/"+applicationID+"/select", nil, owner)
	if selected.Code != http.StatusCreated {
		t.Fatalf("select application: status=%d body=%s", selected.Code, selected.Body.String())
	}
	engagementID := dig(t, selected, "engagement", "id")
	stage := dig(t, selected, "engagement", "constructionStage")
	if stage != "FOUNDATION" {
		t.Fatalf("engagement stage = %q, want FOUNDATION", stage)
	}

	// Selection only proposes the engagement. The professional is not a
	// project member and cannot read the workspace until it is approved.
	if res := call(h, "GET", "/api/projects/"+projectID+"/workspace", nil, professional); res.Code != http.StatusNotFound {
		t.Fatalf("pending engagement granted workspace access: status=%d", res.Code)
	}

	if res := call(h, "POST", "/api/projects/"+projectID+"/engagements/"+engagementID+"/approve", nil, owner); res.Code != http.StatusOK {
		t.Fatalf("approve engagement: status=%d body=%s", res.Code, res.Body.String())
	}

	// Approval makes the same user an active project member with a
	// professional role and access to the shared workspace.
	workspace := call(h, "GET", "/api/projects/"+projectID+"/workspace", nil, professional)
	if workspace.Code != http.StatusOK {
		t.Fatalf("approved professional workspace: status=%d body=%s", workspace.Code, workspace.Body.String())
	}
	if !bytesContains(workspace.Body.Bytes(), `"role":"CONTRACTOR"`) {
		t.Fatalf("professional membership role missing: %s", workspace.Body.String())
	}
	var membershipRole string
	if err := db.QueryRow(`SELECT role FROM memberships WHERE project_id=$1 AND user_id=$2 AND status='ACTIVE'`, projectID, professionalID).Scan(&membershipRole); err != nil {
		t.Fatalf("membership not created: %v", err)
	}
	if membershipRole == "OWNER" {
		t.Fatal("an engaged professional must never become the project owner")
	}

	// The same project, engagement and stage records are used by the
	// professional's financial view.
	if res := call(h, "POST", "/api/projects/"+projectID+"/payment-requests", map[string]any{
		"engagementId": engagementID, "description": "Foundation complete",
		"amountCents": 300_000, "deliverableIds": []string{"slab-inspection"},
	}, professional); res.Code != http.StatusCreated {
		t.Fatalf("payment request: status=%d body=%s", res.Code, res.Body.String())
	}
	financials := call(h, "GET", "/api/projects/"+projectID+"/financials/me", nil, professional)
	if financials.Code != http.StatusOK {
		t.Fatalf("professional financials: status=%d body=%s", financials.Code, financials.Body.String())
	}
	if !bytesContains(financials.Body.Bytes(), engagementID) {
		t.Fatalf("professional financial view is missing the engagement: %s", financials.Body.String())
	}

	// The client sees only opportunities on the same project.
	list := call(h, "GET", "/api/projects/"+projectID+"/opportunities", nil, owner)
	if list.Code != http.StatusOK || !bytesContains(list.Body.Bytes(), opportunityID) {
		t.Fatalf("project opportunities: status=%d body=%s", list.Code, list.Body.String())
	}
}

func TestFundsAllocationAndProjectStageTracking(t *testing.T) {
	_, h := uBuildAPI(t)
	owner, _ := registerTest(h, t, "allocator@example.test", "OWNER")
	created := call(h, "POST", "/api/projects", map[string]any{
		"name": "Allocation project", "location": "Nairobi", "type": "Residential",
		"scope": "Apartment block", "budgetCents": 5_000_000, "constructionStage": "DESIGN",
	}, owner)
	if created.Code != http.StatusCreated {
		t.Fatalf("create project: status=%d body=%s", created.Code, created.Body.String())
	}
	projectID := dig(t, created, "project", "id")

	updated := call(h, "PATCH", "/api/projects/"+projectID, map[string]any{"constructionStage": "FOUNDATION", "scope": "Apartment block, phase one"}, owner)
	if updated.Code != http.StatusOK {
		t.Fatalf("update project: status=%d body=%s", updated.Code, updated.Body.String())
	}
	if !bytesContains(updated.Body.Bytes(), `"constructionStage":"FOUNDATION"`) {
		t.Fatalf("stage not updated: %s", updated.Body.String())
	}

	configureProvider(t, h, owner, projectID)
	openFunds(t, h, owner, projectID)
	reference := deposit(t, h, owner, projectID, 1_000_000)

	// An allocation cannot exceed the provider-confirmed balance.
	if res := call(h, "POST", "/api/projects/"+projectID+"/funds/allocate",
		map[string]any{"amountCents": 1_500_000, "stage": "FOUNDATION"}, owner); res.Code != http.StatusConflict {
		t.Fatalf("allocation beyond confirmed balance: status=%d body=%s", res.Code, res.Body.String())
	}
	if res := confirmProvider(t, h, reference, "SUCCEEDED", testProviderSecret); res.Code != http.StatusOK {
		t.Fatalf("confirm deposit: status=%d body=%s", res.Code, res.Body.String())
	}

	allocated := call(h, "POST", "/api/projects/"+projectID+"/funds/allocate",
		map[string]any{"amountCents": 400_000, "stage": "FOUNDATION", "note": "Foundation earmark"}, owner)
	if allocated.Code != http.StatusCreated {
		t.Fatalf("allocate: status=%d body=%s", allocated.Code, allocated.Body.String())
	}
	allocationID := dig(t, allocated, "allocation", "id")

	list := call(h, "GET", "/api/projects/"+projectID+"/allocations", nil, owner)
	if list.Code != http.StatusOK || !bytesContains(list.Body.Bytes(), allocationID) {
		t.Fatalf("list allocations: status=%d body=%s", list.Code, list.Body.String())
	}
	funds := call(h, "GET", "/api/projects/"+projectID+"/funds", nil, owner)
	if !bytesContains(funds.Body.Bytes(), `"allocatedCents":400000`) {
		t.Fatalf("allocated amount not reflected: %s", funds.Body.String())
	}
	// An earmark never moves money.
	if !bytesContains(funds.Body.Bytes(), `"balanceCents":1000000`) {
		t.Fatalf("allocation changed the confirmed balance: %s", funds.Body.String())
	}

	cancelled := call(h, "POST", "/api/projects/"+projectID+"/allocations/"+allocationID+"/cancel", nil, owner)
	if cancelled.Code != http.StatusOK {
		t.Fatalf("cancel allocation: status=%d body=%s", cancelled.Code, cancelled.Body.String())
	}
	funds = call(h, "GET", "/api/projects/"+projectID+"/funds", nil, owner)
	if !bytesContains(funds.Body.Bytes(), `"allocatedCents":0`) {
		t.Fatalf("allocation not released after cancellation: %s", funds.Body.String())
	}
}

func TestMessagesAndFinancialVisibilityAcrossTheSameRecords(t *testing.T) {
	db, h, owner, professional, professionalID, projectID := uBuildFixture(t)
	_ = db
	engagementID := createEngagement(t, h, owner, projectID, professionalID, 200_000)
	approveEngagement(t, h, owner, projectID, engagementID)

	posted := call(h, "POST", "/api/projects/"+projectID+"/messages",
		map[string]any{"body": "The slab is ready for inspection.", "engagementId": engagementID}, professional)
	if posted.Code != http.StatusCreated {
		t.Fatalf("post message: status=%d body=%s", posted.Code, posted.Body.String())
	}
	read := call(h, "GET", "/api/projects/"+projectID+"/messages", nil, owner)
	if read.Code != http.StatusOK || !bytesContains(read.Body.Bytes(), "ready for inspection") {
		t.Fatalf("client reading message: status=%d body=%s", read.Code, read.Body.String())
	}

	outsider, _ := registerTest(h, t, "message-outsider@example.test", "OWNER")
	if res := call(h, "GET", "/api/projects/"+projectID+"/messages", nil, outsider); res.Code != http.StatusNotFound {
		t.Fatalf("outsider reading messages: status=%d body=%s", res.Code, res.Body.String())
	}

	// The professional cannot read the project-wide ledger, only their own
	// financial records.
	if res := call(h, "GET", "/api/projects/"+projectID+"/ledger", nil, professional); res.Code != http.StatusForbidden && res.Code != http.StatusNotFound {
		t.Fatalf("professional reading the ledger: status=%d body=%s", res.Code, res.Body.String())
	}
}

func TestPaymentRevisionLoopKeepsTheAgreedCap(t *testing.T) {
	_, h, owner, professional, professionalID, projectID := uBuildFixture(t)
	engagementID := createEngagement(t, h, owner, projectID, professionalID, 500_000)
	approveEngagement(t, h, owner, projectID, engagementID)

	res := requestPayment(t, h, professional, projectID, engagementID, 300_000)
	if res.Code != http.StatusCreated {
		t.Fatalf("payment request: status=%d body=%s", res.Code, res.Body.String())
	}
	requestID := dig(t, res, "paymentRequest", "id")

	if res := call(h, "POST", "/api/projects/"+projectID+"/payment-requests/"+requestID+"/revisions",
		map[string]any{"note": "Add the inspection report"}, owner); res.Code != http.StatusOK {
		t.Fatalf("request revisions: status=%d body=%s", res.Code, res.Body.String())
	}
	if res := call(h, "POST", "/api/projects/"+projectID+"/payment-requests/"+requestID+"/resubmit",
		map[string]any{"description": "Foundation with inspection", "amountCents": 600_000,
			"deliverableIds": []string{"slab", "inspection"}}, professional); res.Code != http.StatusConflict {
		t.Fatalf("resubmit beyond agreed terms: status=%d body=%s", res.Code, res.Body.String())
	}
	resubmitted := call(h, "POST", "/api/projects/"+projectID+"/payment-requests/"+requestID+"/resubmit",
		map[string]any{"description": "Foundation with inspection", "amountCents": 500_000,
			"deliverableIds": []string{"slab", "inspection"}}, professional)
	if resubmitted.Code != http.StatusOK {
		t.Fatalf("resubmit: status=%d body=%s", resubmitted.Code, resubmitted.Body.String())
	}
	if status := dig(t, resubmitted, "paymentRequest", "status"); status != "SUBMITTED" {
		t.Fatalf("resubmitted status = %q, want SUBMITTED", status)
	}

	// Only client authorization plus provider confirmation completes it.
	authorized := call(h, "POST", "/api/projects/"+projectID+"/payment-requests/"+requestID+"/authorize",
		map[string]any{"note": "Work verified"}, owner)
	if authorized.Code != http.StatusAccepted {
		t.Fatalf("authorize: status=%d body=%s", authorized.Code, authorized.Body.String())
	}
	reference := dig(t, authorized, "ledgerEntry", "providerReference")
	if res := confirmProvider(t, h, reference, "SUCCEEDED", testProviderSecret); res.Code != http.StatusOK {
		t.Fatalf("confirm: status=%d body=%s", res.Code, res.Body.String())
	}

	audit := call(h, "GET", "/api/projects/"+projectID+"/audit", nil, owner)
	for _, action := range []string{"payment_revisions_requested", "payment_request_resubmitted", "payment_authorized", "provider_payment_confirmed"} {
		if !bytesContains(audit.Body.Bytes(), action) {
			t.Errorf("audit trail is missing %q", action)
		}
	}
}

func TestRecommendationsForProjectExcludeEngagedProfessionals(t *testing.T) {
	db, h, owner, professional, professionalID, projectID := uBuildFixture(t)
	_ = db
	_ = professional
	if res := call(h, "PATCH", "/api/projects/"+projectID, map[string]any{"scope": "Foundation and slab", "constructionStage": "FOUNDATION"}, owner); res.Code != http.StatusOK {
		t.Fatalf("set project scope: status=%d body=%s", res.Code, res.Body.String())
	}

	first := call(h, "GET", "/api/projects/"+projectID+"/recommendations?stage=FOUNDATION", nil, owner)
	if first.Code != http.StatusOK || !bytesContains(first.Body.Bytes(), professionalID) {
		t.Fatalf("project recommendation: status=%d body=%s", first.Code, first.Body.String())
	}

	engagementID := createEngagement(t, h, owner, projectID, professionalID, 250_000)
	approveEngagement(t, h, owner, projectID, engagementID)

	after := call(h, "GET", "/api/projects/"+projectID+"/recommendations?stage=FOUNDATION", nil, owner)
	if after.Code != http.StatusOK {
		t.Fatalf("recommendation after engagement: status=%d body=%s", after.Code, after.Body.String())
	}
	var body struct {
		Recommendations []struct {
			Professional struct {
				UserID string `json:"userId"`
			} `json:"professional"`
		} `json:"recommendations"`
	}
	if err := json.Unmarshal(after.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	for _, recommendation := range body.Recommendations {
		if recommendation.Professional.UserID == professionalID {
			t.Fatal("an already engaged professional was recommended again")
		}
	}
}
