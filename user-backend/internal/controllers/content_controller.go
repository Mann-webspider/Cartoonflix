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

type Subtitle struct {
	Language string `json:"language" bson:"language"`
	Label    string `json:"label" bson:"label"`
	Url      string `json:"url" bson:"url"`
}

type CastMember struct {
	Name       string `json:"name" bson:"name"`
	Character  string `json:"character,omitempty" bson:"character"`
	ProfileUrl string `json:"profile_url,omitempty" bson:"profile_url"`
	Order      int    `json:"order" bson:"order"`
}

type Language struct {
	Code string `json:"code" bson:"code"`
	Name string `json:"name" bson:"name"`
}

// VideoUrl is empty until an episode has been transcoded — a series' episode
// list is seeded from metadata long before anything is playable, so clients
// must treat an empty VideoUrl as "listed but not yet available".
type Episode struct {
	Number       int        `json:"episode_number" bson:"episode_number"`
	Title        string     `json:"title,omitempty" bson:"title"`
	Description  string     `json:"description,omitempty" bson:"description"`
	AirDate      string     `json:"air_date,omitempty" bson:"air_date"`
	VideoUrl     string     `json:"video_url,omitempty" bson:"video_url"`
	ThumbnailUrl *string    `json:"thumbnail_url,omitempty" bson:"thumbnail_url"`
	Duration     int        `json:"duration_seconds,omitempty" bson:"duration_seconds"`
	Subtitles    []Subtitle `json:"subtitles,omitempty" bson:"subtitles"`
	Status       string     `json:"status,omitempty" bson:"status"`
}

type Season struct {
	Number      int       `json:"season_number" bson:"season_number"`
	Title       string    `json:"title,omitempty" bson:"title"`
	Description string    `json:"description,omitempty" bson:"description"`
	PosterUrl   *string   `json:"poster_url,omitempty" bson:"poster_url"`
	AirDate     string    `json:"air_date,omitempty" bson:"air_date"`
	Episodes    []Episode `json:"episodes" bson:"episodes"`
}

// ID is an ObjectID, not a string: the admin API stores it as one, and
// decoding it into a string fails the whole cursor. primitive.ObjectID
// marshals to its hex form in JSON, so clients still see a plain id.
type Content struct {
	ID            primitive.ObjectID `json:"id" bson:"_id"`
	Title         string             `json:"title" bson:"title"`
	OriginalTitle string             `json:"original_title,omitempty" bson:"original_title"`
	Tagline       string             `json:"tagline,omitempty" bson:"tagline"`
	Description   string             `json:"description" bson:"description"`
	Genres        []string           `json:"genres" bson:"genres"`
	Tags          []string           `json:"tags" bson:"tags"`
	Type          string             `json:"type" bson:"type"` // "movie" or "series"
	ReleaseDate   string             `json:"release_date,omitempty" bson:"releaseDate"`

	// Enriched from TMDB during ingest.
	Cast           []CastMember `json:"cast,omitempty" bson:"cast"`
	Directors      []string     `json:"directors,omitempty" bson:"directors"`
	Writers        []string     `json:"writers,omitempty" bson:"writers"`
	Studios        []string     `json:"studios,omitempty" bson:"studios"`
	Languages      []Language   `json:"languages,omitempty" bson:"languages"`
	Certification  string       `json:"certification,omitempty" bson:"certification"`
	TmdbScore      float64      `json:"tmdb_score,omitempty" bson:"tmdb_score"`
	TmdbVotes      int          `json:"tmdb_votes,omitempty" bson:"tmdb_votes"`
	ImdbId         string       `json:"imdb_id,omitempty" bson:"imdb_id"`
	RuntimeMinutes int          `json:"runtime_minutes,omitempty" bson:"runtime_minutes"`

	// Produced by the ingest pipeline.
	VideoId      int        `json:"video_id,omitempty" bson:"video_id"`
	VideoUrl     *string    `json:"video_url,omitempty" bson:"video_url"`
	ThumbnailUrl *string    `json:"thumbnail_url,omitempty" bson:"thumbnail_url"`
	PosterUrl    *string    `json:"poster_url,omitempty" bson:"poster_url"`
	BackdropUrl  *string    `json:"backdrop_url,omitempty" bson:"backdrop_url"`
	Duration     int        `json:"duration_seconds,omitempty" bson:"duration_seconds"`
	Subtitles    []Subtitle `json:"subtitles,omitempty" bson:"subtitles"`

	Seasons []Season `json:"seasons,omitempty" bson:"seasons"`
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
