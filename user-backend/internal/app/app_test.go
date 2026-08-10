package app

import (
	"net"
	"net/http/httptest"
	"strings"
	"testing"
)

// The proxy adapter's own rule, reproduced here so this test fails if our
// normalisation ever stops satisfying it. Mirrors the ":80" branch in
// aws-lambda-go-api-proxy/fiber/adapter.go.
func adapterRemoteAddr(sourceIP string) string {
	if !strings.Contains(sourceIP, ":") {
		return sourceIP + ":80"
	}
	return sourceIP
}

// The outage this guards: the adapter fed a bare IPv6 source address to
// net.ResolveTCPAddr, which rejected it, so every endpoint returned 500 for
// viewers on an IPv6 network — while IPv4 clients, and any IPv4 health check,
// saw a perfectly healthy API.
func TestNormaliseSourceIPSurvivesTheAdapter(t *testing.T) {
	for _, ip := range []string{
		"2409:4080:8d0a:e6b2:f84d:a20b:1f5c:126e", // the address that took the API down
		"2001:db8::1",
		"::1",
		"49.36.180.22",
	} {
		normalised := NormaliseSourceIP(ip)

		addr, err := net.ResolveTCPAddr("tcp", adapterRemoteAddr(normalised))
		if err != nil {
			t.Errorf("source IP %s: %v — every request from this client would 500", ip, err)
			continue
		}
		if got, want := addr.IP.String(), net.ParseIP(ip).String(); got != want {
			t.Errorf("source IP %s resolved to %s; the real client address must survive", ip, got)
		}
		if again := NormaliseSourceIP(normalised); again != normalised {
			t.Errorf("NormaliseSourceIP(%q) = %q on a second pass; it must be idempotent", normalised, again)
		}
	}
}

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
