package routes

import (
	"user-backend/internal/controllers"

	"github.com/gofiber/fiber/v2"
)

func SetupRoutes(app *fiber.App) {
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
