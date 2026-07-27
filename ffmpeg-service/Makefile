# Local transcode — runs the same pipeline as the cloud, on your laptop.
# Env required: RAW_BUCKET, HLS_BUCKET, CLOUDFRONT_DOMAIN, BACKEND_URL, AWS_REGION
#   make transcode KEY=<contentId>/source.mp4 CONTENT=<contentId>
transcode:
	node src/cli.js --key $(KEY) --content $(CONTENT)

package:lambdas:
	npm run package:lambdas

.PHONY: transcode package:lambdas
