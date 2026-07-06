import serverless from "serverless-http";
import { createApp } from "../../src/app";

// Without this, serverless-http encodes every response body as UTF-8 text
// before packaging it into the Lambda-style response -- fine for JSON, but
// it corrupts binary responses like GET /venues/:id/photo (each invalid
// UTF-8 byte sequence gets replaced with U+FFFD), producing a broken image
// in the browser even though the API returns 200 with the right
// Content-Type.
export const handler = serverless(createApp(), { binary: ["image/*"] });
