#!/usr/bin/env node
// Find a tournament's ID from the RapidAPI tennis endpoint by paging through
// the season calendar and matching on name (or other attributes).
//
// Usage:
//   node scripts/find-tournament.mjs <search> [options]
//
// Examples:
//   node scripts/find-tournament.mjs Wimbledon
//   node scripts/find-tournament.mjs "grand slam" --field tier
//   node scripts/find-tournament.mjs Wimbledon --tour wta --year 2025
//   node scripts/find-tournament.mjs Wimbledon --exact
//   node scripts/find-tournament.mjs "" --field tier --value "Grand Slam"  # list all matches
//
// Options:
//   --tour <atp|wta|itf>   Tour to query (default: atp)
//   --year <YYYY>          Calendar year (default: current year)
//   --field <name>         Field to match against. Supports dotted paths for
//                          nested fields, e.g. country.name (default: name)
//   --exact                Require an exact (case-insensitive) match instead
//                          of a substring match
//   --page-size <n>        Results per page (default: 100)
//   --max-pages <n>        Safety cap on pages to fetch (default: 50)
//   --all                  Print every match, not just the first
//   --json                 Print raw JSON for matches
//   --refresh              Ignore cached pages and re-fetch from the API
//
// Fetched pages are cached under scripts/.cache/tennis-tournaments/ so repeated
// lookups reuse them and don't spend the limited API quota (~100 req/hour).
// Cache hits are not paced or counted as live requests; use --refresh to force
// a re-fetch (e.g. if the calendar has changed).
//   --key <rapidapi-key>   API key (default: $RAPIDAPI_KEY)
//
// The API key is read from the RAPIDAPI_KEY environment variable, or the
// --key flag. (A key may also be hard-coded below as a fallback.)

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HOST = 'tennis-api-atp-wta-itf.p.rapidapi.com';

// The BASIC RapidAPI plan rate-limits to ~1 request/second, so pace paging.
const PAGE_DELAY_MS = 1100;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Pages are cached to disk so repeated lookups don't burn the (limited, ~100
// requests/hour) RapidAPI quota. The calendar is mostly static, so cached
// pages are reused indefinitely; pass --refresh to force a re-fetch.
const CACHE_DIR = join(dirname(fileURLToPath(import.meta.url)), '.cache', 'tennis-tournaments');

function cachePath(opts, pageNo) {
	return join(CACHE_DIR, `${opts.tour}-${opts.year}-ps${opts.pageSize}-p${pageNo}.json`);
}

async function readCache(opts, pageNo) {
	if (opts.refresh) return undefined;
	try {
		return JSON.parse(await readFile(cachePath(opts, pageNo), 'utf8'));
	} catch {
		return undefined; // cache miss (or unreadable) — fall through to fetch
	}
}

async function writeCache(opts, pageNo, payload) {
	try {
		await mkdir(CACHE_DIR, { recursive: true });
		await writeFile(cachePath(opts, pageNo), JSON.stringify(payload), 'utf8');
	} catch (err) {
		console.error(`Warning: could not write cache: ${err.message}`);
	}
}

// Fallback key — override with RAPIDAPI_KEY env var or --key.
const FALLBACK_KEY = '6c08e75f94msha811823407f534bp1b7abejsnc7fb9612e0ad';

function parseArgs(argv) {
	const opts = {
		search: undefined,
		tour: 'atp',
		year: new Date().getFullYear(),
		field: 'name',
		exact: false,
		pageSize: 100,
		maxPages: 50,
		all: false,
		json: false,
		refresh: false,
		key: process.env.RAPIDAPI_KEY || FALLBACK_KEY,
		value: undefined
	};

	const positional = [];
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		switch (arg) {
			case '--tour':
				opts.tour = argv[++i];
				break;
			case '--year':
				opts.year = Number(argv[++i]);
				break;
			case '--field':
				opts.field = argv[++i];
				break;
			case '--value':
				opts.value = argv[++i];
				break;
			case '--exact':
				opts.exact = true;
				break;
			case '--page-size':
				opts.pageSize = Number(argv[++i]);
				break;
			case '--max-pages':
				opts.maxPages = Number(argv[++i]);
				break;
			case '--all':
				opts.all = true;
				break;
			case '--refresh':
				opts.refresh = true;
				break;
			case '--json':
				opts.json = true;
				break;
			case '--key':
				opts.key = argv[++i];
				break;
			case '-h':
			case '--help':
				opts.help = true;
				break;
			default:
				positional.push(arg);
		}
	}

	// The thing we're searching for: explicit --value wins, else first positional.
	opts.search = opts.value !== undefined ? opts.value : positional[0];
	return opts;
}

