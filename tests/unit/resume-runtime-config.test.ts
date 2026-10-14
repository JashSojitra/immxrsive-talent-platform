import nextConfig from "../../next.config";

import { describe, expect, test } from "vitest";

describe("deployed resume extraction runtime", () => {
  test("traces the PDF.js fake-worker module into the production function", () => {
    expect(nextConfig.outputFileTracingIncludes?.[
      "/api/v1/student/profile/resume/extract"
    ]).toContain("./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs");
  });
});
