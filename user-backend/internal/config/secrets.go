package config

import (
	"context"
	"log"
	"os"

	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/secretsmanager"
)

// LoadSecrets pulls secret values into env vars when their ARNs are provided,
// so downstream code keeps reading MONGO_URI / CLOUDFRONT_PRIVATE_KEY unchanged.
// No-op when neither ARN is set (local dev uses a .env instead).
func LoadSecrets(ctx context.Context) {
	mongoArn := os.Getenv("MONGO_SECRET_ARN")
	cfArn := os.Getenv("CF_KEY_SECRET_ARN")
	if mongoArn == "" && cfArn == "" {
		return
	}

	cfg, err := awsconfig.LoadDefaultConfig(ctx)
	if err != nil {
		log.Fatalf("aws config: %v", err)
	}
	sm := secretsmanager.NewFromConfig(cfg)

	fetch := func(arn, env string) {
		if arn == "" {
			return
		}
		out, err := sm.GetSecretValue(ctx, &secretsmanager.GetSecretValueInput{SecretId: &arn})
		if err != nil {
			log.Fatalf("get secret for %s: %v", env, err)
		}
		if out.SecretString != nil {
			os.Setenv(env, *out.SecretString)
		}
	}

	fetch(mongoArn, "MONGO_URI")
	fetch(cfArn, "CLOUDFRONT_PRIVATE_KEY")
}
