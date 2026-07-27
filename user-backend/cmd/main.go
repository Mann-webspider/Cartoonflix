package main

import (
	"context"
	"log"
	"os"
	"user-backend/internal/config"
	"user-backend/internal/routes"

	"github.com/gofiber/fiber/v2"
	"github.com/joho/godotenv"
)

func main() {
	// Load a local .env if present (optional; ignored in the cloud).
	if err := godotenv.Load(".env"); err != nil {
		log.Println("No .env file loaded, relying on environment")
	}

	// Pull secrets into env when running against AWS.
	config.LoadSecrets(context.Background())

	// Initialize Fiber app
	app := fiber.New()

	// Initialize MongoDB connection
	config.ConnectDB()

	// Set up routes
	routes.SetupRoutes(app)

	// Start server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("User Backend running on port %s", port)
	log.Fatal(app.Listen(":" + port))
}
