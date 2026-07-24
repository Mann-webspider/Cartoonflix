package controllers

import (
	"context"
	"log"
	"time"
	"user-backend/internal/config"

	"github.com/gofiber/fiber/v2"
	"go.mongodb.org/mongo-driver/bson"
)

type Content struct {
	ID           string   `json:"id" bson:"_id"`
	Title        string   `json:"title" bson:"title"`
	Description  string   `json:"description" bson:"description"`
	Genres       []string `json:"genres" bson:"genres"`
	Tags         []string `json:"tags" bson:"tags"`
	Type         string   `json:"type" bson:"type"` // "movie" or "series"
	VideoId      int      `json:"video_id,omitempty" bson:"video_id"`
	VideoUrl     *string  `json:"video_url,omitempty" bson:"video_url"`
	ThumbnailUrl *string  `json:"thumbnail_url,omitempty" bson:"thumbnail_url"`
	PosterUrl    *string  `json:"poster_url,omitempty" bson:"poster_url"`
}

func GetContent(c *fiber.Ctx) error {
	collection := config.GetCollection("streaming-platform", "contents")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Filter for non-deleted content
	filter := bson.M{"deleted": false, "isPublish": true}

	// Query MongoDB
	cursor, err := collection.Find(ctx, filter)
	if err != nil {
		log.Printf("Error fetching content: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch content"})
	}
	defer cursor.Close(ctx)

	var contents []Content

	if err = cursor.All(ctx, &contents); err != nil {
		log.Printf("Error parsing content: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to parse content"})
	}

	return c.JSON(fiber.Map{"count": len(contents), "data": contents})
}

// For specific collections
func GetCollectionContent(c *fiber.Ctx) error {
	collection := config.GetCollection("streaming-platform", "contents")
	inputString := []string{c.Query("coll")}

	if len(inputString) == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Missing 'string' parameter"})
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Filter for non-deleted content
	filter := bson.M{"deleted": false, "isPublish": true, "tags": bson.M{
		"$in": inputString,
	}}

	// Query MongoDB
	cursor, err := collection.Find(ctx, filter)
	if err != nil {
		log.Printf("Error fetching content: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch content"})
	}
	defer cursor.Close(ctx)

	var contents []Content

	if err = cursor.All(ctx, &contents); err != nil {
		log.Printf("Error parsing content: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to parse content"})
	}

	return c.JSON(fiber.Map{"count": len(contents), "data": contents})
}
