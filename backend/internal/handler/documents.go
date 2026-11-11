package handler

import (
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"errors"
	"io"
	"mime"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/ubuild/backend/internal/model"
)

const maxUploadBytes = 20 << 20

func (a *API) uploadDirectory() string {
	if a.UploadDir != "" {
		return a.UploadDir
	}
	if value := os.Getenv("UBUILD_UPLOAD_DIR"); value != "" {
		return value
	}
	return filepath.Join("data", "uploads")
}

func (a *API) listDocuments(projectID string) []model.Document {
	rows, err := a.DB.Query(`SELECT id,project_id,title,kind,file_name,content_type,size_bytes,uploaded_by,created_at FROM documents WHERE project_id=$1 ORDER BY created_at DESC`, projectID)
	if err != nil {
		return []model.Document{}
	}
	defer rows.Close()
	items := []model.Document{}
	for rows.Next() {
		var item model.Document
		if rows.Scan(&item.ID, &item.ProjectID, &item.Title, &item.Kind, &item.FileName, &item.ContentType, &item.SizeBytes, &item.UploadedBy, &item.CreatedAt) == nil {
			items = append(items, item)
		}
	}
	return items
}

// allowedUploadType is a deny-by-default allowlist. Markup and script types are
// deliberately absent so a client-declared content type cannot turn an upload
// into a stored cross-site scripting payload.
func allowedUploadType(contentType string) bool {
	mediaType, _, err := mime.ParseMediaType(contentType)
	if err != nil {
		return false
	}
	switch mediaType {
	case "image/jpeg", "image/png", "image/gif", "image/webp", "image/bmp", "image/tiff", "image/heic", "image/heif",
		"application/pdf", "text/plain", "text/csv",
		"application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
		"application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
		"application/zip", "application/octet-stream":
		return true
	}
	return false
}

// unsafeUploadContent reports whether the actual file bytes look like active
// web content, regardless of the content type the client declared.
func unsafeUploadContent(file multipart.File) (bool, error) {
	sniff := make([]byte, 512)
	read, err := io.ReadFull(file, sniff)
	if err != nil && !errors.Is(err, io.ErrUnexpectedEOF) && !errors.Is(err, io.EOF) {
		return true, err
	}
	if _, err := file.Seek(0, io.SeekStart); err != nil {
		return true, err
	}
	mediaType, _, parseErr := mime.ParseMediaType(http.DetectContentType(sniff[:read]))
	if parseErr != nil {
		return true, nil
	}
	switch mediaType {
	case "text/html", "application/xhtml+xml", "text/xml", "application/xml",
		"image/svg+xml", "application/javascript", "text/javascript":
		return true, nil
	}
	return false, nil
}

func safeExtension(name, contentType string) string {
	ext := strings.ToLower(filepath.Ext(name))
	if len(ext) > 10 {
		return ""
	}
	for _, char := range ext {
		if !(char == '.' || char >= 'a' && char <= 'z' || char >= '0' && char <= '9') {
			return ""
		}
	}
	if ext != "" {
		return ext
	}
	extensions, _ := mime.ExtensionsByType(contentType)
	if len(extensions) > 0 {
		return extensions[0]
	}
	return ""
}

