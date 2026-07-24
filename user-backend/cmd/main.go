package main

import (
	"log"
	"os"
	"user-backend/internal/config"
	"user-backend/internal/routes"

	"github.com/gofiber/fiber/v2"
	"github.com/joho/godotenv"
)

func main() {
	// Load environment variables
	err := godotenv.Load(".env")
	if err != nil {
		log.Fatalf("Error loading .env file: %v", err)
	}

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
