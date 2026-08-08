package app

import (
	"os"
	"strings"

	"user-backend/internal/routes"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
)

// Permissive by default so a fresh deploy answers any origin and nobody has to
// debug CORS before the app has ever worked once. Set ALLOWED_ORIGINS to the
// real site origin in production — with "*" the browser will also refuse to
// send credentialed requests, so this is a starting point, not a destination.
const defaultOrigins = "*"

// AllowedOrigins reads the browser origins permitted to call this API.
//
// Hardcoding one port was a real outage: the viewer moved ports, the browser
// blocked every response, and sign-in reported "something went wrong" while the
// server was happily returning 200 with a valid token.
func AllowedOrigins() string {
	if configured := strings.TrimSpace(os.Getenv("ALLOWED_ORIGINS")); configured != "" {
		return configured
	}
	return defaultOrigins
}

// New builds the API with its middleware and routes.
//
// Both entrypoints — the local server and the Lambda — go through here, because
// having them assemble the app separately is how the Lambda ended up shipping
// with no CORS middleware at all while the local server had it.
func New() *fiber.App {
	app := fiber.New(fiber.Config{
		// The proxy in front of Lambda already reports errors; a duplicated
		// stack trace in the response body helps nobody.
		DisableStartupMessage: true,
	})

	app.Use(cors.New(cors.Config{
		AllowOrigins: AllowedOrigins(),
		// Authorization is not optional: every personalised request carries a
		// bearer token, and omitting it here fails the preflight for likes,
		// reviews, My List and playback progress.
		AllowHeaders: "Origin, Content-Type, Accept, Authorization",
		AllowMethods: "GET,POST,PUT,DELETE,OPTIONS",
	}))

	routes.SetupRoutes(app)
	return app
}
