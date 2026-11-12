package service

import (
	"database/sql"
	"errors"
	"fmt"
	"sort"
	"strings"

	"github.com/ubuild/backend/internal/model"
)

// MarketplaceService covers professional profiles, client ratings and the
// suitability recommendation used when a client shortlists professionals.
//
// Nothing in this service can move money, approve an engagement or authorize a
// payment. Recommendations are advisory only.
type MarketplaceService struct {
	db *sql.DB
}

func NewMarketplaceService(db *sql.DB) *MarketplaceService {
	return &MarketplaceService{db: db}
}

// ProfessionalFilter narrows the professional directory.
type ProfessionalFilter struct {
	Query      string
	Discipline string
	Stage      string
	Limit      int
}

// UpsertProfile creates or updates the professional information attached to an
// existing platform account.
func (s *MarketplaceService) UpsertProfile(userID, headline string, disciplines, qualifications []string, yearsExperience int, location, availability, projectRole string) (*model.Professional, error) {
	userID = strings.TrimSpace(userID)
	headline = strings.TrimSpace(headline)
	location = strings.TrimSpace(location)
	availability = strings.ToUpper(strings.TrimSpace(availability))
	projectRole = strings.ToUpper(strings.TrimSpace(projectRole))
	if availability == "" {
		availability = "AVAILABLE"
	}
	if userID == "" || len(strings.Fields(headline)) == 0 {
		return nil, fmt.Errorf("%w: a headline is required", ErrValidation)
	}
	if yearsExperience < 0 || yearsExperience > 70 {
		return nil, fmt.Errorf("%w: years of experience is out of range", ErrValidation)
	}
	switch availability {
	case "AVAILABLE", "LIMITED", "UNAVAILABLE":
	default:
		return nil, fmt.Errorf("%w: availability must be AVAILABLE, LIMITED or UNAVAILABLE", ErrValidation)
	}
	disciplines = cleanList(disciplines)
	qualifications = cleanList(qualifications)
	if projectRole == "" {
		projectRole = projectRoleForDisciplines(disciplines)
	}
	switch projectRole {
	case "COORDINATOR", "ARCHITECT", "ENGINEER", "QUANTITY_SURVEYOR", "SITE_SUPERVISOR", "CONTRACTOR", "SUPPLIER":
	default:
		return nil, fmt.Errorf("%w: project role must be a professional project role", ErrValidation)
	}

	var exists int
	if err := s.db.QueryRow(`SELECT 1 FROM users WHERE id=$1`, userID).Scan(&exists); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, fmt.Errorf("%w: professional account", ErrNotFound)
		}
		return nil, err
	}

	now := model.Now()
	if _, err := s.db.Exec(`INSERT INTO professionals(user_id,headline,disciplines,qualifications,years_experience,location,availability,project_role,verified,created_at,updated_at)
		VALUES($1,$2,$3,$4,$5,$6,$7,$8,0,$9,$9)
		ON CONFLICT(user_id) DO UPDATE SET headline=$2,disciplines=$3,qualifications=$4,years_experience=$5,location=$6,availability=$7,project_role=$8,updated_at=$9`,
		userID, headline, strings.Join(disciplines, ","), strings.Join(qualifications, ","), yearsExperience, location, availability, projectRole, now); err != nil {
		return nil, err
	}
	return s.Get(userID)
}

// Get returns one professional profile with its aggregate reputation.
func (s *MarketplaceService) Get(userID string) (*model.Professional, error) {
	professional, err := scanProfessional(s.db.QueryRow(professionalQuery+` WHERE p.user_id=$1`, userID))
	if errors.Is(err, sql.ErrNoRows) {
		return nil, fmt.Errorf("%w: professional", ErrNotFound)
	}
	if err != nil {
		return nil, err
	}
	return professional, nil
}

