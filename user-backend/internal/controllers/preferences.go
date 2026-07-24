package controllers

import (
	"context"
	"log"
	"time"
	"user-backend/internal/config"

	"github.com/gofiber/fiber/v2"
	"go.mongodb.org/mongo-driver/bson"
)

type Preference struct {
	UserID string   `json:"user_id" bson:"user_id"`
	Type   string   `json:"type" bson:"type"` // "watchlist" or "favorites"
	Items  []string `json:"items" bson:"items"`
}

func AddPreference(c *fiber.Ctx) error {
	collection := config.GetCollection("streaming-platform", "preferences")

	var preference Preference
	if err := c.BodyParser(&preference); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request payload"})
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	_, err := collection.InsertOne(ctx, preference)
	if err != nil {
		log.Printf("Error adding preference: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to add preference"})
	}

	return c.JSON(fiber.Map{"message": "Preference added successfully"})
}

func GetPreferences(c *fiber.Ctx) error {
	userID := c.Query("user_id")
	if userID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "User ID is required"})
	}

	collection := config.GetCollection("streaming-platform", "preferences")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	filter := bson.M{"user_id": userID}
	var preferences []Preference
	cursor, err := collection.Find(ctx, filter)
	if err != nil {
		log.Printf("Error fetching preferences: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch preferences"})
	}
	defer cursor.Close(ctx)

	if err = cursor.All(ctx, &preferences); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to parse preferences"})
	}

	return c.JSON(fiber.Map{"data": preferences})
}
