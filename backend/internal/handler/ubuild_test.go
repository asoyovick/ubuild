package handler

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"testing"

	"github.com/ubuild/backend/internal/repository"
)

const testProviderSecret = "test-provider-secret"

func bytesReader(data []byte) io.Reader { return bytes.NewReader(data) }

func bytesContains(haystack []byte, needle string) bool {
	return bytes.Contains(haystack, []byte(needle))
}

func uBuildAPI(t *testing.T) (*sql.DB, http.Handler) {
	t.Helper()
	db, err := repository.Open(filepath.Join(t.TempDir(), "test.db"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { db.Close() })
	api := &API{DB: db, Origin: "http://localhost:3000", UploadDir: filepath.Join(t.TempDir(), "uploads"), ProviderSecret: testProviderSecret}
	return db, api.Handler()
}

// dig walks a JSON response and returns the string at the given path.
func dig(t *testing.T, res *httptest.ResponseRecorder, path ...string) string {
	t.Helper()
	var body any
	if err := json.Unmarshal(res.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode %s: %v", res.Body.String(), err)
	}
	current := body
	for _, key := range path {
		object, ok := current.(map[string]any)
		if !ok {
			t.Fatalf("path %v not found in %s", path, res.Body.String())
		}
		current = object[key]
	}
	value, ok := current.(string)
	if !ok {
		t.Fatalf("path %v is not a string in %s", path, res.Body.String())
	}
	return value
}

func configureProvider(t *testing.T, h http.Handler, owner *http.Cookie, projectID string) {
	t.Helper()
	res := call(h, "PUT", "/api/projects/"+projectID+"/provider", map[string]string{
		"arrangement": "A", "name": "Test Bank", "displayAccount": "**** 4242",
	}, owner)
	if res.Code != 200 {
		t.Fatalf("configure provider: status=%d body=%s", res.Code, res.Body.String())
	}
}

func openFunds(t *testing.T, h http.Handler, owner *http.Cookie, projectID string) {
	t.Helper()
	res := call(h, "POST", "/api/projects/"+projectID+"/funds", map[string]string{"source": "Test Bank **** 4242"}, owner)
	if res.Code != 201 {
		t.Fatalf("open funds account: status=%d body=%s", res.Code, res.Body.String())
	}
}

func deposit(t *testing.T, h http.Handler, owner *http.Cookie, projectID string, amount int64) string {
	t.Helper()
	res := call(h, "POST", "/api/projects/"+projectID+"/deposits", map[string]any{"amountCents": amount}, owner)
	if res.Code != http.StatusAccepted {
		t.Fatalf("deposit: status=%d body=%s", res.Code, res.Body.String())
	}
	return dig(t, res, "entry", "providerReference")
}

func confirmProvider(t *testing.T, h http.Handler, reference, outcome string, secret string) *httptest.ResponseRecorder {
	t.Helper()
	data, _ := json.Marshal(map[string]string{"reference": reference, "outcome": outcome, "providerReference": "provider-tx-1"})
	req := httptest.NewRequest("POST", "/api/provider/transactions", bytesReader(data))
	req.Header.Set("Content-Type", "application/json")
	if secret != "" {
		req.Header.Set("X-UBuild-Provider-Secret", secret)
	}
	res := httptest.NewRecorder()
	h.ServeHTTP(res, req)
	return res
}

func createEngagement(t *testing.T, h http.Handler, owner *http.Cookie, projectID, professionalID string, feeCents int64) string {
	t.Helper()
	res := call(h, "POST", "/api/projects/"+projectID+"/engagements", map[string]any{
		"professionalId": professionalID,
		"scope":          "Build the foundation to the approved drawings",
		"deliverables":   "Screed, cured slab, inspection report",
		"timeline":       "Six weeks from mobilization",
		"feeCents":       feeCents,
		"currency":       "KES",
	}, owner)
	if res.Code != 201 {
		t.Fatalf("create engagement: status=%d body=%s", res.Code, res.Body.String())
	}
	return dig(t, res, "engagement", "id")
}

func approveEngagement(t *testing.T, h http.Handler, owner *http.Cookie, projectID, engagementID string) {
	t.Helper()
	res := call(h, "POST", "/api/projects/"+projectID+"/engagements/"+engagementID+"/approve", nil, owner)
	if res.Code != 200 {
		t.Fatalf("approve engagement: status=%d body=%s", res.Code, res.Body.String())
	}
}

func requestPayment(t *testing.T, h http.Handler, professional *http.Cookie, projectID, engagementID string, amount int64) *httptest.ResponseRecorder {
	t.Helper()
	return call(h, "POST", "/api/projects/"+projectID+"/payment-requests", map[string]any{
		"engagementId":   engagementID,
		"description":    "Foundation complete",
		"amountCents":    amount,
		"deliverableIds": []string{"deliverable-slab", "deliverable-inspection"},
	}, professional)
}

// uBuildFixture builds a project with an owner, an engaged professional and a
// funded project account. The deposit is confirmed by the provider.
func uBuildFixture(t *testing.T) (*sql.DB, http.Handler, *http.Cookie, *http.Cookie, string, string) {
	t.Helper()
	db, h := uBuildAPI(t)
	owner, _ := registerTest(h, t, "client@example.test", "OWNER")
	professional, professionalID := registerTest(h, t, "builder@example.test", "CONTRACTOR")
	profile := call(h, "PUT", "/api/professionals/me", map[string]any{
		"headline":        "Foundation and structural contractor",
		"disciplines":     []string{"FOUNDATION", "FRAME"},
		"qualifications":  []string{"NCA registered contractor"},
		"yearsExperience": 9,
		"location":        "Nairobi",
		"availability":    "AVAILABLE",
	}, professional)
	if profile.Code != 200 {
		t.Fatalf("save professional profile: status=%d body=%s", profile.Code, profile.Body.String())
	}
	projectID := createTestProject(t, h, owner, "Riverside house")
	configureProvider(t, h, owner, projectID)
	openFunds(t, h, owner, projectID)
	reference := deposit(t, h, owner, projectID, 2_000_000)
	if res := confirmProvider(t, h, reference, "SUCCEEDED", testProviderSecret); res.Code != 200 {
		t.Fatalf("confirm deposit: status=%d body=%s", res.Code, res.Body.String())
	}
	return db, h, owner, professional, professionalID, projectID
}

func TestPaymentRequiresApprovedEngagementAndAgreedTerms(t *testing.T) {
	_, h, owner, professional, professionalID, projectID := uBuildFixture(t)
	engagementID := createEngagement(t, h, owner, projectID, professionalID, 1_000_000)

	// The engagement is only proposed, so it is not yet a valid UBuild
	// engagement for payment purposes.
	if res := requestPayment(t, h, professional, projectID, engagementID, 200_000); res.Code != http.StatusConflict {
		t.Fatalf("payment request against a pending engagement: status=%d body=%s", res.Code, res.Body.String())
	}

	approveEngagement(t, h, owner, projectID, engagementID)
	first := requestPayment(t, h, professional, projectID, engagementID, 400_000)
	if first.Code != 201 {
		t.Fatalf("payment request within terms: status=%d body=%s", first.Code, first.Body.String())
	}
	firstID := dig(t, first, "paymentRequest", "id")

	// A second open request on the same engagement would let one professional
	// stack obligations against the same agreed fee.
	if res := requestPayment(t, h, professional, projectID, engagementID, 100_000); res.Code != http.StatusConflict {
		t.Fatalf("second open request: status=%d body=%s", res.Code, res.Body.String())
	}

	if res := call(h, "POST", "/api/projects/"+projectID+"/payment-requests/"+firstID+"/reject",
		map[string]string{"note": "Inspection report is missing"}, owner); res.Code != 200 {
		t.Fatalf("reject: status=%d body=%s", res.Code, res.Body.String())
	}

	// 1,000,000 is agreed, so 1,200,000 is refused without a variation.
	if res := requestPayment(t, h, professional, projectID, engagementID, 1_200_000); res.Code != http.StatusConflict {
		t.Fatalf("request beyond agreed terms: status=%d body=%s", res.Code, res.Body.String())
	}

	variation := call(h, "POST", "/api/projects/"+projectID+"/engagements/"+engagementID+"/variations",
		map[string]any{"scope": "Add a retaining wall", "feeCents": 500_000}, professional)
	if variation.Code != 201 {
		t.Fatalf("create variation: status=%d body=%s", variation.Code, variation.Body.String())
	}
	variationID := dig(t, variation, "variation", "id")

	// The variation is only proposed: the cap has not moved yet.
	if res := requestPayment(t, h, professional, projectID, engagementID, 1_200_000); res.Code != http.StatusConflict {
		t.Fatalf("request beyond terms before variation approval: status=%d body=%s", res.Code, res.Body.String())
	}

	decided := call(h, "POST", "/api/projects/"+projectID+"/variations/"+variationID+"/decide",
		map[string]any{"approve": true}, owner)
	if decided.Code != 200 {
		t.Fatalf("approve variation: status=%d body=%s", decided.Code, decided.Body.String())
	}

	if res := requestPayment(t, h, professional, projectID, engagementID, 1_450_000); res.Code != 201 {
		t.Fatalf("request within varied terms: status=%d body=%s", res.Code, res.Body.String())
	}

	audit := call(h, "GET", "/api/projects/"+projectID+"/audit", nil, owner)
	for _, action := range []string{"engagement_approved", "variation_requested", "variation_approved", "payment_requested", "payment_rejected"} {
		if !bytesContains(audit.Body.Bytes(), action) {
			t.Errorf("audit trail is missing %q", action)
		}
	}
}

func TestReleaseNeedsExplicitClientAuthorizationAndProviderConfirmation(t *testing.T) {
	db, h, owner, professional, professionalID, projectID := uBuildFixture(t)
	engagementID := createEngagement(t, h, owner, projectID, professionalID, 400_000)
	approveEngagement(t, h, owner, projectID, engagementID)

	res := requestPayment(t, h, professional, projectID, engagementID, 400_000)
	if res.Code != 201 {
		t.Fatalf("payment request: status=%d body=%s", res.Code, res.Body.String())
	}
	requestID := dig(t, res, "paymentRequest", "id")

	// The professional can never authorize their own payment: one refusal is
	// that they hold no client role on the project, and the service also
	// refuses an instruction from the professional's account.
	if self := call(h, "POST", "/api/projects/"+projectID+"/payment-requests/"+requestID+"/authorize", nil, professional); self.Code != http.StatusForbidden && self.Code != http.StatusNotFound {
		t.Fatalf("professional authorizing own payment: status=%d body=%s", self.Code, self.Body.String())
	}
	// A client cannot engage themselves either, so the two roles can never
	// collapse into one account.
	if selfDeal := call(h, "POST", "/api/projects/"+projectID+"/engagements", map[string]any{
		"professionalId": dig(t, call(h, "GET", "/api/auth/me", nil, owner), "user", "id"),
		"scope":          "Self engagement", "timeline": "One week", "feeCents": 1000,
	}, owner); selfDeal.Code != http.StatusUnprocessableEntity {
		t.Fatalf("self engagement: status=%d body=%s", selfDeal.Code, selfDeal.Body.String())
	}

	authorized := call(h, "POST", "/api/projects/"+projectID+"/payment-requests/"+requestID+"/authorize",
		map[string]string{"note": "Slab inspected and accepted"}, owner)
	if authorized.Code != http.StatusAccepted {
		t.Fatalf("authorize: status=%d body=%s", authorized.Code, authorized.Body.String())
	}
	if status := dig(t, authorized, "paymentRequest", "status"); status != "AUTHORIZED" {
		t.Fatalf("a client authorization must not complete the payment, got %q", status)
	}
	reference := dig(t, authorized, "ledgerEntry", "providerReference")
	if status := dig(t, authorized, "ledgerEntry", "status"); status != "PENDING_CONFIRMATION" {
		t.Fatalf("ledger entry must await the provider, got %q", status)
	}

	// Completion cannot run ahead of the money.
	if complete := call(h, "POST", "/api/projects/"+projectID+"/engagements/"+engagementID+"/complete", nil, owner); complete.Code != http.StatusConflict {
		t.Fatalf("completing an unpaid engagement: status=%d body=%s", complete.Code, complete.Body.String())
	}

	// The provider intake must reject an unauthenticated caller.
	if res := confirmProvider(t, h, reference, "SUCCEEDED", ""); res.Code != http.StatusUnauthorized {
		t.Fatalf("unauthenticated provider callback: status=%d body=%s", res.Code, res.Body.String())
	}

	confirmed := confirmProvider(t, h, reference, "SUCCEEDED", testProviderSecret)
	if confirmed.Code != 200 {
		t.Fatalf("provider confirmation: status=%d body=%s", confirmed.Code, confirmed.Body.String())
	}
	if status := dig(t, confirmed, "ledgerEntry", "status"); status != "POSTED" {
		t.Fatalf("confirmed ledger entry status=%q", status)
	}

	request := call(h, "GET", "/api/projects/"+projectID+"/payment-requests", nil, owner)
	if !bytesContains(request.Body.Bytes(), `"status":"PAID"`) {
		t.Fatalf("payment should be paid only after confirmation: %s", request.Body.String())
	}

	complete := call(h, "POST", "/api/projects/"+projectID+"/engagements/"+engagementID+"/complete", nil, owner)
	if complete.Code != 200 {
		t.Fatalf("complete engagement: status=%d body=%s", complete.Code, complete.Body.String())
	}

	rated := call(h, "POST", "/api/projects/"+projectID+"/engagements/"+engagementID+"/ratings",
		map[string]any{"score": 5, "comment": "Clear reporting and on schedule"}, owner)
	if rated.Code != 201 {
		t.Fatalf("rate completed engagement: status=%d body=%s", rated.Code, rated.Body.String())
	}
	if again := call(h, "POST", "/api/projects/"+projectID+"/engagements/"+engagementID+"/ratings",
		map[string]any{"score": 4}, owner); again.Code != http.StatusConflict {
		t.Fatalf("double rating: status=%d body=%s", again.Code, again.Body.String())
	}

	var posted int
	if err := db.QueryRow(`SELECT COUNT(*) FROM financial_ledger WHERE status='POSTED' AND entry_type='RELEASE'`).Scan(&posted); err != nil {
		t.Fatal(err)
	}
	if posted != 1 {
		t.Fatalf("expected exactly one posted release, got %d", posted)
	}
}

func TestFinancialActionsAreLimitedToTheClient(t *testing.T) {
	_, h, owner, professional, professionalID, projectID := uBuildFixture(t)
	engagementID := createEngagement(t, h, owner, projectID, professionalID, 300_000)
	approveEngagement(t, h, owner, projectID, engagementID)
	res := requestPayment(t, h, professional, projectID, engagementID, 300_000)
	if res.Code != 201 {
		t.Fatalf("payment request: status=%d body=%s", res.Code, res.Body.String())
	}
	requestID := dig(t, res, "paymentRequest", "id")

	architect := inviteAndAccept(t, h, owner, projectID, "architect-finance@example.test", "ARCHITECT")
	for _, path := range []string{"/ledger", "/funds", "/provider"} {
		if denied := call(h, "GET", "/api/projects/"+projectID+path, nil, architect); denied.Code != http.StatusForbidden {
			t.Errorf("architect reading %s: status=%d body=%s", path, denied.Code, denied.Body.String())
		}
	}
	if denied := call(h, "GET", "/api/projects/"+projectID+"/payment-requests", nil, architect); denied.Code != http.StatusForbidden {
		t.Errorf("architect listing payment requests: status=%d", denied.Code)
	}
	if denied := call(h, "POST", "/api/projects/"+projectID+"/payment-requests/"+requestID+"/authorize", nil, architect); denied.Code != http.StatusForbidden {
		t.Errorf("architect authorizing payment: status=%d", denied.Code)
	}
	if denied := call(h, "POST", "/api/projects/"+projectID+"/deposits", map[string]any{"amountCents": 1000}, architect); denied.Code != http.StatusForbidden {
		t.Errorf("architect depositing funds: status=%d", denied.Code)
	}
	if denied := call(h, "POST", "/api/projects/"+projectID+"/engagements", map[string]any{
		"professionalId": professionalID, "scope": "Extra work", "timeline": "One week", "feeCents": 1000,
	}, architect); denied.Code != http.StatusForbidden {
		t.Errorf("architect creating an engagement: status=%d", denied.Code)
	}

	outsider, _ := registerTest(h, t, "outsider-finance@example.test", "OWNER")
	if denied := call(h, "GET", "/api/projects/"+projectID+"/payment-requests", nil, outsider); denied.Code != http.StatusNotFound {
		t.Errorf("outsider listing payment requests: status=%d", denied.Code)
	}
	if denied := call(h, "GET", "/api/projects/"+projectID+"/ledger", nil, outsider); denied.Code != http.StatusNotFound {
		t.Errorf("outsider reading the ledger: status=%d", denied.Code)
	}
}

func TestOrderingMoneyWithoutProviderConfirmationDoesNotMoveIt(t *testing.T) {
	_, h := uBuildAPI(t)
	owner, _ := registerTest(h, t, "depositor@example.test", "OWNER")
	professional, professionalID := registerTest(h, t, "carpenter@example.test", "CONTRACTOR")
	if res := call(h, "PUT", "/api/professionals/me", map[string]any{
		"headline": "Carpentry and roofing", "disciplines": []string{"ROOFING"}, "yearsExperience": 4,
	}, professional); res.Code != 200 {
		t.Fatalf("profile: status=%d body=%s", res.Code, res.Body.String())
	}
	projectID := createTestProject(t, h, owner, "Deposit project")
	configureProvider(t, h, owner, projectID)
	openFunds(t, h, owner, projectID)

	// An unconfirmed deposit must not be spendable.
	reference := deposit(t, h, owner, projectID, 500_000)
	funds := call(h, "GET", "/api/projects/"+projectID+"/funds", nil, owner)
	if !bytesContains(funds.Body.Bytes(), `"balanceCents":0`) {
		t.Fatalf("unconfirmed deposit changed the balance: %s", funds.Body.String())
	}

	engagementID := createEngagement(t, h, owner, projectID, professionalID, 500_000)
	approveEngagement(t, h, owner, projectID, engagementID)
	res := requestPayment(t, h, professional, projectID, engagementID, 500_000)
	if res.Code != 201 {
		t.Fatalf("payment request: status=%d body=%s", res.Code, res.Body.String())
	}
	requestID := dig(t, res, "paymentRequest", "id")
	if authorized := call(h, "POST", "/api/projects/"+projectID+"/payment-requests/"+requestID+"/authorize", nil, owner); authorized.Code != http.StatusConflict {
		t.Fatalf("authorizing without funds: status=%d body=%s", authorized.Code, authorized.Body.String())
	}

	if confirmed := confirmProvider(t, h, reference, "SUCCEEDED", testProviderSecret); confirmed.Code != 200 {
		t.Fatalf("confirm deposit: status=%d body=%s", confirmed.Code, confirmed.Body.String())
	}
	funds = call(h, "GET", "/api/projects/"+projectID+"/funds", nil, owner)
	if !bytesContains(funds.Body.Bytes(), `"balanceCents":500000`) {
		t.Fatalf("confirmed deposit not reflected: %s", funds.Body.String())
	}

	authorized := call(h, "POST", "/api/projects/"+projectID+"/payment-requests/"+requestID+"/authorize", nil, owner)
	if authorized.Code != http.StatusAccepted {
		t.Fatalf("authorize after funding: status=%d body=%s", authorized.Code, authorized.Body.String())
	}
	if confirmed := confirmProvider(t, h, dig(t, authorized, "ledgerEntry", "providerReference"), "SUCCEEDED", testProviderSecret); confirmed.Code != 200 {
		t.Fatalf("confirm release: status=%d body=%s", confirmed.Code, confirmed.Body.String())
	}
	ledger := call(h, "GET", "/api/projects/"+projectID+"/ledger", nil, owner)
	if !bytesContains(ledger.Body.Bytes(), `"entryType":"RELEASE"`) || !bytesContains(ledger.Body.Bytes(), `"entryType":"DEPOSIT"`) {
		t.Fatalf("ledger is missing an entry: %s", ledger.Body.String())
	}
}

func TestRecommendationsAndRatingsCannotBypassPlatformRecords(t *testing.T) {
	db, h, owner, professional, professionalID, projectID := uBuildFixture(t)

	// Publishing the profile again updates it in place instead of failing.
	update := call(h, "PUT", "/api/professionals/me", map[string]any{
		"headline":        "Foundation, frame and roofing contractor",
		"disciplines":     []string{"FOUNDATION", "FRAME", "ROOFING"},
		"yearsExperience": 10,
		"availability":    "LIMITED",
	}, professional)
	if update.Code != 200 || !bytesContains(update.Body.Bytes(), "Foundation, frame and roofing contractor") {
		t.Fatalf("update professional profile: status=%d body=%s", update.Code, update.Body.String())
	}

	// Recommendations are advisory and must not create financial records.
	res := call(h, "GET", "/api/professionals/recommendations?stage=FOUNDATION&scope=foundation+and+slab", nil, owner)
	if res.Code != 200 || !bytesContains(res.Body.Bytes(), professionalID) {
		t.Fatalf("recommendation: status=%d body=%s", res.Code, res.Body.String())
	}
	var engagements, requests, releases int
	if err := db.QueryRow(`SELECT COUNT(*) FROM engagements`).Scan(&engagements); err != nil {
		t.Fatal(err)
	}
	if err := db.QueryRow(`SELECT COUNT(*) FROM payment_requests`).Scan(&requests); err != nil {
		t.Fatal(err)
	}
	if err := db.QueryRow(`SELECT COUNT(*) FROM financial_ledger WHERE entry_type='RELEASE'`).Scan(&releases); err != nil {
		t.Fatal(err)
	}
	if engagements != 0 || requests != 0 || releases != 0 {
		t.Fatalf("a recommendation created records: engagements=%d requests=%d releases=%d", engagements, requests, releases)
	}

	// A rating cannot be attached to an engagement that is not completed.
	engagementID := createEngagement(t, h, owner, projectID, professionalID, 100_000)
	approveEngagement(t, h, owner, projectID, engagementID)
	if rated := call(h, "POST", "/api/projects/"+projectID+"/engagements/"+engagementID+"/ratings",
		map[string]any{"score": 5}, owner); rated.Code != http.StatusConflict {
		t.Fatalf("rating an incomplete engagement: status=%d body=%s", rated.Code, rated.Body.String())
	}

	// A client cannot rate work recorded on someone else's engagement.
	other, _ := registerTest(h, t, "other-client@example.test", "OWNER")
	otherProject := createTestProject(t, h, other, "Other site")
	otherEngagement := createEngagement(t, h, other, otherProject, professionalID, 100_000)
	approveEngagement(t, h, other, otherProject, otherEngagement)
	if awarded := call(h, "POST", "/api/projects/"+otherProject+"/engagements/"+otherEngagement+"/ratings",
		map[string]any{"score": 5}, owner); awarded.Code == 201 {
		t.Fatal("an unrelated client rated work they were not party to")
	}
}

func TestProviderIntakeIsDisabledWithoutASecret(t *testing.T) {
	db, err := repository.Open(filepath.Join(t.TempDir(), "test.db"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { db.Close() })
	h := (&API{DB: db, Origin: "http://localhost:3000", UploadDir: t.TempDir()}).Handler()
	if res := confirmProvider(t, h, "ub-rel-does-not-exist", "SUCCEEDED", ""); res.Code != http.StatusNotFound {
		t.Fatalf("provider intake should be disabled: status=%d body=%s", res.Code, res.Body.String())
	}
}
