"use client";

import { useSubscriptionWithInitial } from "@packages/confect/rpc";
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@packages/ui/components/avatar";
import { Button } from "@packages/ui/components/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandLinkItem,
	CommandList,
} from "@packages/ui/components/command";
import {
	Check,
	ChevronDown,
	ChevronUpIcon,
} from "@packages/ui/components/icons";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@packages/ui/components/popover";
import { cn } from "@packages/ui/lib/utils";
import { useProjectionQueries } from "@packages/ui/rpc/projection-queries";
import { Array as Arr, pipe, Record as Rec } from "effect";
import { useCallback, useMemo, useState } from "react";
import type { SidebarRepo } from "../@sidebar/sidebar-client";

const EmptyPayload: Record<string, never> = {};

/**
 * Unified org + repo picker.
 *
 * Single dropdown that shows all repos grouped by org with search.
 * Trigger displays: [OrgIcon] [RepoName] when a repo is selected,
 * or [OrgIcon] [OrgName] when at the org level.
 */
export function RepoNavSelector({
	owner,
	name,
	activeTab,
	initialRepos,
}: {
	owner: string | null;
	name: string | null;
	activeTab?: string;
	initialRepos: ReadonlyArray<SidebarRepo>;
}) {
	const client = useProjectionQueries();
	const reposAtom = useMemo(
		() => client.listRepos.subscription(EmptyPayload),
		[client],
	);
	const repos = useSubscriptionWithInitial(reposAtom, initialRepos);

	const grouped = useMemo(
		() =>
			pipe(
				repos,
				Arr.groupBy((repo) => repo.ownerLogin),
			),
		[repos],
	);

	const owners = useMemo(() => Rec.keys(grouped), [grouped]);

	const currentAvatar = useMemo(() => {
		if (owner === null) return null;
		return (grouped[owner] ?? [])[0]?.ownerAvatarUrl ?? null;
	}, [grouped, owner]);

	const [open, setOpen] = useState(false);

	const closePopover = useCallback(() => {
		setOpen(false);
	}, []);

	// Trigger label: [OrgIcon] [RepoName] or [OrgIcon] [OrgName] or "All Repos"
	const triggerLabel = name ?? owner ?? "All Repos";

	return (
		<div className="px-2 pt-2.5 pb-1.5">
			<Popover open={open} onOpenChange={setOpen}>
				<PopoverTrigger asChild>
					<Button
						variant="ghost"
						size="sm"
						className="h-8 w-full justify-between px-2 gap-1.5 text-xs font-bold tracking-tight"
					>
						<span className="flex items-center gap-2 min-w-0">
							{owner !== null && (
								<Avatar className="size-5 shrink-0">
									{currentAvatar && (
										<AvatarImage src={currentAvatar} alt={owner} />
									)}
									<AvatarFallback className="text-[8px]">
										{owner.slice(0, 2).toUpperCase()}
									</AvatarFallback>
								</Avatar>
							)}
							<span className="truncate">{triggerLabel}</span>
						</span>
						{open ? (
							<ChevronUpIcon className="size-3.5 shrink-0 text-muted-foreground/50" />
						) : (
							<ChevronDown className="size-3.5 shrink-0 text-muted-foreground/50" />
						)}
					</Button>
				</PopoverTrigger>
				<PopoverContent className="w-56 p-0" align="start" sideOffset={6}>
					<Command>
						<CommandInput placeholder="Search repos..." className="text-xs" />
						<CommandList>
							<CommandEmpty className="py-4 text-xs">
								No results found.
							</CommandEmpty>

							{/* Home / All */}
							<CommandGroup>
								<CommandLinkItem
									value="__all__"
									className="gap-2 text-xs py-1.5"
									href="/"
									onBeforeNavigate={closePopover}
								>
									<span className="truncate">All Repos</span>
									<Check
										className={cn(
											"ml-auto size-3.5",
											owner === null && name === null
												? "opacity-100"
												: "opacity-0",
										)}
									/>
								</CommandLinkItem>
							</CommandGroup>

							{/* Grouped by org */}
							{owners.map((org) => {
								const orgRepos = grouped[org] ?? [];
								const avatarUrl = orgRepos[0]?.ownerAvatarUrl ?? null;
								return (
									<CommandGroup key={org} heading={org}>
										{/* Org-level item */}
										<CommandLinkItem
											value={`org:${org}`}
											className="gap-2 text-xs py-1.5"
											href={`/${org}`}
											onBeforeNavigate={closePopover}
										>
											<Avatar className="size-4 shrink-0">
												{avatarUrl && <AvatarImage src={avatarUrl} alt={org} />}
												<AvatarFallback className="text-[7px]">
													{org.slice(0, 2).toUpperCase()}
												</AvatarFallback>
											</Avatar>
											<span className="truncate text-muted-foreground">
												{org}
											</span>
											<Check
												className={cn(
													"ml-auto size-3.5",
													org === owner && name === null
														? "opacity-100"
														: "opacity-0",
												)}
											/>
										</CommandLinkItem>

										{/* Repos in this org */}
										{orgRepos.map((repo) => (
											<CommandLinkItem
												key={repo.repositoryId}
												value={`${repo.ownerLogin}/${repo.name}`}
												className="gap-2 text-xs py-1.5"
												href={
													activeTab
														? `/${repo.ownerLogin}/${repo.name}/${activeTab}`
														: `/${repo.ownerLogin}/${repo.name}`
												}
												onBeforeNavigate={closePopover}
											>
												<Avatar className="size-4 shrink-0">
													{repo.ownerAvatarUrl && (
														<AvatarImage
															src={repo.ownerAvatarUrl}
															alt={repo.name}
														/>
													)}
													<AvatarFallback className="text-[7px]">
														{repo.ownerLogin.slice(0, 2).toUpperCase()}
													</AvatarFallback>
												</Avatar>
												<span className="truncate">{repo.name}</span>
												{(repo.openPrCount > 0 ||
													repo.failingCheckCount > 0) && (
													<span className="ml-auto shrink-0 text-[10px] text-muted-foreground/40 tabular-nums flex items-center gap-1">
														{repo.openPrCount > 0 && (
															<span>{repo.openPrCount} PRs</span>
														)}
														{repo.failingCheckCount > 0 && (
															<span className="text-status-closed/60">
																{repo.failingCheckCount} failing
															</span>
														)}
													</span>
												)}
												<Check
													className={cn(
														"shrink-0 size-3.5",
														repo.ownerLogin === owner && repo.name === name
															? "opacity-100"
															: "opacity-0",
													)}
												/>
											</CommandLinkItem>
										))}
									</CommandGroup>
								);
							})}
						</CommandList>
					</Command>
				</PopoverContent>
			</Popover>
		</div>
	);
}
