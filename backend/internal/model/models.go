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

type TeamMember struct {
	UserID   string `json:"userId"`
	Name     string `json:"name"`
	Email    string `json:"email,omitempty"`
	Role     string `json:"role"`
	JoinedAt string `json:"joinedAt"`
}

type Task struct {
	ID           string  `json:"id"`
	ProjectID    string  `json:"projectId"`
	Title        string  `json:"title"`
	Description  string  `json:"description"`
	Status       string  `json:"status"`
	AssigneeID   *string `json:"assigneeId"`
	AssigneeName string  `json:"assigneeName,omitempty"`
	CreatedBy    string  `json:"createdBy"`
	DueAt        *string `json:"dueAt"`
	CreatedAt    string  `json:"createdAt"`
	UpdatedAt    string  `json:"updatedAt"`
}

type Milestone struct {
	ID          string `json:"id"`
	ProjectID   string `json:"projectId"`
	Title       string `json:"title"`
	Description string `json:"description"`
	Status      string `json:"status"`
	DueAt       string `json:"dueAt"`
	CreatedBy   string `json:"createdBy"`
	CreatedAt   string `json:"createdAt"`
	UpdatedAt   string `json:"updatedAt"`
}

type BudgetItem struct {
	ID          string `json:"id"`
	ProjectID   string `json:"projectId"`
	Category    string `json:"category"`
	Description string `json:"description"`
	AmountCents int64  `json:"amountCents"`
	Currency    string `json:"currency"`
	CreatedBy   string `json:"createdBy"`
	CreatedAt   string `json:"createdAt"`
}

type Expense struct {
	ID          string  `json:"id"`
	ProjectID   string  `json:"projectId"`
	Description string  `json:"description"`
	AmountCents int64   `json:"amountCents"`
	Amount      int64   `json:"amount"`
	Reason      string  `json:"reason"`
	Currency    string  `json:"currency"`
	Status      string  `json:"status"`
	RequestedBy string  `json:"requestedBy"`
	DecidedBy   *string `json:"decidedBy"`
	DecidedAt   *string `json:"decidedAt"`
	IncurredAt  *string `json:"incurredAt"`
	CreatedAt   string  `json:"createdAt"`
}

type Document struct {
	ID          string `json:"id"`
	ProjectID   string `json:"projectId"`
	Title       string `json:"title"`
	Kind        string `json:"kind"`
	FileName    string `json:"fileName"`
	ContentType string `json:"contentType"`
	SizeBytes   int64  `json:"sizeBytes"`
	UploadedBy  string `json:"uploadedBy"`
	CreatedAt   string `json:"createdAt"`
}

type Report struct {
	ID         string `json:"id"`
	ProjectID  string `json:"projectId"`
	Title      string `json:"title"`
	Body       string `json:"body"`
	Kind       string `json:"kind"`
	AuthorID   string `json:"authorId"`
	AuthorName string `json:"authorName,omitempty"`
	CreatedAt  string `json:"createdAt"`
}

type Approval struct {
	ID          string  `json:"id"`
	ProjectID   string  `json:"projectId"`
	Title       string  `json:"title"`
	Details     string  `json:"details"`
	Kind        string  `json:"kind"`
	Status      string  `json:"status"`
	AmountCents *int64  `json:"amountCents"`
	RequestedBy string  `json:"requestedBy"`
	DecidedBy   *string `json:"decidedBy"`
	DecidedAt   *string `json:"decidedAt"`
	CreatedAt   string  `json:"createdAt"`
}

type Quotation struct {
	ID           string `json:"id"`
	ProjectID    string `json:"projectId"`
	SupplierID   string `json:"supplierId"`
	SupplierName string `json:"supplierName,omitempty"`
	Item         string `json:"item"`
	Description  string `json:"description"`
	AmountCents  int64  `json:"amountCents"`
	Currency     string `json:"currency"`
	Status       string `json:"status"`
	CreatedAt    string `json:"createdAt"`
	UpdatedAt    string `json:"updatedAt"`
}

type BOQItem struct {
	ID          string  `json:"id"`
	ProjectID   string  `json:"projectId"`
	Description string  `json:"description"`
	Quantity    float64 `json:"quantity"`
	Unit        string  `json:"unit"`
	RateCents   int64   `json:"rateCents"`
	CreatedBy   string  `json:"createdBy"`
	CreatedAt   string  `json:"createdAt"`
	UpdatedAt   string  `json:"updatedAt"`
}

type Issue struct {
	ID        string `json:"id"`
	ProjectID string `json:"projectId"`
	Title     string `json:"title"`
	Details   string `json:"details"`
	Severity  string `json:"severity"`
	Status    string `json:"status"`
	RaisedBy  string `json:"raisedBy"`
	CreatedAt string `json:"createdAt"`
	UpdatedAt string `json:"updatedAt"`
}
