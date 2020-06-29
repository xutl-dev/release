#!/usr/bin/env node

import { Octokit } from '@octokit/rest';
import { env } from 'process';
import * as fs from 'fs';
import { exec } from 'child_process';
import { URL } from 'url';

const octokit = new Octokit({ timeZone: 'UTC', baseUrl: env.GITHUP_API, auth: env.GITHUB_TOKEN });

if (module.id === '.') {
	if (process.argv.length === 2 && fs.existsSync('package.json')) {
		const pkg = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
		const url = new URL(pkg.repository.url);
		process.argv[2] = url.pathname.replace(/^\/|\.git$/g, '');
	}

	if (process.argv.length !== 3) usage(1);
	const parts = process.argv[2].split('/');
	if (parts.length !== 2) usage(2);
	const [owner, repo] = parts;

	main(owner, repo).catch((e) => {
		console.error(e);
		usage(3);
	});

	async function main(owner: string, repo: string) {
		const pkg = await getLatestPackageJSON(owner, repo);
		if (await isPublished(pkg)) {
			console.error(`${pkg.name} version ${pkg.version} is already published to npm`);
			return;
		}
		const tag = await getReleaseTag(owner, repo, pkg.commit);
		if (tag) {
			console.error(`${pkg.name} version ${pkg.version} is already release as tag ${tag}`);
			return;
		}
		const response = await octokit.repos.createRelease({
			owner,
			repo,
			tag_name: `v${pkg.version}`,
			name: `Release v${pkg.version}`,
			target_commitish: pkg.commit,
			draft: true,
			prerelease: pkg.npmtag !== 'latest',
		});
		console.error(response);
	}
	function usage(exit: number = 1) {
		console.error(`xutlrelease <org/repo>`);
		process.exit(exit);
	}
}

export interface Package {
	name: string;
	version: string;
	description: string;
	commit: string;
	npmtag: string;
}
export async function getLastestCommit(owner: string, repo: string): Promise<string> {
	const repository = await octokit.repos.get({ owner, repo });
	const branch = await octokit.repos.getBranch({ owner, repo, branch: repository.data.default_branch });
	return branch.data.commit.sha;
}
export async function getLatestPackageJSON(owner: string, repo: string, path: string = ''): Promise<Package> {
	path = `${path}/package.json`
		.split('/')
		.filter((s) => !!s)
		.join('/');
	const {
		data: { content, encoding },
	} = await octokit.repos.getContent({ owner, repo, path });
	const buffer = Buffer.from(content as string, encoding as 'base64' | 'hex' | 'utf-8');
	const pkg = JSON.parse(buffer.toString('utf-8'));
	const commit = await getLastestCommit(owner, repo);
	const { name, version, description } = pkg;
	const npmtag = pkg.publishConfig?.tag ?? 'latest';
	return { name, version, description, commit, npmtag };
}
export async function getReleaseTag(owner: string, repo: string, commit: string): Promise<string | undefined> {
	try {
		const releases = await octokit.repos.listReleases({ owner, repo, per_page: 100, page: 1 });
		for (const release of releases.data) {
			const rcommit = await octokit.repos.getCommit({ owner, repo, ref: release.tag_name });
			if (commit === rcommit.data.sha) return release.tag_name;
		}
		return;
	} catch (e) {
		console.debug(e);
		return;
	}
}
export async function isPublished(pkg: Package) {
	try {
		const version = await execute(`npm view ${pkg.name}@${pkg.version} version`);
		return `${version || ''}`.trim() === pkg.version.trim();
	} catch (e) {
		console.debug(e);
		return false;
	}
}
export async function createRelease(owner: string, repo: string, pkg: Package): Promise<boolean> {
	try {
		const response = await octokit.repos.createRelease({
			owner,
			repo,
			tag_name: `v${pkg.version}`,
			name: `Release v${pkg.version}`,
			target_commitish: pkg.commit,
			draft: true,
			prerelease: pkg.npmtag !== 'latest',
		});
		return response.status > 199 && response.status < 300;
	} catch (e) {
		console.debug(e);
		return false;
	}
}
async function execute(cmd: string): Promise<string> {
	return new Promise((resolve, reject) => {
		exec(cmd, (err, stdout, stderr) => {
			if (err) return reject(new Error(stderr));
			resolve(stdout);
		});
	});
}
