package controllers

import (
	"os"
	"testing"

	"github.com/golang-jwt/jwt/v5"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"golang.org/x/crypto/bcrypt"
)

func TestValidateSignup(t *testing.T) {
	valid := credentials{Username: "mann_25", Email: "mann@example.com", Password: "correct-horse"}
	if err := validateSignup(valid); err != nil {
		t.Fatalf("expected valid credentials to pass, got %v", err)
	}

	cases := map[string]credentials{
		"username too short":  {Username: "ab", Email: "a@b.co", Password: "correct-horse"},
		"username with space": {Username: "mann 25", Email: "a@b.co", Password: "correct-horse"},
		"email without @":     {Username: "mann_25", Email: "not-an-email", Password: "correct-horse"},
		"password too short":  {Username: "mann_25", Email: "a@b.co", Password: "short"},
	}
	for name, creds := range cases {
		if err := validateSignup(creds); err == nil {
			t.Errorf("%s: expected rejection, got nil", name)
		}
	}
}

// The admin API and this service verify each other's tokens, so the claim
// names and signing method must not drift apart.
func TestMintTokenIsVerifiableWithSharedSecret(t *testing.T) {
	t.Setenv("JWT_SECRET", "test-secret")

	user := User{ID: primitive.NewObjectID(), Role: "user"}
	signed, err := mintToken(user)
	if err != nil {
		t.Fatalf("mintToken: %v", err)
	}

	parsed, err := jwt.Parse(signed, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, jwt.ErrSignatureInvalid
		}
		return []byte(os.Getenv("JWT_SECRET")), nil
	})
	if err != nil || !parsed.Valid {
		t.Fatalf("token did not verify: %v", err)
	}

	claims := parsed.Claims.(jwt.MapClaims)
	if claims["sub"] != user.ID.Hex() {
		t.Errorf("sub = %v, want %v", claims["sub"], user.ID.Hex())
	}
	if claims["role"] != "user" {
		t.Errorf("role = %v, want user", claims["role"])
	}
}

func TestPasswordHashRoundTrip(t *testing.T) {
	hash, err := bcrypt.GenerateFromPassword([]byte("correct-horse"), bcrypt.DefaultCost)
	if err != nil {
		t.Fatalf("hash: %v", err)
	}
	if err := bcrypt.CompareHashAndPassword(hash, []byte("correct-horse")); err != nil {
		t.Errorf("correct password rejected: %v", err)
	}
	if bcrypt.CompareHashAndPassword(hash, []byte("wrong-horse")) == nil {
		t.Error("wrong password accepted")
	}
}
