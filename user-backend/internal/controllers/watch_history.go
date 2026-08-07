package controllers

import (
	"context"
	"log"
	"time"
	"user-backend/internal/config"

	"github.com/gofiber/fiber/v2"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// A title is treated as finished past this point — the rest is credits, and
// offering to "continue" it would push watched titles to the front of the rail
// forever.
const completedFraction = 0.95

const continueWatchingLimit = 20

type WatchProgress struct {
	ContentID       string `json:"content_id" bson:"content_id"`
	Season          int    `json:"season,omitempty" bson:"season,omitempty"`
	Episode         int    `json:"episode,omitempty" bson:"episode,omitempty"`
	PositionSeconds int    `json:"position_seconds" bson:"position_seconds"`
	DurationSeconds int    `json:"duration_seconds" bson:"duration_seconds"`
}

func watchHistory() *mongo.Collection {
	return config.GetCollection("streaming-platform", "watch_history")
}

// SaveProgress records where a viewer stopped, so playback resumes there on any
// device rather than only in the browser that holds the local storage.
func SaveProgress(c *fiber.Ctx) error {
	userID, _ := c.Locals("user_id").(string)
	if userID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	var body WatchProgress
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request payload"})
	}
	if body.ContentID == "" || body.DurationSeconds <= 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "content_id and duration_seconds are required"})
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// One row per user per episode: re-watching updates in place instead of
	// growing the collection on every seek.
	filter := bson.M{
		"user_id":    userID,
		"content_id": body.ContentID,
		"season":     body.Season,
		"episode":    body.Episode,
	}
	update := bson.M{"$set": bson.M{
		"position_seconds": body.PositionSeconds,
		"duration_seconds": body.DurationSeconds,
		"updatedAt":        time.Now(),
	}}

	if _, err := watchHistory().UpdateOne(ctx, filter, update, options.Update().SetUpsert(true)); err != nil {
		log.Printf("Error saving progress: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to save progress"})
	}

	return c.JSON(fiber.Map{"message": "Progress saved"})
}

// ContinueWatching returns partially watched titles, most recent first, with
// the content details already merged so the rail renders from one request.
func ContinueWatching(c *fiber.Ctx) error {
	userID, _ := c.Locals("user_id").(string)
	if userID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	cursor, err := watchHistory().Find(
		ctx,
		bson.M{"user_id": userID},
		options.Find().SetSort(bson.D{{Key: "updatedAt", Value: -1}}).SetLimit(continueWatchingLimit),
	)
	if err != nil {
		log.Printf("Error fetching watch history: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch watch history"})
	}
	defer cursor.Close(ctx)

	var entries []WatchProgress
	if err := cursor.All(ctx, &entries); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to parse watch history"})
	}

	ids := make([]primitive.ObjectID, 0, len(entries))
	unfinished := make([]WatchProgress, 0, len(entries))
	for _, entry := range entries {
		if float64(entry.PositionSeconds) >= float64(entry.DurationSeconds)*completedFraction {
			continue
		}
		id, err := primitive.ObjectIDFromHex(entry.ContentID)
		if err != nil {
			continue // a malformed id is stale data, not a reason to fail the request
		}
		ids = append(ids, id)
		unfinished = append(unfinished, entry)
	}

	if len(ids) == 0 {
		return c.JSON(fiber.Map{"count": 0, "data": []fiber.Map{}})
	}

	contentCursor, err := config.GetCollection("streaming-platform", "contents").Find(ctx, bson.M{
		"_id":       bson.M{"$in": ids},
		"deleted":   false,
		"isPublish": true,
	})
	if err != nil {
		log.Printf("Error fetching content for watch history: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch content"})
	}
	defer contentCursor.Close(ctx)

	var contents []Content
	if err := contentCursor.All(ctx, &contents); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to parse content"})
	}

	byID := make(map[string]Content, len(contents))
	for _, item := range contents {
		byID[item.ID.Hex()] = item
	}

	// Rebuild in watch-history order: the Mongo $in query returns whatever
	// order the index yields, which is not "most recently watched".
	data := make([]fiber.Map, 0, len(unfinished))
	for _, entry := range unfinished {
		item, ok := byID[entry.ContentID]
		if !ok {
			continue // unpublished or deleted since it was watched
		}
		data = append(data, fiber.Map{
			"content":          item,
			"season":           entry.Season,
			"episode":          entry.Episode,
			"position_seconds": entry.PositionSeconds,
			"duration_seconds": entry.DurationSeconds,
		})
	}

	return c.JSON(fiber.Map{"count": len(data), "data": data})
}
