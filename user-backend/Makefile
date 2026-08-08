# Build and package the Go user API as a Lambda (provided.al2023, x86_64).
#
# Packaging goes through tools/package rather than the `zip` command: zip is not
# present on Windows, and Compress-Archive drops the executable bit, which makes
# the function fail at cold start with "permission denied".

build:
	go build -o dist/bootstrap ./cmd/lambda

# GOOS/GOARCH are set here so the artifact is a Linux binary whatever the host.
package:
	GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -tags lambda.norpc -o dist/bootstrap ./cmd/lambda
	go run ./tools/package -in dist/bootstrap -out dist/lambda.zip

# Push a new build to an existing function.
#   make deploy FUNCTION=cartoonflix-user-api
deploy: package
	aws lambda update-function-code \
		--function-name $(FUNCTION) \
		--zip-file fileb://dist/lambda.zip \
		--no-cli-pager

run:
	go run ./cmd

test:
	go test ./...

.PHONY: build package deploy run test
