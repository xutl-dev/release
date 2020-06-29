import { describe, it } from '@xutl/test';
import assert from 'assert';

import { getLastestCommit, getLatestPackageJSON, getReleaseTag, isPublished, createChangeLog } from '../';

describe('release', () => {
	it('can get last commit', async () => {
		const actual = await getLastestCommit('xutl-es', 'release');
		assert.equal(typeof actual, 'string');
	});
	it('can get lates package.json', async () => {
		const actual = await getLatestPackageJSON('xutl-es', 'release');
		assert.equal(typeof actual, 'object');
		assert.equal(actual.name, '@xutl/release');
		assert.equal(typeof actual.version, 'string');
		assert.equal(typeof actual.description, 'string');
		assert.equal(typeof actual.npmtag, 'string');
		assert.equal(typeof actual.commit, 'string');
	});
	it('can get a release tag', async () => {
		const actual = await getReleaseTag('xutl-es', 'release', '66dfa0ff3b377a5f521c755c8b13c9f57905e096');
		assert.equal(actual, 'v1.0.1');
	});
	describe('can check publishes status', () => {
		it('can check if published', async () => {
			assert(
				await isPublished({
					name: '@xutl/release',
					version: '1.0.1',
					description: 'Test Version',
					npmtag: 'latest',
					commit: '66dfa0ff3b377a5f521c755c8b13c9f57905e096',
				}),
			);
		});
		it('can check if not published', async () => {
			assert(
				!(await isPublished({
					name: '@xutl/release',
					version: '7.0.1',
					description: 'Test Version',
					npmtag: 'latest',
					commit: '66dfa0ff3b377a5f521c755c8b13c9f57905e096',
				})),
			);
		});
	});
	it('can create changelog', async () => {
		const actual = await createChangeLog('xutl-es', 'xutl-es.github.io', {
			name: '@xutl/release',
			version: '1.0.1',
			description: 'Test Version',
			npmtag: 'latest',
			commit: 'c9da8a6dbc92029c1590705587222f3e2386c321',
		});
		assert.equal(typeof actual, 'string');
	});
});
