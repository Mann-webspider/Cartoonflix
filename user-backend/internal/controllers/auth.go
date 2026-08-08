package controllers

import (
	"context"
	"errors"
	"log"
	"os"
	"regexp"
	"strings"
	"time"
	"user-backend/internal/config"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"golang.org/x/crypto/bcrypt"
)

// Viewer accounts live in the same `users` collection the admin API writes, so
// the documents keep the same shape and a token minted by either service
// verifies against the other.
type User struct {
	ID           primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	Name         string             `json:"name" bson:"name"`
	Username     string             `json:"username" bson:"username"`
	Email        string             `json:"email" bson:"email"`
	PasswordHash string             `json:"-" bson:"passwordHash"`
	Role         string             `json:"role" bson:"role"`
	CreatedAt    time.Time          `json:"-" bson:"createdAt"`
}

type credentials struct {
	Username string `json:"username"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

const (
	tokenLifetime   = 7 * 24 * time.Hour
	minPasswordLen  = 8
	usersCollection = "users"
)

var usernamePattern = regexp.MustCompile(`^[a-zA-Z0-9_]{3,30}$`)

func users() *mongo.Collection {
	return config.GetCollection("streaming-platform", usersCollection)
}

func publicUser(u User) fiber.Map {
	return fiber.Map{
		"id":       u.ID.Hex(),
		"name":     u.Name,
		"username": u.Username,
		"email":    u.Email,
		"role":     u.Role,
	}
}

// Claims match what the admin API mints so one JWT_SECRET covers both services.
func mintToken(u User) (string, error) {
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub":  u.ID.Hex(),
		"role": u.Role,
		"exp":  time.Now().Add(tokenLifetime).Unix(),
		"iat":  time.Now().Unix(),
	})
	return token.SignedString([]byte(os.Getenv("JWT_SECRET")))
}

func validateSignup(c credentials) error {
	if !usernamePattern.MatchString(c.Username) {
		return errors.New("username must be 3-30 characters, letters, numbers or underscore")
	}
	if !strings.Contains(c.Email, "@") || len(c.Email) < 5 {
		return errors.New("a valid email is required")
	}
	if len(c.Password) < minPasswordLen {
		return errors.New("password must be at least 8 characters")
	}
	return nil
}

// Signup creates a viewer account. Username and email are both unique
// identities, so either can be used to sign in later.
func Signup(c *fiber.Ctx) error {
	var body credentials
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request payload"})
	}

	body.Username = strings.TrimSpace(body.Username)
	body.Email = strings.ToLower(strings.TrimSpace(body.Email))
	if err := validateSignup(body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	taken := users().FindOne(ctx, bson.M{"$or": []bson.M{
		{"email": body.Email},
		{"username": body.Username},
	}})
	if taken.Err() == nil {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "That username or email is already registered"})
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(body.Password), bcrypt.DefaultCost)
	if err != nil {
		log.Printf("Error hashing password: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Signup failed"})
	}

	user := User{
		ID:           primitive.NewObjectID(),
		Name:         body.Username,
		Username:     body.Username,
		Email:        body.Email,
		PasswordHash: string(hash),
		Role:         "user",
		CreatedAt:    time.Now(),
	}
	if _, err := users().InsertOne(ctx, user); err != nil {
		log.Printf("Error creating user: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Signup failed"})
	}

	token, err := mintToken(user)
	if err != nil {
		log.Printf("Error signing token: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Signup failed"})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"token": token, "user": publicUser(user)})
}

// invalidCredentials answers a failed sign-in.
//
// One message for both a missing account and a wrong password: telling them
// apart lets anyone enumerate which emails are registered.
//
// It is a FUNCTION, not a value, and that is the whole point. Assigning
// `invalid := c.Status(401).JSON(...)` to reuse it reads like building a
// response, but Fiber's Status and JSON are side effects that fire the moment
// the line runs — so every request got a 401 status and an error body before
// the password was even checked. A successful login then replaced the body via
// c.JSON and left the 401 behind, returning valid credentials under a failure
// status. Keep this a call.
func invalidCredentials(c *fiber.Ctx) error {
	return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Invalid credentials"})
}

// Login accepts either the username or the email in the `email` field, so the
// viewer does not have to remember which one they signed up with.
func Login(c *fiber.Ctx) error {
	var body credentials
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request payload"})
	}

	identity := strings.TrimSpace(body.Email)
	if identity == "" {
		identity = strings.TrimSpace(body.Username)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var user User
	err := users().FindOne(ctx, bson.M{"$or": []bson.M{
		{"email": strings.ToLower(identity)},
		{"username": identity},
	}}).Decode(&user)

	if err != nil {
		return invalidCredentials(c)
	}
	if bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(body.Password)) != nil {
		return invalidCredentials(c)
	}

	token, err := mintToken(user)
	if err != nil {
		log.Printf("Error signing token: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Login failed"})
	}

	return c.JSON(fiber.Map{"token": token, "user": publicUser(user)})
}

// Me returns the signed-in viewer, used by the app to restore a session.
func Me(c *fiber.Ctx) error {
	userID, _ := c.Locals("user_id").(string)
	id, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var user User
	if err := users().FindOne(ctx, bson.M{"_id": id}).Decode(&user); err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "User not found"})
	}
	return c.JSON(fiber.Map{"user": publicUser(user)})
}

// EnsureUserIndexes enforces the uniqueness the signup check assumes. Without
// it two concurrent signups could both pass the availability check and create
// duplicate accounts.
func EnsureUserIndexes(ctx context.Context) error {
	_, err := users().Indexes().CreateMany(ctx, []mongo.IndexModel{
		{Keys: bson.D{{Key: "email", Value: 1}}, Options: options.Index().SetUnique(true)},
		{
			Keys: bson.D{{Key: "username", Value: 1}},
			// Admin accounts predate usernames, so skip documents without one.
			Options: options.Index().SetUnique(true).SetSparse(true),
		},
	})
	return err
}
