package routes

import (
	"user-backend/internal/controllers"

	"github.com/gofiber/fiber/v2"
)

func SetupRoutes(app *fiber.App) {
	app.Get("/api/v1/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "ok"})
	})

	api := app.Group("/api/v1")

	// Content routes
	api.Get("/content", controllers.GetCollectionContent)
	api.Get("/contents", controllers.GetContent)

	// Additional routes for preferences and comments
	api.Post("/preferences", controllers.AddPreference)
	api.Get("/preferences", controllers.GetPreferences)
	api.Post("/comments", controllers.AddComment)
	api.Get("/comments", controllers.GetComments)
}
