/**
 * Where the viewer API lives.
 *
 * `NEXT_PUBLIC_API_URL` is read once here rather than in each module, and
 * normalised, because the value is copied by hand from a Lambda Function URL or
 * an API Gateway stage and the two are shaped differently. A Function URL ends
 * at the host, so pasting it verbatim produced requests to `/contents` instead
 * of `/api/v1/contents` — every one a 404, on a deployment that otherwise
 * looked correct.
 *
 * Accepts, and treats identically:
 *   https://abc.lambda-url.ap-south-1.on.aws
 *   https://abc.lambda-url.ap-south-1.on.aws/
 *   https://abc.lambda-url.ap-south-1.on.aws/api/v1
 *   https://abc.lambda-url.ap-south-1.on.aws/api/v1/
 */
export const normaliseApiBase = (raw) => {
  const trimmed = (raw || "").trim().replace(/\/+$/, "");
  if (!trimmed) return "";
  // Already carries a version segment — leave it alone, including a future /v2.
  return /\/api\/v\d+$/.test(trimmed) ? trimmed : `${trimmed}/api/v1`;
};

/** Empty when unconfigured, which is what puts the app on sample data. */
export const API_BASE = normaliseApiBase(process.env.NEXT_PUBLIC_API_URL);
