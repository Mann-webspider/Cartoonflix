package controllers

import (
	"context"
	"log"
	"time"
	"user-backend/internal/config"

	"github.com/gofiber/fiber/v2"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo/options"
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

	// User identity comes from the token.
	uid, _ := c.Locals("user_id").(string)
	if uid == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}
	preference.UserID = uid

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Upsert so a user has one document per preference type.
	filter := bson.M{"user_id": uid, "type": preference.Type}
	update := bson.M{"$set": bson.M{"items": preference.Items}}
	_, err := collection.UpdateOne(ctx, filter, update, options.Update().SetUpsert(true))
	if err != nil {
		log.Printf("Error saving preference: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to save preference"})
	}

	return c.JSON(fiber.Map{"message": "Preference saved"})
}

func GetPreferences(c *fiber.Ctx) error {
	userID, _ := c.Locals("user_id").(string)
	if userID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
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
