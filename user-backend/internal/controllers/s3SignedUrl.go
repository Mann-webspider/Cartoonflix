package controllers

import (
	"crypto/rsa"
	"crypto/x509"
	"encoding/pem"
	"fmt"
	"os"
	"time"

	"github.com/aws/aws-sdk-go-v2/feature/cloudfront/sign"
)

func SignURL(rawURL string, expirationTime time.Duration) (string, error) {
	keyID := os.Getenv("CLOUDFRONT_KEYPAIR_ID")

	// Private key is injected via env (from AWS Secrets Manager / SSM), never
	// committed to the repo. Holds the full PEM contents.
	keyBytes := []byte(os.Getenv("CLOUDFRONT_PRIVATE_KEY"))
	if len(keyBytes) == 0 {
		return "", fmt.Errorf("CLOUDFRONT_PRIVATE_KEY is not set")
	}

	// Decode the PEM block
	block, _ := pem.Decode(keyBytes)
	if block == nil {
		return "", fmt.Errorf("failed to decode PEM block: invalid PEM format")
	}

	// Parse the private key (PKCS#8 format)
	privateKey, err := x509.ParsePKCS8PrivateKey(block.Bytes)
	if err != nil {
		return "", fmt.Errorf("failed to parse private key: %w", err)
	}

	// Create URL Signer
	signer := sign.NewURLSigner(keyID, privateKey.(*rsa.PrivateKey)) // Explicitly cast privateKey

	// Set expiration time (e.g., 1 hour from now)
	expiration := time.Now().Add(expirationTime)

	// Generate signed URL
	signedURL, err := signer.Sign(rawURL, expiration)
	if err != nil {
		return "", fmt.Errorf("failed to sign URL: %w", err)
	}

	return signedURL, nil
}
