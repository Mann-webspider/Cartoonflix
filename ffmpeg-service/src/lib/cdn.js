/**
 * CloudFront URL construction.
 *
 * Shared because both publish paths build these, and a URL that is wrong here
 * is not wrong loudly: it is written to the database and only fails later, at
 * playback, on a title that reported a successful upload.
 */

/**
 * Reduce a configured CloudFront value to a bare host.
 *
 * The distribution is a host, but the value routinely arrives with a scheme
 * already attached — that is how the AWS console presents it, so that is what
 * gets pasted into an environment file. Prefixing a second `https://` yields
 * `https://https://…`, which no player will fetch.
 */
export const cdnHost = (domain) =>
  String(domain || "")
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/+$/, "");

export const cdnUrl = (domain, key) => `https://${cdnHost(domain)}/${key}`;