func (a *API) uploadDocument(w http.ResponseWriter, r *http.Request) {
	access, ok := a.requireProjectAccess(w, r, permUploadDocuments)
	if !ok {
		return
	}
	r.Body = http.MaxBytesReader(w, r.Body, maxUploadBytes+1<<20)
	if err := r.ParseMultipartForm(maxUploadBytes); err != nil {
		writeError(w, http.StatusBadRequest, "The upload is too large or could not be read. The maximum file size is 20 MB.")
		return
	}
	title := strings.TrimSpace(r.FormValue("title"))
	kind := strings.TrimSpace(r.FormValue("kind"))
	if kind == "" {
		kind = "OTHER"
	}
	if !validDocumentKind(kind) {
		validationError(w, map[string]string{"kind": "Choose a valid document type."})
		return
	}
	file, header, err := r.FormFile("file")
	if err != nil {
		validationError(w, map[string]string{"file": "Choose a file to upload."})
		return
	}
	defer file.Close()
	if header.Size > maxUploadBytes {
		validationError(w, map[string]string{"file": "The file must be 20 MB or smaller."})
		return
	}
	contentType := header.Header.Get("Content-Type")
	if contentType == "" {
		contentType = "application/octet-stream"
	}
	mediaType, _, parseErr := mime.ParseMediaType(contentType)
	if parseErr != nil || !allowedUploadType(contentType) {
		validationError(w, map[string]string{"file": "Upload an image, PDF, document, spreadsheet, or text file."})
		return
	}
	contentType = mediaType
	if unsafe, sniffErr := unsafeUploadContent(file); sniffErr != nil {
		a.serverError(w, "Unable to read the file.")
		return
	} else if unsafe {
		validationError(w, map[string]string{"file": "This file type is not permitted."})
		return
	}
	if title == "" {
		title = strings.TrimSpace(header.Filename)
	}
	if len([]rune(title)) < 2 {
		validationError(w, map[string]string{"title": "Please enter a document title."})
		return
	}
	id := newID()
	storageName := id + safeExtension(header.Filename, contentType)
	directory := a.uploadDirectory()
	if err := os.MkdirAll(directory, 0o700); err != nil {
		a.serverError(w, "Unable to store the file.")
		return
	}
	destination, err := os.OpenFile(filepath.Join(directory, storageName), os.O_CREATE|os.O_EXCL|os.O_WRONLY, 0o600)
	if err != nil {
		a.serverError(w, "Unable to store the file.")
		return
	}
	written, copyErr := io.Copy(destination, io.LimitReader(file, maxUploadBytes))
	closeErr := destination.Close()
	if copyErr != nil || closeErr != nil || written == 0 {
		_ = os.Remove(filepath.Join(directory, storageName))
		a.serverError(w, "Unable to store the file.")
		return
	}
	createdAt := now()
	fileName := filepath.Base(strings.TrimSpace(header.Filename))
	if fileName == "." || fileName == string(filepath.Separator) {
		fileName = "upload"
	}
	if _, err := a.DB.Exec(`INSERT INTO documents(id,project_id,title,kind,file_name,content_type,size_bytes,storage_name,uploaded_by,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`, id, access.Project.ID, title, kind, fileName, contentType, written, storageName, access.User.ID, createdAt); err != nil {
		_ = os.Remove(filepath.Join(directory, storageName))
		a.serverError(w, "Unable to save the document record.")
		return
	}
	a.recordAudit(access.Project.ID, access.User.ID, "document_uploaded", title)
	a.created(w, map[string]any{"document": model.Document{ID: id, ProjectID: access.Project.ID, Title: title, Kind: kind, FileName: fileName, ContentType: contentType, SizeBytes: written, UploadedBy: access.User.ID, CreatedAt: createdAt}})
}

func (a *API) downloadDocument(w http.ResponseWriter, r *http.Request) {
	access, ok := a.requireProjectAccess(w, r, permViewDocuments)
	if !ok {
		return
	}
	var document model.Document
	var storageName string
	err := a.DB.QueryRow(`SELECT id,project_id,title,kind,file_name,content_type,size_bytes,storage_name,uploaded_by,created_at FROM documents WHERE id=$1 AND project_id=$2`, r.PathValue("documentId"), access.Project.ID).Scan(&document.ID, &document.ProjectID, &document.Title, &document.Kind, &document.FileName, &document.ContentType, &document.SizeBytes, &storageName, &document.UploadedBy, &document.CreatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		a.notFound(w, "Document not found.")
		return
	} else if err != nil {
		a.serverError(w, "Unable to load the document.")
		return
	}
	if filepath.Base(storageName) != storageName {
		a.serverError(w, "Unable to load the document.")
		return
	}
	file, err := os.Open(filepath.Join(a.uploadDirectory(), storageName))
	if errors.Is(err, os.ErrNotExist) {
		a.notFound(w, "The stored file is no longer available.")
		return
	} else if err != nil {
		a.serverError(w, "Unable to load the document.")
		return
	}
	defer file.Close()
	w.Header().Set("Content-Type", document.ContentType)
	w.Header().Set("X-Content-Type-Options", "nosniff")
	w.Header().Set("Content-Security-Policy", "default-src 'none'; sandbox")
	w.Header().Set("Cache-Control", "private, no-store")
	disposition := mime.FormatMediaType("attachment", map[string]string{"filename": document.FileName})
	if disposition == "" {
		disposition = "attachment"
	}
	w.Header().Set("Content-Disposition", disposition)
	http.ServeContent(w, r, document.FileName, mustTime(document.CreatedAt), file)
}

func randomToken() string {
	buffer := make([]byte, 24)
	if _, err := rand.Read(buffer); err != nil {
		return newID() + newID()
	}
	return hex.EncodeToString(buffer)
}
