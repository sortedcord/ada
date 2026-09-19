import { test, expect } from '@playwright/test';

const aggregate = {
  scenario: {
    id: 'scenario_1',
    revisionId: 'revision_1',
    slug: 'fixture',
    title: 'Fixture',
    premise: '',
    description: '',
    genre: 'adventure',
    tone: '',
    tags: [],
    worldRules: [],
    contentBoundaries: [],
    startLocationId: 'location_1',
    config: { retrieval: { maxCandidates: 20, maxSelected: 5 } },
  },
  entities: [],
  relationships: [],
  locations: [],
  locationEdges: [],
  storyCards: [],
  storyCardLinks: [],
  plotArcs: [],
  plotPoints: [],
};

test('authors and validates a scenario through the builder UI', async ({ page }) => {
  let title = 'Fixture';
  await page.route('**/api/v1/scenarios**', async (route) => {
    const request = route.request();
    if (request.method() === 'GET')
      return route.fulfill({
        json: [
          {
            id: 'scenario_1',
            slug: 'fixture',
            title,
            status: 'draft',
            currentRevision: 1,
            version: 1,
          },
        ],
      });
    if (request.method() === 'POST')
      return route.fulfill({
        status: 201,
        json: { scenarioId: 'scenario_1', revisionId: 'revision_1' },
      });
    if (request.method() === 'PATCH') {
      title = 'Updated title';
      return route.fulfill({
        json: {
          id: 'scenario_1',
          slug: 'fixture',
          title,
          status: 'draft',
          currentRevision: 1,
          version: 2,
        },
      });
    }
    return route.fulfill({ json: aggregate });
  });
  await page.route('**/api/v1/scenarios/scenario_1', async (route) =>
    route.fulfill({
      json: {
        scenario: {
          id: 'scenario_1',
          slug: 'fixture',
          title,
          status: 'draft',
          currentRevision: 1,
          version: 1,
        },
        revision: { id: 'revision_1', version: 1, status: 'draft', aggregate },
      },
    }),
  );
  await page.route('**/api/v1/scenarios/scenario_1/validate', async (route) =>
    route.fulfill({ json: { valid: true, errors: [], warnings: [] } }),
  );
  await page.goto('/scenarios');
  await page.getByRole('link', { name: 'Create draft' }).click();
  await page.getByLabel('Title').fill('My scenario');
  await page.getByLabel('Slug').fill('my-scenario');
  await page.getByRole('button', { name: 'Create draft' }).click();
  await expect(page.getByRole('heading', { name: 'premise' })).toBeVisible();
  await page.getByRole('button', { name: 'validate' }).click();
  await page.getByRole('button', { name: 'Validate scenario' }).click();
  await expect(page.getByText('Scenario is valid.')).toBeVisible();
});
