import { ZodError } from "zod";

import { loadAndValidateFixtures } from "../src/fixtures/load";

try {
  const fixtures = await loadAndValidateFixtures();
  const contributorCount = fixtures.projects.reduce(
    (count, project) => count + project.contributors.length,
    0,
  );

  console.log("Fixture validation passed.");
  console.log(`Students: ${fixtures.students.length}`);
  console.log(`Projects: ${fixtures.projects.length}`);
  console.log(`Skills: ${fixtures.skills.length}`);
  console.log(`Project contributors: ${contributorCount}`);
} catch (error) {
  if (error instanceof ZodError) {
    console.error("Fixture validation failed:");
    for (const issue of error.issues) {
      console.error(`- ${issue.path.join(".")}: ${issue.message}`);
    }
  } else {
    console.error(error);
  }
  process.exitCode = 1;
}
