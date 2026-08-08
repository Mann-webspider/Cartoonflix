package controllers

import (
	"context"
	"log"
	"math"
	"strings"
	"time"
	"user-backend/internal/config"

	"github.com/gofiber/fiber/v2"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

const (
	maxReviewLength = 4000
	reviewPageSize  = 50
)

func likes() *mongo.Collection {
	return config.GetCollection("streaming-platform", "likes")
}

func reviews() *mongo.Collection {
	return config.GetCollection("streaming-platform", "reviews")
}

// Username is denormalised onto the review so listing a title's reviews is one
// query. A viewer changing their username later leaves old reviews showing the
// old name, which is an acceptable trade for not joining on every read.
type Review struct {
	ID        primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	UserID    string             `json:"user_id" bson:"user_id"`
	Username  string             `json:"username" bson:"username"`
	ContentID string             `json:"content_id" bson:"content_id"`
	Rating    int                `json:"rating" bson:"rating"`
	Body      string             `json:"body" bson:"body"`
	CreatedAt time.Time          `json:"created_at" bson:"createdAt"`
	UpdatedAt time.Time          `json:"updated_at" bson:"updatedAt"`
}

type reviewInput struct {
	Rating int    `json:"rating"`
	Body   string `json:"body"`
}

// contentIDParam validates the id before it reaches a query, so a malformed
// path cannot turn into a collection scan.
func contentIDParam(c *fiber.Ctx) (string, error) {
	id := c.Params("id")
	if _, err := primitive.ObjectIDFromHex(id); err != nil {
		return "", fiber.NewError(fiber.StatusBadRequest, "Invalid content id")
	}
	return id, nil
}

// ToggleLike flips the signed-in viewer's like and returns the resulting state.
// Returning the count as well means the button never has to guess.
func ToggleLike(c *fiber.Ctx) error {
	userID, _ := c.Locals("user_id").(string)
	if userID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	contentID, err := contentIDParam(c)
	if err != nil {
		return err
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	filter := bson.M{"user_id": userID, "content_id": contentID}
	deleted, err := likes().DeleteOne(ctx, filter)
	if err != nil {
		log.Printf("Error toggling like: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update like"})
	}

	liked := false
	if deleted.DeletedCount == 0 {
		if _, err := likes().InsertOne(ctx, bson.M{
			"user_id":    userID,
			"content_id": contentID,
			"createdAt":  time.Now(),
		}); err != nil {
			log.Printf("Error creating like: %v", err)
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update like"})
		}
		liked = true
	}

	count, err := likes().CountDocuments(ctx, bson.M{"content_id": contentID})
	if err != nil {
		count = 0
	}

	return c.JSON(fiber.Map{"liked": liked, "likes": count})
}

// GetSocial returns everything the title page needs in one request: the like
// count, whether this viewer liked it, and the review average and total.
// Anonymous viewers get the public numbers with the personal fields false.
func GetSocial(c *fiber.Ctx) error {
	contentID, err := contentIDParam(c)
	if err != nil {
		return err
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	likeCount, err := likes().CountDocuments(ctx, bson.M{"content_id": contentID})
	if err != nil {
		log.Printf("Error counting likes: %v", err)
		likeCount = 0
	}

	liked := false
	var myReview *Review
	if userID, _ := c.Locals("user_id").(string); userID != "" {
		if n, err := likes().CountDocuments(ctx, bson.M{"user_id": userID, "content_id": contentID}); err == nil {
			liked = n > 0
		}
		var mine Review
		if err := reviews().FindOne(ctx, bson.M{"user_id": userID, "content_id": contentID}).Decode(&mine); err == nil {
			myReview = &mine
		}
	}

	average, total := reviewSummary(ctx, contentID)

	return c.JSON(fiber.Map{
		"likes":          likeCount,
		"liked":          liked,
		"review_average": average,
		"review_count":   total,
		"my_review":      myReview,
	})
}

func reviewSummary(ctx context.Context, contentID string) (float64, int64) {
	cursor, err := reviews().Aggregate(ctx, mongo.Pipeline{
		{{Key: "$match", Value: bson.M{"content_id": contentID}}},
		{{Key: "$group", Value: bson.M{
			"_id":     nil,
			"average": bson.M{"$avg": "$rating"},
			"total":   bson.M{"$sum": 1},
		}}},
	})
	if err != nil {
		return 0, 0
	}
	defer cursor.Close(ctx)

	var rows []struct {
		Average float64 `bson:"average"`
		Total   int64   `bson:"total"`
	}
	if err := cursor.All(ctx, &rows); err != nil || len(rows) == 0 {
		return 0, 0
	}
	return roundToOneDecimal(rows[0].Average), rows[0].Total
}

// One decimal place: on a handful of ratings the extra digits are noise, and
// 4.333333333 on screen reads as a bug.
func roundToOneDecimal(value float64) float64 {
	return math.Round(value*10) / 10
}

// ListReviews returns a title's reviews, newest first.
func ListReviews(c *fiber.Ctx) error {
	contentID, err := contentIDParam(c)
	if err != nil {
		return err
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	cursor, err := reviews().Find(
		ctx,
		bson.M{"content_id": contentID},
		options.Find().SetSort(bson.D{{Key: "updatedAt", Value: -1}}).SetLimit(reviewPageSize),
	)
	if err != nil {
		log.Printf("Error fetching reviews: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch reviews"})
	}
	defer cursor.Close(ctx)

	items := []Review{}
	if err := cursor.All(ctx, &items); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to parse reviews"})
	}

	average, total := reviewSummary(ctx, contentID)
	return c.JSON(fiber.Map{"data": items, "average": average, "count": total})
}

// SaveReview writes the viewer's review, replacing their previous one.
//
// One review per viewer per title, enforced by the upsert: letting someone post
// repeatedly would let a single account move the average at will.
func SaveReview(c *fiber.Ctx) error {
	userID, _ := c.Locals("user_id").(string)
	if userID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	contentID, err := contentIDParam(c)
	if err != nil {
		return err
	}

	var body reviewInput
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request payload"})
	}
	if body.Rating < 1 || body.Rating > 5 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Rating must be between 1 and 5"})
	}

	body.Body = strings.TrimSpace(body.Body)
	if len(body.Body) > maxReviewLength {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Reviews are limited to 4000 characters",
		})
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	username := displayNameFor(ctx, userID)
	now := time.Now()
	update := bson.M{
		"$set": bson.M{
			"rating":    body.Rating,
			"body":      body.Body,
			"username":  username,
			"updatedAt": now,
		},
		"$setOnInsert": bson.M{"createdAt": now},
	}

	if _, err := reviews().UpdateOne(
		ctx,
		bson.M{"user_id": userID, "content_id": contentID},
		update,
		options.Update().SetUpsert(true),
	); err != nil {
		log.Printf("Error saving review: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to save review"})
	}

	average, total := reviewSummary(ctx, contentID)
	return c.JSON(fiber.Map{"message": "Review saved", "average": average, "count": total})
}