// List returns professionals matching the filter, highest rated first.
func (s *MarketplaceService) List(filter ProfessionalFilter) ([]model.Professional, error) {
	rows, err := s.db.Query(professionalQuery + ` ORDER BY p.verified DESC, p.years_experience DESC, u.name`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	query := strings.ToLower(strings.TrimSpace(filter.Query))
	discipline := strings.ToLower(strings.TrimSpace(filter.Discipline))
	stage := strings.ToLower(strings.TrimSpace(filter.Stage))
	limit := filter.Limit
	if limit <= 0 || limit > 100 {
		limit = 50
	}

	professionals := []model.Professional{}
	for rows.Next() {
		professional, err := scanProfessional(rows)
		if err != nil {
			return nil, err
		}
		if query != "" && !containsFold(professional.Name, query) && !containsFold(professional.Headline, query) &&
			!containsFold(professional.Location, query) && !containsFoldAny(professional.Disciplines, query) &&
			!containsFoldAny(professional.Qualifications, query) {
			continue
		}
		if discipline != "" && !containsFoldAny(professional.Disciplines, discipline) {
			continue
		}
		if stage != "" && !containsFoldAny(professional.Disciplines, stage) {
			continue
		}
		professionals = append(professionals, *professional)
		if len(professionals) >= limit {
			break
		}
	}
	return professionals, rows.Err()
}

// Recommend ranks professionals for a construction stage and scope. The result
// is a ranking only: it never approves an engagement and never releases funds.
func (s *MarketplaceService) Recommend(stage string, scope string, limit int) ([]model.Recommendation, error) {
	st := model.ProjectStage(strings.ToUpper(strings.TrimSpace(stage)))
	if !model.ValidProjectStage(st) {
		return nil, fmt.Errorf("%w: unknown construction stage", ErrValidation)
	}
	if len(strings.Fields(scope)) == 0 {
		return nil, fmt.Errorf("%w: scope is required", ErrValidation)
	}
	if limit <= 0 || limit > 50 {
		limit = 10
	}

	professionals, err := s.List(ProfessionalFilter{})
	if err != nil {
		return nil, err
	}
	return rankProfessionals(professionals, st, scope, "", nil, limit), nil
}

// RecommendForProject ranks professionals against the project's own stage,
// scope and location, and excludes anyone already engaged on the same project.
// It still uses only platform records: ratings from completed UBuild
// engagements, qualifications, experience, availability and stage match.
func (s *MarketplaceService) RecommendForProject(projectID, stage, scope string, limit int) ([]model.Recommendation, error) {
	var projectScope, projectLocation, projectStage string
	if err := s.db.QueryRow(`SELECT scope,location,construction_stage FROM projects WHERE id=$1`, projectID).
		Scan(&projectScope, &projectLocation, &projectStage); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, fmt.Errorf("%w: project", ErrNotFound)
		}
		return nil, err
	}
	st := model.ProjectStage(strings.ToUpper(strings.TrimSpace(stage)))
	if !model.ValidProjectStage(st) {
		st = model.ProjectStage(projectStage)
	}
	if scope = strings.TrimSpace(scope); scope == "" {
		scope = projectScope
	}
	if scope == "" {
		return nil, fmt.Errorf("%w: the project needs a scope before professionals can be ranked", ErrValidation)
	}
	if limit <= 0 || limit > 50 {
		limit = 10
	}

	professionals, err := s.List(ProfessionalFilter{})
	if err != nil {
		return nil, err
	}
	rows, err := s.db.Query(`SELECT professional_id FROM engagements WHERE project_id=$1 AND status IN ('PENDING','APPROVED')`, projectID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	alreadyEngaged := map[string]bool{}
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		alreadyEngaged[id] = true
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return rankProfessionals(professionals, st, scope, projectLocation, alreadyEngaged, limit), nil
}

