import { Badge } from "@packages/ui/components/badge";
import { CommandShortcut } from "@packages/ui/components/command";
import {
	CircleDot,
	Clock3,
	FileCode2,
	GitPullRequest,
	Tag,
	User,
} from "@packages/ui/components/icons";
import { cn } from "@packages/ui/lib/utils";
import type { SearchCommandQuery } from "./search-command-dsl";

export type FilterIconKind =
	| "issue"
	| "pr"
	| "repo"
	| "author"
	| "assignee"
	| "org"
	| "label"
	| "open"
	| "closed"
	| "merged"
	| "updated";

export type QueryChip = {
	readonly key: string;
	readonly label: string;
	readonly icon: FilterIconKind;
};

export type InlineVisualToken =
	| {
			readonly type: "text";
			readonly text: string;
	  }
	| {
			readonly type: "badge";
			readonly key: string;
			readonly text: string;
			readonly icon: FilterIconKind;
	  };

export function buildQueryChips(
	query: SearchCommandQuery,
): ReadonlyArray<QueryChip> {
	const chips: Array<QueryChip> = [];
	if (query.target === "issue") {
		chips.push({ key: "target-issue", label: "Issues", icon: "issue" });
	}
	if (query.target === "pr") {
		chips.push({ key: "target-pr", label: "PRs", icon: "pr" });
	}
	if (query.target === "repo") {
		chips.push({ key: "target-repo", label: "Repos", icon: "repo" });
	}
	if (query.author !== null) {
		chips.push({
			key: `author-${query.author}`,
			label: `by ${query.author}`,
			icon: "author",
		});
	}
	if (query.assignee !== null) {
		chips.push({
			key: `assignee-${query.assignee}`,
			label: `assigned ${query.assignee}`,
			icon: "assignee",
		});
	}
	if (query.repo !== null) {
		chips.push({
			key: `repo-${query.repo.owner}-${query.repo.name}`,
			label: `in ${query.repo.owner}/${query.repo.name}`,
			icon: "repo",
		});
	}
	if (query.org !== null) {
		chips.push({
			key: `org-${query.org}`,
			label: `org ${query.org}`,
			icon: "org",
		});
	}
	for (const label of query.labels) {
		chips.push({
			key: `label-${label}`,
			label: `label ${label}`,
			icon: "label",
		});
	}
	if (query.state === "open") {
		chips.push({ key: "state-open", label: "open", icon: "open" });
	}
	if (query.state === "closed") {
		chips.push({ key: "state-closed", label: "closed", icon: "closed" });
	}
	if (query.state === "merged") {
		chips.push({ key: "state-merged", label: "merged", icon: "merged" });
	}
	if (query.updatedAfter !== null) {
		chips.push({
			key: `updated-${query.updatedAfter}`,
			label: `updated since ${new Date(query.updatedAfter).toLocaleDateString(
				undefined,
				{ year: "numeric", month: "short", day: "numeric" },
			)}`,
			icon: "updated",
		});
	}
	return chips;
}

function iconClassFor(kind: FilterIconKind): string {
	if (kind === "issue" || kind === "open") return "text-status-open";
	if (kind === "closed") return "text-status-closed";
	if (kind === "pr" || kind === "merged") return "text-status-merged";
	if (kind === "label") return "text-status-label";
	if (kind === "author" || kind === "assignee" || kind === "org") {
		return "text-status-user";
	}
	return "text-status-repo";
}

export function renderFilterIcon(kind: FilterIconKind) {
	if (kind === "issue" || kind === "open" || kind === "closed") {
		return <CircleDot className={cn("size-3", iconClassFor(kind))} />;
	}
	if (kind === "pr" || kind === "merged") {
		return <GitPullRequest className={cn("size-3", iconClassFor(kind))} />;
	}
	if (kind === "repo") return <FileCode2 className="size-3 text-status-repo" />;
	if (kind === "author" || kind === "assignee" || kind === "org") {
		return <User className={cn("size-3", iconClassFor(kind))} />;
	}
	if (kind === "label")
		return <Tag className={cn("size-3", iconClassFor(kind))} />;
	return <Clock3 className="size-3 text-status-updated" />;
}

