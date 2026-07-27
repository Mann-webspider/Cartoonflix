package main

import (
	"context"

	"user-backend/internal/config"
	"user-backend/internal/routes"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	fiberadapter "github.com/awslabs/aws-lambda-go-api-proxy/fiber"
	"github.com/gofiber/fiber/v2"
)

var fiberLambda *fiberadapter.FiberLambda

func init() {
	// Pull Mongo URI + CloudFront key from Secrets Manager, connect, wire routes.
	config.LoadSecrets(context.Background())
	config.ConnectDB()

	app := fiber.New()
	routes.SetupRoutes(app)
	fiberLambda = fiberadapter.New(app)
}

// API Gateway HTTP API (payload format 2.0).
func handler(ctx context.Context, req events.APIGatewayV2HTTPRequest) (events.APIGatewayV2HTTPResponse, error) {
	return fiberLambda.ProxyWithContextV2(ctx, req)
}

func main() {
	lambda.Start(handler)
}
