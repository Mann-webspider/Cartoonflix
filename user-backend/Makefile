# Build the Go user API as a Lambda (provided.al2023, x86_64) and zip it.
package:
	mkdir -p dist
	GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -tags lambda.norpc -o dist/bootstrap ./cmd/lambda
	rm -f dist/lambda.zip
	cd dist && zip -q lambda.zip bootstrap

run:
	go run ./cmd

.PHONY: package run