// DeleteReview removes the signed-in viewer's own review, and only theirs —
// the filter is scoped by user id, so there is no review id to tamper with.
func DeleteReview(c *fiber.Ctx) error {
	userID, _ := c.Locals("user_id").(string)
	if userID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	contentID, err := contentIDParam(c)
	if err != nil {
		return err
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if _, err := reviews().DeleteOne(ctx, bson.M{"user_id": userID, "content_id": contentID}); err != nil {
		log.Printf("Error deleting review: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to delete review"})
	}

	average, total := reviewSummary(ctx, contentID)
	return c.JSON(fiber.Map{"message": "Review removed", "average": average, "count": total})
}

// EnsureSocialIndexes enforces one like and one review per viewer per title,
// which the upserts above assume, and backs the by-content reads.
func EnsureSocialIndexes(ctx context.Context) error {
	if _, err := likes().Indexes().CreateMany(ctx, []mongo.IndexModel{
		{
			Keys:    bson.D{{Key: "user_id", Value: 1}, {Key: "content_id", Value: 1}},
			Options: options.Index().SetUnique(true),
		},
		{Keys: bson.D{{Key: "content_id", Value: 1}}},
	}); err != nil {
		return err
	}

	_, err := reviews().Indexes().CreateMany(ctx, []mongo.IndexModel{
		{
			Keys:    bson.D{{Key: "user_id", Value: 1}, {Key: "content_id", Value: 1}},
			Options: options.Index().SetUnique(true),
		},
		{Keys: bson.D{{Key: "content_id", Value: 1}, {Key: "updatedAt", Value: -1}}},
	})
	return err
}
