package controllers

import (
	"context"
	"log"
	"time"
	"user-backend/internal/config"

	"github.com/gofiber/fiber/v2"
	"go.mongodb.org/mongo-driver/bson"
)

type Comment struct {
	UserID    string `json:"user_id" bson:"user_id"`
	ContentID string `json:"content_id" bson:"content_id"`
	Text      string `json:"text" bson:"text"`
	Deleted   bool   `json:"deleted" bson:"deleted"`
}

func AddComment(c *fiber.Ctx) error {
	collection := config.GetCollection("streaming-platform", "comments")

	var comment Comment
	if err := c.BodyParser(&comment); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request payload"})
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	comment.Deleted = false
	_, err := collection.InsertOne(ctx, comment)
	if err != nil {
		log.Printf("Error adding comment: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to add comment"})
	}

	return c.JSON(fiber.Map{"message": "Comment added successfully"})
}

func GetComments(c *fiber.Ctx) error {
	contentID := c.Query("content_id")
	if contentID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Content ID is required"})
	}

	collection := config.GetCollection("streaming-platform", "comments")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	filter := bson.M{"content_id": contentID, "deleted": false}
	var comments []Comment
	cursor, err := collection.Find(ctx, filter)
	if err != nil {
		log.Printf("Error fetching comments: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch comments"})
	}
	defer cursor.Close(ctx)

	if err = cursor.All(ctx, &comments); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to parse comments"})
	}

	return c.JSON(fiber.Map{"data": comments})
}