// rankProfessionals is the shared, deterministic suitability scoring. It is
// advisory: the output is a ranking, never an approval or a payment.
func rankProfessionals(professionals []model.Professional, stage model.ProjectStage, scope, projectLocation string, exclude map[string]bool, limit int) []model.Recommendation {
	scopeWords := strings.Fields(strings.ToLower(scope))
	recommendations := []model.Recommendation{}
	for _, professional := range professionals {
		if professional.Availability == "UNAVAILABLE" || (exclude != nil && exclude[professional.UserID]) {
			continue
		}
		score := 0.0
		reasons := []string{}

		if containsFoldAny(professional.Disciplines, string(stage)) || strings.EqualFold(professional.ProjectRole, string(stage)) {
			score += 40
			reasons = append(reasons, "Works at the "+string(stage)+" stage")
		}
		if professional.RatingCount > 0 {
			score += professional.RatingAverage / 5 * 30
			reasons = append(reasons, fmt.Sprintf("%.1f average from %d UBuild rating(s)", professional.RatingAverage, professional.RatingCount))
		}
		if professional.CompletedEngagements > 0 {
			score += float64(min(professional.CompletedEngagements, 5)) * 2
			reasons = append(reasons, fmt.Sprintf("%d completed UBuild engagement(s)", professional.CompletedEngagements))
		}
		if professional.YearsExperience > 0 {
			score += float64(min(professional.YearsExperience, 10)) * 2
			reasons = append(reasons, fmt.Sprintf("%d years of experience", professional.YearsExperience))
		}
		if professional.Verified {
			score += 10
			reasons = append(reasons, "Identity and qualifications verified")
		}
		if projectLocation != "" && strings.EqualFold(strings.TrimSpace(professional.Location), strings.TrimSpace(projectLocation)) {
			score += 8
			reasons = append(reasons, "Located in the project area")
		}
		matches := 0
		for _, word := range scopeWords {
			if len(word) < 4 {
				continue
			}
			if containsFoldAny(professional.Disciplines, word) || containsFoldAny(professional.Qualifications, word) {
				matches++
			}
		}
		if matches > 0 {
			score += float64(min(matches, 5)) * 2
			reasons = append(reasons, "Scope matches recorded skills")
		}
		if professional.Availability == "LIMITED" {
			score -= 5
		}
		recommendations = append(recommendations, model.Recommendation{
			Professional: professional,
			Stage:        stage,
			Score:        round1(score),
			Reasons:      reasons,
		})
	}
	sort.SliceStable(recommendations, func(i, j int) bool {
		return recommendations[i].Score > recommendations[j].Score
	})
	if len(recommendations) > limit {
		recommendations = recommendations[:limit]
	}
	return recommendations
}

func projectRoleForDisciplines(disciplines []string) string {
	for _, discipline := range disciplines {
		switch strings.ToUpper(strings.TrimSpace(discipline)) {
		case "ARCHITECT", "ARCHITECTURE":
			return "ARCHITECT"
		case "ENGINEER", "ENGINEERING", "STRUCTURAL":
			return "ENGINEER"
		case "QUANTITY_SURVEYOR", "QUANTITY SURVEYOR", "QS":
			return "QUANTITY_SURVEYOR"
		case "SITE_SUPERVISOR", "SITE SUPERVISION", "SUPERVISOR":
			return "SITE_SUPERVISOR"
		case "SUPPLIER", "SUPPLY":
			return "SUPPLIER"
		}
	}
	return "CONTRACTOR"
}

