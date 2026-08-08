package controllers

import (
	"encoding/json"
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v2"
)

// The bug this pins: `invalid := c.Status(401).JSON(...)` looks like it builds
// a reusable response, but Fiber's Status and JSON are side effects that fire
// immediately. Every login therefore set 401 and wrote an error body before the
// password was checked, and the success path's c.JSON replaced only the body —
// so valid credentials came back as 401 with a token in the payload.
//
// This exercises the same control flow: the failure helper is reachable but not
// taken, then a success response is written.
func TestUnusedFailureBranchDoesNotPoisonTheStatus(t *testing.T) {
	app := fiber.New()
	app.Get("/login", func(c *fiber.Ctx) error {
		credentialsBad := false
		if credentialsBad {
			return invalidCredentials(c)
		}
		return c.JSON(fiber.Map{"token": "abc", "user": fiber.Map{"id": "1"}})
	})

	res, err := app.Test(httptest.NewRequest("GET", "/login", nil))
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}

	if res.StatusCode != fiber.StatusOK {
		t.Fatalf("status = %d, want 200 — a failure helper leaked its status onto a success", res.StatusCode)
	}

	var payload map[string]any
	if err := json.NewDecoder(res.Body).Decode(&payload); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if _, hasError := payload["error"]; hasError {
		t.Errorf("success response carried an error field: %v", payload)
	}
	if payload["token"] != "abc" {
		t.Errorf("token = %v, want the success payload", payload["token"])
	}
}

func TestInvalidCredentialsAnswers401AndSaysNothingUseful(t *testing.T) {
	app := fiber.New()
	app.Get("/login", invalidCredentials)

	res, err := app.Test(httptest.NewRequest("GET", "/login", nil))
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	if res.StatusCode != fiber.StatusUnauthorized {
		t.Fatalf("status = %d, want 401", res.StatusCode)
	}

	var payload map[string]any
	if err := json.NewDecoder(res.Body).Decode(&payload); err != nil {
		t.Fatalf("decode: %v", err)
	}
	// The message must not distinguish "no such account" from "wrong password",
	// or it becomes an account-enumeration oracle.
	if payload["error"] != "Invalid credentials" {
		t.Errorf("error = %v, want a single non-specific message", payload["error"])
	}
	if _, leaked := payload["token"]; leaked {
		t.Error("a failed sign-in returned a token")
	}
}
