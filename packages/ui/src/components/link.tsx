"use client";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import type React from "react";
import { useCallback } from "react";
import { cn } from "../lib/utils";

function isExternalUrl(href: string): boolean {
	return href.startsWith("http://") || href.startsWith("https://");
}

function InternalLink({
	icon,
	className,
	...rest
}: React.ComponentPropsWithoutRef<typeof NextLink> & {
	href: string;
	icon?: React.ReactNode;
}) {
	const router = useRouter();
	const href = rest.href;

	const handleMouseDown = useCallback(
		(event: React.MouseEvent<HTMLAnchorElement>) => {
			rest.onMouseDown?.(event);
			if (event.defaultPrevented) {
				return;
			}
			if (event.button !== 0) {
				return;
			}
			if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
				return;
			}

			event.preventDefault();
			router.push(href, { scroll: rest.scroll ?? true });
		},
		[href, router, rest.onMouseDown, rest.scroll],
	);

	const sharedProps = {
		scroll: true,
		...rest,
		prefetch: true,
		onMouseDown: handleMouseDown,
	};

	if (icon) {
		return (
			<NextLink
				{...sharedProps}
				className={cn("flex flex-row items-center gap-2", className)}
			>
				{icon}
				{rest.children}
			</NextLink>
		);
	}

	return (
		<NextLink {...sharedProps} className={className}>
			{rest.children}
		</NextLink>
	);
}

export function Link(
	props: React.ComponentPropsWithoutRef<typeof NextLink> & {
		href: string;
		icon?: React.ReactNode;
	},
) {
	const { icon, className, ...rest } = props;
	const isExternal = isExternalUrl(rest.href);

	if (isExternal) {
		if (icon) {
			return (
				<NextLink
					{...rest}
					href={rest.href}
					prefetch={false}
					scroll={true}
					target="_blank"
					rel="noopener noreferrer"
					className={cn("flex flex-row items-center gap-2", className)}
				>
					{props.icon}
					{props.children}
				</NextLink>
			);
		}
		return (
			<NextLink
				{...rest}
				href={rest.href}
				prefetch={false}
				scroll={true}
				target="_blank"
				rel="noopener noreferrer"
				className={className}
			>
				{props.children}
			</NextLink>
		);
	}

	return <InternalLink icon={icon} className={className} {...rest} />;
}
