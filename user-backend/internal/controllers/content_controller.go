package controllers

import (
	"context"
	"log"
	"strconv"
	"time"
	"user-backend/internal/config"

	"github.com/gofiber/fiber/v2"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Episode struct {
	Number       int     `json:"episode_number" bson:"episode_number"`
	Title        string  `json:"title,omitempty" bson:"title"`
	Description  string  `json:"description,omitempty" bson:"description"`
	VideoUrl     string  `json:"video_url" bson:"video_url"`
	ThumbnailUrl *string `json:"thumbnail_url,omitempty" bson:"thumbnail_url"`
	Duration     int     `json:"duration_seconds,omitempty" bson:"duration_seconds"`
}

type Season struct {
	Number   int       `json:"season_number" bson:"season_number"`
	Episodes []Episode `json:"episodes" bson:"episodes"`
}

// ID is an ObjectID, not a string: the admin API stores it as one, and
// decoding it into a string fails the whole cursor. primitive.ObjectID
// marshals to its hex form in JSON, so clients still see a plain id.
type Content struct {
	ID           primitive.ObjectID `json:"id" bson:"_id"`
	Title        string             `json:"title" bson:"title"`
	Description  string             `json:"description" bson:"description"`
	Genres       []string           `json:"genres" bson:"genres"`
	Tags         []string           `json:"tags" bson:"tags"`
	Type         string             `json:"type" bson:"type"` // "movie" or "series"
	ReleaseDate  string             `json:"release_date,omitempty" bson:"releaseDate"`
	VideoId      int                `json:"video_id,omitempty" bson:"video_id"`
	VideoUrl     *string            `json:"video_url,omitempty" bson:"video_url"`
	ThumbnailUrl *string            `json:"thumbnail_url,omitempty" bson:"thumbnail_url"`
	PosterUrl    *string            `json:"poster_url,omitempty" bson:"poster_url"`
	Duration     int                `json:"duration_seconds,omitempty" bson:"duration_seconds"`
	Seasons      []Season           `json:"seasons,omitempty" bson:"seasons"`
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

// GetSingleContent powers the detail page. It accepts either the ObjectID or
// the numeric video_id, since links in the app are built from whichever the
// listing carried.
func GetSingleContent(c *fiber.Ctx) error {
	id := c.Params("id")

	filter := bson.M{"deleted": false, "isPublish": true}
	if objectID, err := primitive.ObjectIDFromHex(id); err == nil {
		filter["_id"] = objectID
	} else if videoID, err := strconv.Atoi(id); err == nil {
		filter["video_id"] = videoID
	} else {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid content id"})
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var content Content
	if err := config.GetCollection("streaming-platform", "contents").FindOne(ctx, filter).Decode(&content); err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Content not found"})
	}

	return c.JSON(fiber.Map{"data": content})
}

// SearchContent does a case-insensitive match on title, genres and tags.
func SearchContent(c *fiber.Ctx) error {
	q := c.Query("q")
	if q == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "query 'q' is required"})
	}

	collection := config.GetCollection("streaming-platform", "contents")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	rx := primitive.Regex{Pattern: q, Options: "i"}
	filter := bson.M{
		"deleted":   false,
		"isPublish": true,
		"$or": []bson.M{
			{"title": rx},
			{"genres": rx},
			{"tags": rx},
		},
	}

	cursor, err := collection.Find(ctx, filter)
	if err != nil {
		log.Printf("Error searching content: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to search content"})
	}
	defer cursor.Close(ctx)

	var contents []Content
	if err = cursor.All(ctx, &contents); err != nil {
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