// Rate records a client's rating of a professional. A rating is only accepted
// against a completed UBuild engagement for that client and project, so work
// performed outside the platform cannot influence platform reputation.
func (s *MarketplaceService) Rate(clientID, projectID, engagementID string, score int, comment string) (*model.ProfessionalRating, error) {
	clientID = strings.TrimSpace(clientID)
	projectID = strings.TrimSpace(projectID)
	engagementID = strings.TrimSpace(engagementID)
	comment = strings.TrimSpace(comment)
	if score < 1 || score > 5 {
		return nil, fmt.Errorf("%w: score must be between 1 and 5", ErrValidation)
	}
	if clientID == "" || projectID == "" || engagementID == "" {
		return nil, fmt.Errorf("%w: engagement, project and client are required", ErrValidation)
	}

	var engagementClient, engagementProject, professionalID, status string
	err := s.db.QueryRow(`SELECT client_id,project_id,professional_id,status FROM engagements WHERE id=$1`, engagementID).
		Scan(&engagementClient, &engagementProject, &professionalID, &status)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, fmt.Errorf("%w: ratings require a platform engagement", ErrRatingNotAllowed)
	}
	if err != nil {
		return nil, err
	}
	if engagementClient != clientID || engagementProject != projectID {
		return nil, fmt.Errorf("%w: this client has no engagement on this project", ErrRatingNotAllowed)
	}
	if status != "COMPLETED" {
		return nil, fmt.Errorf("%w: the engagement is not completed", ErrRatingNotAllowed)
	}

	var existing int
	if err := s.db.QueryRow(`SELECT 1 FROM professional_ratings WHERE engagement_id=$1 AND client_id=$2`, engagementID, clientID).Scan(&existing); err == nil {
		return nil, fmt.Errorf("%w: this engagement is already rated", ErrConflict)
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

	if _, err = tx.Exec(`INSERT INTO professional_ratings(id,professional_id,project_id,engagement_id,client_id,score,comment,created_at)
		VALUES($1,$2,$3,$4,$5,$6,$7,$8)`, id, professionalID, projectID, engagementID, clientID, score, comment, now); err != nil {
		return nil, err
	}
	if err = recordAudit(tx, projectID, clientID, "professional_rated", fmt.Sprintf("Rated professional %s %d/5 for engagement %s", professionalID, score, engagementID)); err != nil {
		return nil, err
	}
	if err = tx.Commit(); err != nil {
		return nil, err
	}
	return &model.ProfessionalRating{
		ID: id, ProfessionalID: professionalID, ProjectID: projectID, EngagementID: engagementID,
		ClientID: clientID, Score: score, Comment: comment, CreatedAt: now,
	}, nil
}

const professionalQuery = `SELECT p.user_id,u.name,u.email,p.headline,p.disciplines,p.qualifications,p.years_experience,
	p.location,p.availability,p.project_role,p.verified,p.created_at,p.updated_at,
	(SELECT COUNT(*) FROM professional_ratings r WHERE r.professional_id=p.user_id),
	(SELECT COALESCE(AVG(r.score),0) FROM professional_ratings r WHERE r.professional_id=p.user_id),
	(SELECT COUNT(*) FROM engagements e WHERE e.professional_id=p.user_id AND e.status='COMPLETED')
	FROM professionals p JOIN users u ON u.id=p.user_id`

type rowScanner interface {
	Scan(dest ...any) error
}

func scanProfessional(row rowScanner) (*model.Professional, error) {
	var professional model.Professional
	var disciplines, qualifications string
	var verified int
	if err := row.Scan(&professional.UserID, &professional.Name, &professional.Email, &professional.Headline,
		&disciplines, &qualifications, &professional.YearsExperience, &professional.Location,
		&professional.Availability, &professional.ProjectRole, &verified, &professional.CreatedAt, &professional.UpdatedAt,
		&professional.RatingCount, &professional.RatingAverage, &professional.CompletedEngagements); err != nil {
		return nil, err
	}
	professional.Disciplines = splitList(disciplines)
	professional.Qualifications = splitList(qualifications)
	professional.Verified = verified == 1
	return &professional, nil
}

func cleanList(values []string) []string {
	seen := map[string]bool{}
	cleaned := []string{}
	for _, value := range values {
		value = strings.TrimSpace(value)
		key := strings.ToLower(value)
		if value == "" || seen[key] {
			continue
		}
		seen[key] = true
		cleaned = append(cleaned, value)
	}
	return cleaned
}

func splitList(value string) []string {
	if strings.TrimSpace(value) == "" {
		return []string{}
	}
	parts := strings.Split(value, ",")
	cleaned := []string{}
	for _, part := range parts {
		if part = strings.TrimSpace(part); part != "" {
			cleaned = append(cleaned, part)
		}
	}
	return cleaned
}

func containsFold(value, target string) bool {
	return strings.Contains(strings.ToLower(value), strings.ToLower(target))
}

func containsFoldAny(values []string, target string) bool {
	for _, value := range values {
		if containsFold(value, target) {
			return true
		}
	}
	return false
}

func round1(value float64) float64 {
	return float64(int64(value*10+0.5)) / 10
}
