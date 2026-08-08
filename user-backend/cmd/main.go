package main

import (
	"context"
	"log"
	"os"
	"user-backend/internal/app"
	"user-backend/internal/config"
	"user-backend/internal/controllers"

	"github.com/joho/godotenv"
)

func main() {
	// Load a local .env if present (optional; ignored in the cloud).
	if err := godotenv.Load(".env"); err != nil {
		log.Println("No .env file loaded, relying on environment")
	}

	// Pull secrets into env when running against AWS.
	config.LoadSecrets(context.Background())
	config.ConnectDB()

	if err := controllers.EnsureUserIndexes(context.Background()); err != nil {
		log.Printf("Could not ensure user indexes: %v", err)
	}
	if err := controllers.EnsureSocialIndexes(context.Background()); err != nil {
		log.Printf("Could not ensure social indexes: %v", err)
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("User Backend running on port %s (origins: %s)", port, app.AllowedOrigins())
	log.Fatal(app.New().Listen(":" + port))
}
