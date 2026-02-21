"use client";

import { Button } from "@packages/ui/components/button";
import { Download } from "@packages/ui/components/icons";
import type { ComponentProps } from "react";

const GITHUB_APP_SLUG = process.env.NEXT_PUBLIC_GITHUB_APP_SLUG ?? "";
const GITHUB_APP_INSTALL_URL = GITHUB_APP_SLUG
	? `https://github.com/apps/${GITHUB_APP_SLUG}/installations/new`
	: "";

type InstallGitHubAppButtonProps = Omit<
	ComponentProps<typeof Button>,
	"asChild"
> & {
	iconClassName?: string;
	hideIcon?: boolean;
};

export function InstallGitHubAppButton({
	iconClassName = "size-4",
	hideIcon = false,
	children,
	...buttonProps
}: InstallGitHubAppButtonProps) {
	if (!GITHUB_APP_INSTALL_URL) {
		return null;
	}

	return (
		<Button asChild {...buttonProps}>
			<a
				href={GITHUB_APP_INSTALL_URL}
				target="_blank"
				rel="noopener noreferrer"
			>
				{!hideIcon && <Download className={iconClassName} />}
				{children ?? "Install GitHub App"}
			</a>
		</Button>
	);
}
