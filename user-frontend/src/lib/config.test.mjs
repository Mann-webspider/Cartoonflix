import test from "node:test";
import assert from "node:assert/strict";
import { normaliseApiBase } from "./config.js";

const HOST = "https://abc.lambda-url.ap-south-1.on.aws";

test("a bare Function URL gains the API path", () => {
  // The deployment failure this prevents: a Function URL ends at the host, so
  // pasting it verbatim sent every request to /contents instead of
  // /api/v1/contents — 404 on an otherwise correct deployment.
  assert.equal(normaliseApiBase(HOST), `${HOST}/api/v1`);
  assert.equal(normaliseApiBase(`${HOST}/`), `${HOST}/api/v1`);
});

test("a URL that already carries the API path is left alone", () => {
  assert.equal(normaliseApiBase(`${HOST}/api/v1`), `${HOST}/api/v1`);
  assert.equal(normaliseApiBase(`${HOST}/api/v1/`), `${HOST}/api/v1`);
  // An API Gateway stage URL, which is the other shape people paste.
  const gateway = "https://xyz.execute-api.ap-south-1.amazonaws.com/api/v1";
  assert.equal(normaliseApiBase(gateway), gateway);
});

test("a future version segment is not mangled", () => {
  assert.equal(normaliseApiBase(`${HOST}/api/v2`), `${HOST}/api/v2`);
});

test("surrounding whitespace is tolerated", () => {
  // Pasted values routinely arrive with a trailing newline.
  assert.equal(normaliseApiBase(`  ${HOST}\n`), `${HOST}/api/v1`);
});

test("an unset value stays empty, which is what selects sample data", () => {
  assert.equal(normaliseApiBase(undefined), "");
  assert.equal(normaliseApiBase(""), "");
  assert.equal(normaliseApiBase("   "), "");
});
