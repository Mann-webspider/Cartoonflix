package app

import (
	"net/http/httptest"
	"strings"
	"testing"
)

// The default is deliberately permissive so a fresh deploy answers before
// anyone has configured anything. What must never happen again is an empty or
// single-hardcoded-origin default, which is what caused the outage below.
func TestAllowedOriginsHasAWorkingDefault(t *testing.T) {
	t.Setenv("ALLOWED_ORIGINS", "")
	got := AllowedOrigins()
	if strings.TrimSpace(got) == "" {
		t.Fatal("default origins is empty; every browser response would be blocked")
	}
	if strings.HasPrefix(got, "http://localhost") && !strings.Contains(got, ",") {
		t.Errorf("default origins %q is a single hardcoded host — the exact shape that broke sign-in", got)
	}
}

func TestAllowedOriginsPrefersTheEnvironment(t *testing.T) {
	t.Setenv("ALLOWED_ORIGINS", "https://cartoonflix.vercel.app")
	if got := AllowedOrigins(); got != "https://cartoonflix.vercel.app" {
		t.Errorf("AllowedOrigins() = %q, want the configured value", got)
	}
}

// The outage this guards: a hardcoded single origin meant the browser blocked
// every response, so sign-in reported failure while the server returned 200.
func TestPreflightAllowsAuthorizationHeader(t *testing.T) {
	t.Setenv("ALLOWED_ORIGINS", "http://localhost:3002")

	req := httptest.NewRequest("OPTIONS", "/api/v1/contents", nil)
	req.Header.Set("Origin", "http://localhost:3002")
	req.Header.Set("Access-Control-Request-Method", "GET")
	req.Header.Set("Access-Control-Request-Headers", "authorization")

	res, err := New().Test(req)
	if err != nil {
		t.Fatalf("preflight request failed: %v", err)
	}
	if res.StatusCode >= 400 {
		t.Fatalf("preflight status = %d, want a success", res.StatusCode)
	}

	if origin := res.Header.Get("Access-Control-Allow-Origin"); origin != "http://localhost:3002" {
		t.Errorf("Allow-Origin = %q, want the requesting origin", origin)
	}
	allowed := strings.ToLower(res.Header.Get("Access-Control-Allow-Headers"))
	if !strings.Contains(allowed, "authorization") {
		t.Errorf("Allow-Headers = %q, which would fail every authenticated request", allowed)
	}
}

func TestUnlistedOriginIsNotEchoedBack(t *testing.T) {
	t.Setenv("ALLOWED_ORIGINS", "http://localhost:3002")

	req := httptest.NewRequest("GET", "/api/v1/health", nil)
	req.Header.Set("Origin", "https://not-our-app.example")

	res, err := New().Test(req)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	if origin := res.Header.Get("Access-Control-Allow-Origin"); origin == "https://not-our-app.example" {
		t.Error("an unlisted origin was allowed")
	}
}