export type KeywordSuggestion = {
	readonly nextValue: string;
	readonly nextCursor: number;
	readonly remainingHint: string;
	readonly icon: FilterIconKind;
};

export function getKeywordSuggestion(
	input: string,
	parsedQuery: SearchCommandQuery,
	cursor = input.length,
): KeywordSuggestion | null {
	const safeCursor = Math.max(0, Math.min(cursor, input.length));
	const head = input.slice(0, safeCursor);
	const tail = input.slice(safeCursor);
	const lowercaseHead = head.toLowerCase();

	const contextual = (): { keyword: string; icon: FilterIconKind } | null => {
		if (parsedQuery.target === null)
			return { keyword: "issues", icon: "issue" };
		if (parsedQuery.author === null && parsedQuery.assignee === null) {
			return { keyword: "by ", icon: "author" };
		}
		if (parsedQuery.repo === null && parsedQuery.org === null) {
			return { keyword: "in ", icon: "repo" };
		}
		if (parsedQuery.state === null) return { keyword: "open", icon: "open" };
		if (parsedQuery.updatedAfter === null) {
			return { keyword: "last week", icon: "updated" };
		}
		return null;
	};

	if (head.length === 0 || /\s$/.test(head)) {
		const suggestion = contextual();
		if (suggestion === null) return null;
		const nextHead = `${head}${suggestion.keyword}`;
		return {
			nextValue: `${nextHead}${tail}`,
			nextCursor: nextHead.length,
			remainingHint: suggestion.keyword,
			icon: suggestion.icon,
		};
	}

	const wordStart = lowercaseHead.lastIndexOf(" ") + 1;
	const currentWord = lowercaseHead.slice(wordStart);
	if (currentWord.length === 0) return null;

	const keywordList: ReadonlyArray<{
		readonly keyword: string;
		readonly icon: FilterIconKind;
	}> = [
		{ keyword: "issues", icon: "issue" },
		{ keyword: "prs", icon: "pr" },
		{ keyword: "repos", icon: "repo" },
		{ keyword: "by ", icon: "author" },
		{ keyword: "assigned to ", icon: "assignee" },
		{ keyword: "in ", icon: "repo" },
		{ keyword: "org ", icon: "org" },
		{ keyword: "label ", icon: "label" },
		{ keyword: "open", icon: "open" },
		{ keyword: "closed", icon: "closed" },
		{ keyword: "merged", icon: "merged" },
		{ keyword: "last week", icon: "updated" },
		{ keyword: "past 7 days", icon: "updated" },
	];

	for (const entry of keywordList) {
		if (!entry.keyword.startsWith(currentWord)) continue;
		if (entry.keyword === currentWord) continue;
		const nextHead = `${head.slice(0, wordStart)}${entry.keyword}`;
		return {
			nextValue: `${nextHead}${tail}`,
			nextCursor: nextHead.length,
			remainingHint: entry.keyword.slice(currentWord.length),
			icon: entry.icon,
		};
	}

	return null;
}

