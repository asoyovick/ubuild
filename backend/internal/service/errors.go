package service

import "errors"

// Errors returned by the UBuild services. Handlers map each of these to a
// specific HTTP status so that a rule failure is reported precisely.
var (
	ErrValidation            = errors.New("invalid input")
	ErrNotFound              = errors.New("record not found")
	ErrConflict              = errors.New("the record state does not allow this action")
	ErrEngagementRequired    = errors.New("a valid approved UBuild engagement is required")
	ErrExceedsAgreedTerms    = errors.New("the request exceeds the agreed engagement terms")
	ErrAuthorizationRequired = errors.New("explicit client authorization is required")
	ErrSelfApproval          = errors.New("a professional cannot authorize their own payment")
	ErrProviderNotConfirmed  = errors.New("the payment provider has not confirmed the transaction")
	ErrInsufficientFunds     = errors.New("the project funds account does not have enough available funds")
	ErrRatingNotAllowed      = errors.New("ratings require a completed UBuild engagement")
	ErrUnauthorized          = errors.New("you are not authorized for this financial action")
	ErrProviderNotConfigured = errors.New("no payment provider is configured for this project")
)
