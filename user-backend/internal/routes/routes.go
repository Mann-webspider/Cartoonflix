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

	// Accounts. Viewers sign up here rather than against the admin API, which
	// only runs on the operator's machine.
	api.Post("/auth/signup", controllers.Signup)
	api.Post("/auth/login", controllers.Login)
	api.Get("/auth/me", middleware.RequireAuth, controllers.Me)

	// Public catalogue
	api.Get("/content", controllers.GetCollectionContent)
	api.Get("/contents", controllers.GetContent)
	api.Get("/contents/:id", controllers.GetSingleContent)
	api.Get("/search", controllers.SearchContent)
	api.Get("/comments", controllers.GetComments)

	// Social. The read endpoints work signed out and simply omit the personal
	// half; writing requires an account.
	api.Get("/contents/:id/social", middleware.OptionalAuth, controllers.GetSocial)
	api.Get("/contents/:id/reviews", controllers.ListReviews)
	api.Post("/contents/:id/like", middleware.RequireAuth, controllers.ToggleLike)
	api.Post("/contents/:id/reviews", middleware.RequireAuth, controllers.SaveReview)
	api.Delete("/contents/:id/reviews", middleware.RequireAuth, controllers.DeleteReview)

	// Personalisation — everything here is scoped to the token's user.
	me := api.Group("/me", middleware.RequireAuth)
	me.Get("/continue", controllers.ContinueWatching)
	me.Put("/progress", controllers.SaveProgress)

	api.Post("/preferences", middleware.RequireAuth, controllers.AddPreference)
	api.Get("/preferences", middleware.RequireAuth, controllers.GetPreferences)
	api.Post("/comments", middleware.RequireAuth, controllers.AddComment)
}
