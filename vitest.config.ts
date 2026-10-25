import { defineConfig } from 'vitest/config';
import { BaseSequencer, type TestSpecification } from 'vitest/node';

/**
 * The API tests count users and sessions, so the browser tests (which add their own) run after them, one file at a
 * time, against the same server.
 */
class ApiTestsFirst extends BaseSequencer {
    override async sort(files: TestSpecification[]) {
        const browser = (file: TestSpecification) => file.moduleId.includes('/test/browser/');
        return [...files.filter((file) => !browser(file)), ...files.filter(browser)];
    }
}

export default defineConfig({
    test: {
        environment: 'node',
        include: ['test/**/*.test.ts'],
        // Builds the playground and starts its server once, for every file.
        globalSetup: ['test/global-setup.ts'],
        fileParallelism: false,
        sequence: { sequencer: ApiTestsFirst },
        testTimeout: 240_000,
        hookTimeout: 240_000
    }
});
