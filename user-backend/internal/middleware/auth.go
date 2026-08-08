package middleware

import (
	"os"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
)

// claimsFrom parses and verifies the Bearer JWT (HS256, shared JWT_SECRET).
// Returns nil when the header is absent or the token does not verify.
func claimsFrom(c *fiber.Ctx) jwt.MapClaims {
	header := c.Get("Authorization")
	if !strings.HasPrefix(header, "Bearer ") {
		return nil
	}

	token, err := jwt.Parse(strings.TrimPrefix(header, "Bearer "), func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, jwt.ErrSignatureInvalid
		}
		return []byte(os.Getenv("JWT_SECRET")), nil
	})
	if err != nil || !token.Valid {
		return nil
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return nil
	}
	return claims
}

// RequireAuth rejects the request unless a valid token is present, and stores
// the user id + role in the request locals.
func RequireAuth(c *fiber.Ctx) error {
	claims := claimsFrom(c)
	if claims == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Invalid or missing token"})
	}
	c.Locals("user_id", claims["sub"])
	c.Locals("role", claims["role"])
	return c.Next()
}

// OptionalAuth records the viewer when a valid token is present and otherwise
// lets the request through anonymously.
//
// Used by endpoints whose public half everyone may read — a title's like count
// and rating average — but which also carry a personal half, whether *you*
// liked it and what *you* reviewed. Requiring a token would hide the public
// numbers from signed-out viewers; ignoring one would hide their own state.
func OptionalAuth(c *fiber.Ctx) error {
	if claims := claimsFrom(c); claims != nil {
		c.Locals("user_id", claims["sub"])
		c.Locals("role", claims["role"])
	}
	return c.Next()
}
