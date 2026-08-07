# Local media pipeline. Env required: HLS_BUCKET, CLOUDFRONT_DOMAIN, AWS_REGION.
#
#   make ingest SOURCE=./movie.mp4 CONTENT=<contentId>
#   make ingest SOURCE=./ep1.mp4 CONTENT=<contentId> SEASON=1 EPISODE=1
#   make publish CONTENT=<contentId> POSTER=003.jpg THUMBNAIL=005.jpg

EPISODE_ARGS = $(if $(SEASON),--season $(SEASON) --episode $(EPISODE),)

ingest:
	node src/cli.js ingest --source $(SOURCE) --content $(CONTENT) $(EPISODE_ARGS) $(if $(THUMBS),--thumbs $(THUMBS),)

publish:
	node src/cli.js publish --content $(CONTENT) $(EPISODE_ARGS) $(if $(POSTER),--poster $(POSTER),) $(if $(THUMBNAIL),--thumbnail $(THUMBNAIL),)

package:lambdas:
	npm run package:lambdas

.PHONY: ingest publish package:lambdas
