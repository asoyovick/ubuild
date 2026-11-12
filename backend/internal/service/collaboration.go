package service

import (
	"database/sql"
	"errors"
	"fmt"
	"strings"

	"github.com/ubuild/backend/internal/model"
)

// MessageService stores project communication. A message is attached to the
// same project (and optionally engagement) that the rest of the platform uses,
// so a professional who became a project member when their engagement was
// approved reads and writes the same conversation as the client.
type MessageService struct {
	db *sql.DB
}

func NewMessageService(db *sql.DB) *MessageService {
	return &MessageService{db: db}
}

// Post records a non-empty message from a project member.
func (s *MessageService) Post(projectID, engagementID, userID, body string) (*model.ProjectMessage, error) {
	projectID = strings.TrimSpace(projectID)
	engagementID = strings.TrimSpace(engagementID)
	userID = strings.TrimSpace(userID)
	body = strings.TrimSpace(body)
	if projectID == "" || userID == "" {
		return nil, fmt.Errorf("%w: project and author are required", ErrValidation)
	}
	if body == "" {
		return nil, fmt.Errorf("%w: a message cannot be empty", ErrValidation)
	}
	if len(body) > 8000 {
		return nil, fmt.Errorf("%w: the message is too long", ErrValidation)
	}
	if engagementID != "" {
		var count int
		if err := s.db.QueryRow(`SELECT COUNT(*) FROM engagements WHERE id=$1 AND project_id=$2`, engagementID, projectID).Scan(&count); err != nil {
			return nil, err
		}
		if count == 0 {
			return nil, fmt.Errorf("%w: engagement", ErrNotFound)
		}
	}

	id := model.NewID()
	now := model.Now()
	tx, err := s.db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()
	if _, err = tx.Exec(`INSERT INTO project_messages(id,project_id,engagement_id,user_id,body,created_at)
		VALUES($1,$2,$3,$4,$5,$6)`, id, projectID, engagementID, userID, body, now); err != nil {
		return nil, err
	}
	if err = recordAudit(tx, projectID, userID, "message_posted",
		"Project message posted"+engagementSuffix(engagementID)); err != nil {
		return nil, err
	}
	if err = tx.Commit(); err != nil {
		return nil, err
	}
	return s.Get(id)
}

// List returns the newest messages on a project. The caller has already been
// authorized as a project member or engaged professional by the handler.
func (s *MessageService) List(projectID string, limit int) ([]model.ProjectMessage, error) {
	if limit <= 0 || limit > 500 {
		limit = 200
	}
	rows, err := s.db.Query(`SELECT m.id,m.project_id,m.engagement_id,m.user_id,m.body,m.created_at,u.name
		FROM project_messages m JOIN users u ON u.id=m.user_id
		WHERE m.project_id=$1 ORDER BY m.created_at DESC`, projectID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	messages := []model.ProjectMessage{}
	for rows.Next() {
		var m model.ProjectMessage
		if err = rows.Scan(&m.ID, &m.ProjectID, &m.EngagementID, &m.UserID, &m.Body, &m.CreatedAt, &m.UserName); err != nil {
			return nil, err
		}
		messages = append(messages, m)
		if len(messages) >= limit {
			break
		}
	}
	return messages, rows.Err()
}

func (s *MessageService) Get(id string) (*model.ProjectMessage, error) {
	var m model.ProjectMessage
	err := s.db.QueryRow(`SELECT m.id,m.project_id,m.engagement_id,m.user_id,m.body,m.created_at,u.name
		FROM project_messages m JOIN users u ON u.id=m.user_id WHERE m.id=$1`, id).
		Scan(&m.ID, &m.ProjectID, &m.EngagementID, &m.UserID, &m.Body, &m.CreatedAt, &m.UserName)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, fmt.Errorf("%w: message", ErrNotFound)
	}
	if err != nil {
		return nil, err
	}
	return &m, nil
}

func engagementSuffix(engagementID string) string {
	if engagementID == "" {
		return ""
	}
	return " on engagement " + engagementID
}
