package controllers

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"net"
	"os"
	"strings"
	"time"
	"user-backend/internal/config"

	"github.com/gofiber/fiber/v2"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

const (
	// A batch is one page's worth of activity, flushed on leaving. Anything
	// larger is a client that has stopped behaving and is not worth trusting.
	maxEventsPerBatch = 50
	maxFieldLength    = 300

	// Raw events are the bulky half of a free-tier cluster's 512 MB, and their
	// value decays: six months is long enough to compare a season to the one
	// before it, after which the aggregates in the dashboard are what matter.
	eventRetention = 180 * 24 * time.Hour
)

func events() *mongo.Collection {
	return config.GetCollection("streaming-platform", "events")
}

// Event types the collector will store. A whitelist rather than free text: the
// dashboard groups on this field, and anything unrecognised would either
// silently vanish from every count or quietly invent a new row in one.
var allowedEventTypes = map[string]bool{
	"pageview":      true,
	"search":        true,
	"title_view":    true,
	"play_start":    true,
	"play_progress": true,
	"play_complete": true,
	"signup":        true,
	"login":         true,
}

// Event is one thing a visitor did.
//
// The client supplies what only it knows — which page, which title, how far
// through — and the server supplies everything about *who*: the account, the
// address, the country. That split is deliberate. A browser that could name its
// own user id or country could attribute one person's viewing to another, and
// the numbers would be worth nothing.
type Event struct {
	Type      string `bson:"type"`
	Path      string `bson:"path,omitempty"`
	ContentID string `bson:"content_id,omitempty"`
	Season    int    `bson:"season,omitempty"`
	Episode   int    `bson:"episode,omitempty"`
	Query     string `bson:"query,omitempty"`
	Percent   int    `bson:"percent,omitempty"`
	Seconds   int    `bson:"seconds,omitempty"`
	// How many results a search returned.
	//
	// Stored even when zero, which omitempty would have dropped — and zero is
	// the only value here worth reading, because it names something a viewer
	// expected the library to have. Written that way first, the panel listing
	// failed searches was permanently empty and looked like nobody had ever
	// searched for anything missing.
	Count     int       `bson:"count"`
	SessionID string    `bson:"session_id,omitempty"`
	VisitorID string    `bson:"visitor_id,omitempty"`
	UserID    string    `bson:"user_id,omitempty"`
	Email     string    `bson:"email,omitempty"`
	Referrer  string    `bson:"referrer,omitempty"`
	Source    string    `bson:"utm_source,omitempty"`
	Medium    string    `bson:"utm_medium,omitempty"`
	Campaign  string    `bson:"utm_campaign,omitempty"`
	Device    string    `bson:"device,omitempty"`
	Browser   string    `bson:"browser,omitempty"`
	OS        string    `bson:"os,omitempty"`
	Country   string    `bson:"country,omitempty"`
	Region    string    `bson:"region,omitempty"`
	City      string    `bson:"city,omitempty"`
	IPHash    string    `bson:"ip_hash,omitempty"`
	CreatedAt time.Time `bson:"createdAt"`
}

type eventInput struct {
	Type      string `json:"type"`
	Path      string `json:"path"`
	ContentID string `json:"content_id"`
	Season    int    `json:"season"`
	Episode   int    `json:"episode"`
	Query     string `json:"query"`
	Percent   int    `json:"percent"`
	Seconds   int    `json:"seconds"`
	Count     int    `json:"count"`
	SessionID string `json:"session_id"`
	VisitorID string `json:"visitor_id"`
	Referrer  string `json:"referrer"`
	Source    string `json:"utm_source"`
	Medium    string `json:"utm_medium"`
	Campaign  string `json:"utm_campaign"`
	Device    string `json:"device"`
	Browser   string `json:"browser"`
	OS        string `json:"os"`
}

type eventBatch struct {
	Events []eventInput `json:"events"`
}

func trim(value string) string {
	value = strings.TrimSpace(value)
	if len(value) > maxFieldLength {
		return value[:maxFieldLength]
	}
	return value
}

// clientIP is the address the request actually came from.
//
// Behind the Next.js collector and a Function URL the original address arrives
// in X-Forwarded-For, whose first entry is the client and whose remainder is
// the proxies it crossed. Fiber's own RemoteAddr is the nearest proxy, which is
// the same value for every visitor and therefore useless here.
func clientIP(c *fiber.Ctx) string {
	if forwarded := c.Get("X-Forwarded-For"); forwarded != "" {
		if first := strings.TrimSpace(strings.Split(forwarded, ",")[0]); first != "" {
			return first
		}
	}
	if real := c.Get("X-Real-IP"); real != "" {
		return strings.TrimSpace(real)
	}
	return c.IP()
}