function collectInlineMatches(rawQuery: string): ReadonlyArray<{
	readonly start: number;
	readonly end: number;
	readonly icon: FilterIconKind;
}> {
	const matches: Array<{ start: number; end: number; icon: FilterIconKind }> =
		[];

	const addPattern = (pattern: RegExp, icon: FilterIconKind) => {
		let match = pattern.exec(rawQuery);
		while (match !== null) {
			const start = match.index;
			const end = start + match[0].length;
			matches.push({ start, end, icon });
			match = pattern.exec(rawQuery);
		}
	};

	addPattern(
		/\bassigned to\s+@?(.+?)(?=\s+(by|from|authored by|in|org|label|tag|open|opened|closed|merged|updated|since|past|last)\b|$)/gi,
		"assignee",
	);
	addPattern(
		/\b(by|from|authored by)\s+@?(.+?)(?=\s+(assigned to|in|org|label|tag|open|opened|closed|merged|updated|since|past|last)\b|$)/gi,
		"author",
	);
	addPattern(/\b(?:repo|in)\s+[\w.-]+\/[\w.-]+\b/gi, "repo");
	addPattern(/\borg\s+[\w.-]+\b/gi, "org");
	addPattern(/\b(?:label|tag)\s+"[^"]+"/gi, "label");
	addPattern(/\b(?:label|tag)\s+[\w-]+\b/gi, "label");
	addPattern(/\b(?:updated\s+)?past\s+\d+\s*(?:d|day|days)\b/gi, "updated");
	addPattern(/\b(?:updated\s+)?last\s+(?:week|month)\b/gi, "updated");
	addPattern(/\b(?:updated\s+)?(?:today|yesterday)\b/gi, "updated");
	addPattern(/\bsince\s+(?:today|yesterday|\d{4}-\d{2}-\d{2})\b/gi, "updated");
	addPattern(/\bmerged\b/gi, "merged");
	addPattern(/\bclosed\b/gi, "closed");
	addPattern(/\bopen(?:ed)?\b/gi, "open");
	addPattern(/\bpull requests?\b/gi, "pr");
	addPattern(/\bpulls?\b/gi, "pr");
	addPattern(/\bprs?\b/gi, "pr");
	addPattern(/\bissues?\b/gi, "issue");
	addPattern(/\brepositories?\b/gi, "repo");
	addPattern(/\brepos?\b/gi, "repo");

	const sorted = matches.sort((a, b) => {
		if (a.start !== b.start) return a.start - b.start;
		return b.end - a.end;
	});

	const deduped: Array<{ start: number; end: number; icon: FilterIconKind }> =
		[];
	for (const current of sorted) {
		const previous = deduped.at(-1);
		if (previous !== undefined && current.start < previous.end) {
			continue;
		}
		deduped.push(current);
	}

	return deduped;
}

export function buildInlineVisualTokens(
	rawQuery: string,
): ReadonlyArray<InlineVisualToken> {
	if (rawQuery.length === 0) return [];

	const matches = collectInlineMatches(rawQuery);
	if (matches.length === 0) {
		return [{ type: "text", text: rawQuery }];
	}

	const tokens: Array<InlineVisualToken> = [];
	let cursor = 0;
	for (const match of matches) {
		if (cursor < match.start) {
			tokens.push({ type: "text", text: rawQuery.slice(cursor, match.start) });
		}
		const badgeText = rawQuery.slice(match.start, match.end).trim();
		if (badgeText.length > 0) {
			tokens.push({
				type: "badge",
				key: `${match.start}-${match.end}-${match.icon}`,
				text: badgeText,
				icon: match.icon,
			});
		}
		cursor = match.end;
	}

	if (cursor < rawQuery.length) {
		tokens.push({ type: "text", text: rawQuery.slice(cursor) });
	}

	return tokens;
}

export function InlineQueryOverlay({ rawQuery }: { rawQuery: string }) {
	const tokens = buildInlineVisualTokens(rawQuery);
	const badges = tokens.filter((token) => token.type === "badge");
	const hasBadges = badges.length > 0;

	return (
		<div data-testid="query-badge-rail" className="h-8 border-b px-3">
			<div
				className={cn(
					"flex h-full items-center gap-1 overflow-hidden transition-opacity",
					hasBadges ? "opacity-100" : "opacity-0",
				)}
				aria-hidden={!hasBadges}
			>
				{badges.slice(0, 6).map((badge) => (
					<Badge
						key={badge.key}
						variant="outline"
						className="max-w-[14rem] rounded-md bg-muted/50 px-1.5 py-0 text-[10px]"
						title={badge.text}
					>
						{renderFilterIcon(badge.icon)}
						<span className="truncate">{badge.text}</span>
					</Badge>
				))}
			</div>
		</div>
	);
}

export function QueryBadgeRail({ rawQuery }: { rawQuery: string }) {
	return <InlineQueryOverlay rawQuery={rawQuery} />;
}

export function InputSuggestionHint({
	suggestion,
}: {
	suggestion: KeywordSuggestion | null;
}) {
	if (suggestion === null || suggestion.remainingHint.length === 0) return null;

	return (
		<div className="flex items-center gap-1 text-[11px] text-muted-foreground">
			{renderFilterIcon(suggestion.icon)}
			<span className="hidden md:inline">{suggestion.remainingHint}</span>
			<CommandShortcut className="ml-1 text-[10px] tracking-normal">
				Tab
			</CommandShortcut>
		</div>
	);
}
