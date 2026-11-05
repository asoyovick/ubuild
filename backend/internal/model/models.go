package model

type User struct {
	ID          string  `json:"id"`
	Name        string  `json:"name"`
	Email       string  `json:"email"`
	ProfileRole *string `json:"profileRole"`
}

type Project struct {
	ID          string `json:"id"`
	OwnerID     string `json:"ownerId"`
	Name        string `json:"name"`
	Location    string `json:"location"`
	Type        string `json:"type"`
	Description string `json:"description"`
	CreatedAt   string `json:"createdAt"`
	UpdatedAt   string `json:"updatedAt"`
}

type Membership struct {
	ID        string `json:"id"`
	UserID    string `json:"userId"`
	ProjectID string `json:"projectId"`
	Role      string `json:"role"`
	Status    string `json:"status"`
	JoinedAt  string `json:"joinedAt"`
	UpdatedAt string `json:"updatedAt"`
}
