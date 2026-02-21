import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { parseSearchCommandQuery } from "./search-command-dsl";
import {
	buildInlineVisualTokens,
	buildQueryChips,
	getKeywordSuggestion,
	InputSuggestionHint,
	QueryBadgeRail,
} from "./search-command-visuals";

afterEach(() => {
	cleanup();
});

describe("search-command visuals", () => {
	it("builds chips for closed PR author query", () => {
		const parsed = parseSearchCommandQuery("prs closed by Rhys");
		const chips = buildQueryChips(parsed);

		expect(chips.some((chip) => chip.label === "PRs")).toBe(true);
		expect(chips.some((chip) => chip.label === "closed")).toBe(true);
		expect(chips.some((chip) => chip.label === "by rhys")).toBe(true);
	});

	it("renders badges in a fixed rail", () => {
		const raw = "issue by rhys label bug";
		const { getByTestId, getByText } = render(
			<QueryBadgeRail rawQuery={raw} />,
		);

		expect(getByTestId("query-badge-rail")).toBeTruthy();
		expect(getByText("issue")).toBeTruthy();
		expect(getByText("by rhys")).toBeTruthy();
		expect(getByText("label bug")).toBeTruthy();
	});

	it("keeps rail visible space but hidden when no badges", () => {
		const { getByTestId } = render(
			<QueryBadgeRail rawQuery="plain search text" />,
		);
		const rail = getByTestId("query-badge-rail");
		expect(rail.className.includes("h-8")).toBe(true);
		const hiddenRow = rail.firstElementChild;
		expect(hiddenRow?.className.includes("opacity-0")).toBe(true);
	});

	it("keeps exact typed order in inline token output", () => {
		const raw = "closed pr by Rhys label bug";
		const tokens = buildInlineVisualTokens(raw);
		const badgeText = tokens
			.filter((token) => token.type === "badge")
			.map((token) => token.text);

		expect(badgeText).toEqual(["closed", "pr", "by Rhys", "label bug"]);
	});

	it("suggests keyword completions and tab hint", () => {
		const parsed = parseSearchCommandQuery("clo");
		const suggestion = getKeywordSuggestion("clo", parsed);

		expect(suggestion?.remainingHint).toBe("sed");

		render(<InputSuggestionHint suggestion={suggestion} />);
		expect(screen.getByText("Tab")).toBeTruthy();
	});

	it("preserves cursor-aware completion position", () => {
		const raw = "issues clo bug";
		const parsed = parseSearchCommandQuery(raw);
		const suggestion = getKeywordSuggestion(raw, parsed, 10);

		expect(suggestion?.nextValue).toBe("issues closed bug");
		expect(suggestion?.nextCursor).toBe(13);
	});
});
