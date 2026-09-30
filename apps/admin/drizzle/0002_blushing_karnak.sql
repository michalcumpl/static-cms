CREATE TABLE `hosting_connections` (
	`workspace_id` text PRIMARY KEY NOT NULL,
	`provider` text NOT NULL,
	`account_slug` text NOT NULL,
	`account_name` text NOT NULL,
	`token_encrypted` text NOT NULL,
	`connected_by` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`connected_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `project_hosting` (
	`project_id` text PRIMARY KEY NOT NULL,
	`provider` text NOT NULL,
	`account_slug` text NOT NULL,
	`site_id` text NOT NULL,
	`site_name` text NOT NULL,
	`default_url` text NOT NULL,
	`domain` text,
	`domain_state` text,
	`domain_checked_at` integer,
	`live_publish_id` text,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `project_hosting_domain_idx` ON `project_hosting` (`domain`);--> statement-breakpoint
CREATE TABLE `publishes` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`version_id` text NOT NULL,
	`state` text NOT NULL,
	`deploy_id` text,
	`url` text,
	`error` text,
	`redirects_count` integer DEFAULT 0 NOT NULL,
	`published_by` text,
	`started_at` integer NOT NULL,
	`finished_at` integer,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`version_id`) REFERENCES `versions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`published_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `publishes_project_idx` ON `publishes` (`project_id`,`started_at`);