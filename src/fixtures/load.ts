import { readFile } from "node:fs/promises";
import path from "node:path";

import { validateFixtureData, type FixtureData } from "./schema";

export interface FixtureSource {
  students: unknown;
  projects: unknown;
  skills: unknown;
}

export async function loadFixtureSource(
  fixtureDirectory = path.join(process.cwd(), "data", "fixtures"),
): Promise<FixtureSource> {
  const [students, projects, skills] = await Promise.all([
    readJsonFile(path.join(fixtureDirectory, "students.json")),
    readJsonFile(path.join(fixtureDirectory, "projects.json")),
    readJsonFile(path.join(fixtureDirectory, "skills.json")),
  ]);

  return { students, projects, skills };
}

export async function loadAndValidateFixtures(
  fixtureDirectory?: string,
): Promise<FixtureData> {
  return validateFixtureData(await loadFixtureSource(fixtureDirectory));
}

async function readJsonFile(filePath: string): Promise<unknown> {
  let contents: string;

  try {
    contents = await readFile(filePath, "utf8");
  } catch (error) {
    throw new Error(`Unable to read fixture file ${filePath}.`, { cause: error });
  }

  try {
    return JSON.parse(contents) as unknown;
  } catch (error) {
    throw new Error(`Fixture file ${filePath} does not contain valid JSON.`, {
      cause: error,
    });
  }
}
