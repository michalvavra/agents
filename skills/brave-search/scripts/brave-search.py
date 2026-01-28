#!/usr/bin/env -S uv run --script
#
# /// script
# requires-python = ">=3.12"
# dependencies = []
# ///

import argparse
import json
import os
import sys
import urllib.parse
import urllib.request


def parse_args():
	parser = argparse.ArgumentParser(
		prog=os.path.basename(sys.argv[0]),
		description="Brave Search API client",
	)
	parser.add_argument("query", help="Search query")
	parser.add_argument("--count", type=int, default=5, help="Maximum results")
	parser.add_argument("--offset", type=int, default=0, help="Offset into results")
	parser.add_argument("--country", help="Two letter country code")
	parser.add_argument("--search-lang", dest="search_lang", help="Search language code")
	parser.add_argument("--safesearch", help="off, moderate, strict")
	parser.add_argument("--freshness", help="day, week, month")
	parser.add_argument("--json", action="store_true", help="Output normalized JSON")
	parser.add_argument("--raw", action="store_true", help="Output raw API response")
	return parser.parse_args()


def normalize_results(body, query):
	web = body.get("web") if isinstance(body, dict) else None
	if not isinstance(web, dict):
		web = {}
	results = web.get("results")
	if not isinstance(results, list):
		results = []

	return {
		"query": query,
		"total": web.get("total", len(results)),
		"results": [
			{
				"index": idx,
				"title": item.get("title", ""),
				"url": item.get("url", ""),
				"description": item.get("description", ""),
				"age": item.get("age") or item.get("page_age"),
				"language": item.get("language"),
			}
			for idx, item in enumerate(results)
		],
	}


def format_results_text(normalized):
	results = normalized["results"]
	output = f"Results: {normalized['total']} (showing {len(results)})"

	for result in results:
		output += "\n\n"
		output += (
			f"<result index=\"{result['index']}\" title=\"{result['title']}\" "
			f"url=\"{result['url']}\">\n"
		)
		output += result.get("description") or ""
		output += "\n</result>"

	return output


def main():
	args = parse_args()

	if args.count < 1:
		raise SystemExit("--count must be at least 1")
	if args.offset < 0:
		raise SystemExit("--offset must be 0 or higher")

	api_key = os.environ.get("BRAVE_SEARCH_API_KEY")
	if not api_key:
		raise SystemExit("missing BRAVE_SEARCH_API_KEY")

	params = {
		"q": args.query,
		"source": "web",
		"count": str(args.count),
		"offset": str(args.offset),
	}
	if args.country:
		params["country"] = args.country
	if args.search_lang:
		params["search_lang"] = args.search_lang
	if args.safesearch:
		params["safesearch"] = args.safesearch
	if args.freshness:
		params["freshness"] = args.freshness

	url = "https://api.search.brave.com/res/v1/web/search?" + urllib.parse.urlencode(params)
	request = urllib.request.Request(
		url,
		headers={
			"Accept": "application/json",
			"X-Subscription-Token": api_key,
		},
	)

	with urllib.request.urlopen(request) as response:
		body = response.read().decode("utf-8")
		data = json.loads(body)

	if args.raw:
		print(json.dumps(data, indent=2))
		return

	normalized = normalize_results(data, args.query)
	if args.json:
		print(json.dumps(normalized, indent=2))
		return

	print(format_results_text(normalized))


if __name__ == "__main__":
	try:
		main()
	except Exception as exc:
		sys.stderr.write(f"{os.path.basename(sys.argv[0])}: {exc}\n")
		sys.exit(1)