// hashIP identifies a visitor's address without keeping it.
//
// Counting people needs "is this the same address as before", not the address
// itself, and a hash answers that. Storing the real thing would mean holding
// personal data — indefinitely, on a personal project, to compute a number that
// does not need it. The salt is what stops the hash being reversible by trying
// all four billion addresses, so an unset one disables the field rather than
// pretending to protect it.
func hashIP(ip string) string {
	if ip == "" || net.ParseIP(ip) == nil {
		return ""
	}
	salt := os.Getenv("ANALYTICS_SALT")
	if salt == "" {
		return ""
	}
	sum := sha256.Sum256([]byte(salt + ip))
	return hex.EncodeToString(sum[:])[:32]
}

// geoFrom reads the location the edge already worked out.
//
// Vercel and CloudFront both resolve the address to a place before the request
// reaches any code, and pass it in headers. Taking it from there costs nothing,
// needs no geolocation database in the bundle and no third-party lookup on the
// request path — and the value is as good as the network's, which is better
// than most.
func geoFrom(c *fiber.Ctx) (country, region, city string) {
	first := func(names ...string) string {
		for _, name := range names {
			if value := trim(c.Get(name)); value != "" {
				return value
			}
		}
		return ""
	}

	country = first("X-Vercel-IP-Country", "CloudFront-Viewer-Country", "X-Geo-Country")
	region = first("X-Vercel-IP-Country-Region", "CloudFront-Viewer-Country-Region", "X-Geo-Region")
	city = first("X-Vercel-IP-City", "CloudFront-Viewer-City", "X-Geo-City")
	return
}

// CollectEvents records a batch of things a visitor did.
//
// Always answers 204, even for a batch it throws away. This is a beacon: it is
// sent from a page that is often already closing, nothing reads the reply, and
// an error status would only fill a browser console on a page nobody is looking
// at. Analytics failing must never be visible to someone watching a film.
func CollectEvents(c *fiber.Ctx) error {
	var batch eventBatch
	if err := c.BodyParser(&batch); err != nil || len(batch.Events) == 0 {
		return c.SendStatus(fiber.StatusNoContent)
	}

	if len(batch.Events) > maxEventsPerBatch {
		batch.Events = batch.Events[:maxEventsPerBatch]
	}

	// Identity comes from the verified token, never from the payload.
	userID, _ := c.Locals("user_id").(string)
	email := ""
	if userID != "" {
		email = emailFor(c.Context(), userID)
	}

	country, region, city := geoFrom(c)
	ipHash := hashIP(clientIP(c))
	now := time.Now().UTC()

	documents := make([]interface{}, 0, len(batch.Events))
	for _, in := range batch.Events {
		if !allowedEventTypes[in.Type] {
			continue
		}

		documents = append(documents, Event{
			Type:      in.Type,
			Path:      trim(in.Path),
			ContentID: trim(in.ContentID),
			Season:    in.Season,
			Episode:   in.Episode,
			Query:     trim(in.Query),
			Percent:   in.Percent,
			Seconds:   in.Seconds,
			Count:     in.Count,
			SessionID: trim(in.SessionID),
			VisitorID: trim(in.VisitorID),
			UserID:    userID,
			Email:     email,
			Referrer:  trim(in.Referrer),
			Source:    trim(in.Source),
			Medium:    trim(in.Medium),
			Campaign:  trim(in.Campaign),
			Device:    trim(in.Device),
			Browser:   trim(in.Browser),
			OS:        trim(in.OS),
			Country:   country,
			Region:    region,
			City:      city,
			IPHash:    ipHash,
			CreatedAt: now,
		})
	}

	if len(documents) > 0 {
		// Unordered: one malformed document should not discard the rest of a
		// visit, and nothing downstream depends on insertion order.
		_, _ = events().InsertMany(c.Context(), documents, options.InsertMany().SetOrdered(false))
	}

	return c.SendStatus(fiber.StatusNoContent)
}

// EnsureEventIndexes backs the dashboard's queries and bounds the collection.
//
// The TTL index is the one that matters on a free tier: without it this
// collection is the only thing here that grows without limit, and it would
// eventually take the database down with it — at which point the catalogue
// stops loading because of a feature nobody was looking at.
func EnsureEventIndexes(ctx context.Context) error {
	_, err := events().Indexes().CreateMany(ctx, []mongo.IndexModel{
		{Keys: bson.D{{Key: "createdAt", Value: -1}}},
		{Keys: bson.D{{Key: "type", Value: 1}, {Key: "createdAt", Value: -1}}},
		{Keys: bson.D{{Key: "content_id", Value: 1}, {Key: "type", Value: 1}}},
		{Keys: bson.D{{Key: "session_id", Value: 1}}},
		{
			Keys:    bson.D{{Key: "createdAt", Value: 1}},
			Options: options.Index().SetExpireAfterSeconds(int32(eventRetention.Seconds())),
		},
	})
	return err
}
