package main

import (
	"context"
	"log"

	"user-backend/internal/app"
	"user-backend/internal/config"
	"user-backend/internal/controllers"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	fiberadapter "github.com/awslabs/aws-lambda-go-api-proxy/fiber"
)

var fiberLambda *fiberadapter.FiberLambda

func init() {
	// Pull Mongo URI + CloudFront key from Secrets Manager, connect, wire routes.
	config.LoadSecrets(context.Background())
	config.ConnectDB()

	// Cheap and idempotent, so it runs on cold start rather than needing a
	// separate migration step. A failure here is not fatal: signup still works,
	// it just loses its race protection.
	if err := controllers.EnsureUserIndexes(context.Background()); err != nil {
		log.Printf("Could not ensure user indexes: %v", err)
	}
	if err := controllers.EnsureSocialIndexes(context.Background()); err != nil {
		log.Printf("Could not ensure social indexes: %v", err)
	}
	if err := controllers.EnsureCommentIndexes(context.Background()); err != nil {
		log.Printf("Could not ensure comment indexes: %v", err)
	}

	// Shared with the local server, so this entrypoint cannot drift out of sync
	// on middleware again — it previously shipped with no CORS at all.
	fiberLambda = fiberadapter.New(app.New())
}

// API Gateway HTTP API (payload format 2.0).
func handler(ctx context.Context, req events.APIGatewayV2HTTPRequest) (events.APIGatewayV2HTTPResponse, error) {
	return fiberLambda.ProxyWithContextV2(ctx, req)
}

func main() {
	lambda.Start(handler)
}