// Pull a (possibly nested) field off a tournament object via a dotted path.
function getField(obj, path) {
	return path.split('.').reduce((acc, key) => (acc == null ? acc : acc[key]), obj);
}

function matches(tournament, opts) {
	const raw = getField(tournament, opts.field);
	if (raw == null) return false;
	const haystack = String(raw).toLowerCase();
	const needle = String(opts.search).toLowerCase();
	return opts.exact ? haystack === needle : haystack.includes(needle);
}

async function fetchPage(opts, pageNo) {
	const url =
		`https://${HOST}/tennis/v2/${opts.tour}/tournament/calendar/${opts.year}` +
		`?pageSize=${opts.pageSize}&pageNo=${pageNo}`;

	const res = await fetch(url, {
		headers: {
			'Content-Type': 'application/json',
			'x-rapidapi-host': HOST,
			'x-rapidapi-key': opts.key
		}
	});

	if (!res.ok) {
		const body = await res.text().catch(() => '');
		throw new Error(`Request failed: ${res.status} ${res.statusText}\n${body}`);
	}
	return res.json();
}

// The API may return either a bare array or an object that wraps the array
// (e.g. { data: [...] } / { results: [...] }). Normalise to an array.
function extractList(payload) {
	if (Array.isArray(payload)) return payload;
	if (payload && typeof payload === 'object') {
		for (const key of ['data', 'results', 'items', 'tournaments']) {
			if (Array.isArray(payload[key])) return payload[key];
		}
	}
	return [];
}

function describe(t) {
	const country = t.country?.acronym || t.country?.name || '';
	const date = t.date ? String(t.date).slice(0, 10) : '';
	return `id=${t.id}  ${t.name}  [${t.tier}]  ${date}  ${country}`.trim();
}

async function main() {
	const opts = parseArgs(process.argv.slice(2));

	if (opts.help || opts.search === undefined) {
		console.log(
			'Usage: node scripts/find-tournament.mjs <search> ' +
				'[--tour atp|wta|itf] [--year YYYY] [--field name] [--exact] [--all] [--json]'
		);
		console.log('Read the top of the script for full option docs.');
		process.exit(opts.help ? 0 : 1);
	}

	if (!opts.key) {
		console.error('No API key. Set RAPIDAPI_KEY or pass --key.');
		process.exit(1);
	}

	console.error(
		`Searching ${opts.tour.toUpperCase()} ${opts.year} for ${opts.field} ` +
			`${opts.exact ? '==' : '~'} "${opts.search}" ...`
	);

	const found = [];
	let totalSeen = 0;
	let requested = 0; // number of live API calls made (cache hits don't count)

	for (let pageNo = 1; pageNo <= opts.maxPages; pageNo++) {
		let payload = await readCache(opts, pageNo);
		if (payload === undefined) {
			// Cache miss: pace live calls to respect the per-second rate limit.
			if (requested > 0) await sleep(PAGE_DELAY_MS);
			try {
				payload = await fetchPage(opts, pageNo);
			} catch (err) {
				console.error(String(err.message || err));
				process.exit(1);
			}
			requested++;
			await writeCache(opts, pageNo, payload);
		}

		const list = extractList(payload);
		if (list.length === 0) break; // ran past the last page

		totalSeen += list.length;
		for (const t of list) {
			if (matches(t, opts)) {
				found.push(t);
				if (!opts.all) {
					console.error(
						`Scanned ${totalSeen} tournaments across ${pageNo} page(s) ` +
							`(${requested} live request${requested === 1 ? '' : 's'}).`
					);
					report(found, opts);
					return;
				}
			}
		}

		// If the page came back smaller than requested, it's the last one.
		if (list.length < opts.pageSize) break;
	}

	console.error(
		`Scanned ${totalSeen} tournaments (${requested} live request${requested === 1 ? '' : 's'}).`
	);
	report(found, opts);
	if (found.length === 0) process.exit(2);
}

function report(found, opts) {
	if (found.length === 0) {
		console.error('No matching tournament found.');
		return;
	}
	if (opts.json) {
		console.log(JSON.stringify(opts.all ? found : found[0], null, 2));
	} else {
		for (const t of found) console.log(describe(t));
	}
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
