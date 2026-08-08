package controllers

import (
	"context"
	"log"
	"strings"
	"time"
	"user-backend/internal/config"

	"github.com/gofiber/fiber/v2"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

/*
Comments are discussion, and deliberately not reviews.

A review is an evaluation: one per person, carries a rating, and belongs on the
title page where someone decides whether to watch. A comment is conversation:
many per person, no rating, and belongs on the watch page alongside the video.
Keeping them apart is what stops the same page growing two nearly identical text
boxes.
*/

const (
	maxCommentLength = 2000
	commentPageSize  = 100
)

func comments() *mongo.Collection {
	return config.GetCollection("streaming-platform", "comments")
}

// Username is denormalised so listing a thread is one query. A viewer renaming
// themselves leaves older comments under the old name, which is the accepted
// cost of not joining on every read.
type Comment struct {
	ID        primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	UserID    string             `json:"user_id" bson:"user_id"`
	Username  string             `json:"username" bson:"username"`
	ContentID string             `json:"content_id" bson:"content_id"`
	// Set only for a comment left against one episode of a series.
	Season    int       `json:"season,omitempty" bson:"season,omitempty"`
	Episode   int       `json:"episode,omitempty" bson:"episode,omitempty"`
	Text      string    `json:"text" bson:"text"`
	CreatedAt time.Time `json:"created_at" bson:"createdAt"`
}

type commentInput struct {
	Text    string `json:"text"`
	Season  int    `json:"season"`
	Episode int    `json:"episode"`
}

// ListComments returns a title's thread, newest first.
//
// Episode comments are included alongside the title's own: a viewer scrolling
// under episode three still wants the conversation about the series, and
// splitting the thread per episode would leave most of them empty.
func ListComments(c *fiber.Ctx) error {
	contentID, err := contentIDParam(c)
	if err != nil {
		return err
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	cursor, err := comments().Find(
		ctx,
		bson.M{"content_id": contentID},
		options.Find().SetSort(bson.D{{Key: "createdAt", Value: -1}}).SetLimit(commentPageSize),
	)
	if err != nil {
		log.Printf("Error fetching comments: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch comments"})
	}
	defer cursor.Close(ctx)

	items := []Comment{}
	if err := cursor.All(ctx, &items); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to parse comments"})
	}

	return c.JSON(fiber.Map{"data": items, "count": len(items)})
}

// AddComment posts to a title's thread.
func AddComment(c *fiber.Ctx) error {
	userID, _ := c.Locals("user_id").(string)
	if userID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	contentID, err := contentIDParam(c)
	if err != nil {
		return err
	}

	var body commentInput
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request payload"})
	}

	body.Text = strings.TrimSpace(body.Text)
	if body.Text == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "A comment cannot be empty"})
	}
	if len(body.Text) > maxCommentLength {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Comments are limited to 2000 characters",
		})
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	comment := Comment{
		ID:        primitive.NewObjectID(),
		UserID:    userID,
		Username:  displayNameFor(ctx, userID),
		ContentID: contentID,
		Season:    body.Season,
		Episode:   body.Episode,
		Text:      body.Text,
		CreatedAt: time.Now(),
	}

	if _, err := comments().InsertOne(ctx, comment); err != nil {
		log.Printf("Error adding comment: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to post comment"})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"data": comment})
}

// DeleteComment removes one of the caller's own comments.
//
// The filter carries the user id as well as the comment id, so a tampered id
// simply matches nothing rather than deleting someone else's post.
func DeleteComment(c *fiber.Ctx) error {
	userID, _ := c.Locals("user_id").(string)
	if userID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	commentID, err := primitive.ObjectIDFromHex(c.Params("commentId"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid comment id"})
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	result, err := comments().DeleteOne(ctx, bson.M{"_id": commentID, "user_id": userID})
	if err != nil {
		log.Printf("Error deleting comment: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to delete comment"})
	}
	if result.DeletedCount == 0 {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Comment not found"})
	}

	return c.JSON(fiber.Map{"message": "Comment removed"})
}

// EnsureCommentIndexes backs the by-content read. Without it every thread load
// is a collection scan.
func EnsureCommentIndexes(ctx context.Context) error {
	_, err := comments().Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys: bson.D{{Key: "content_id", Value: 1}, {Key: "createdAt", Value: -1}},
	})
	return err
}
