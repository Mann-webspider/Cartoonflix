package routes

import (
	"user-backend/internal/controllers"
	"user-backend/internal/middleware"

	"github.com/gofiber/fiber/v2"
)

func SetupRoutes(app *fiber.App) {
	app.Get("/api/v1/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "ok"})
	})

	api := app.Group("/api/v1")

	// Public reads
	api.Get("/content", controllers.GetCollectionContent)
	api.Get("/contents", controllers.GetContent)
	api.Get("/search", controllers.SearchContent)
	api.Get("/comments", controllers.GetComments)

	// Authenticated writes / user-scoped reads
	api.Post("/preferences", middleware.RequireAuth, controllers.AddPreference)
	api.Get("/preferences", middleware.RequireAuth, controllers.GetPreferences)
	api.Post("/comments", middleware.RequireAuth, controllers.AddComment)
}
