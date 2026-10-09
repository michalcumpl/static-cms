CREATE TABLE `imports` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`user_id` text,
	`address` text NOT NULL,
	`state` text NOT NULL,
	`progress` text,
	`error` text,
	`project_id` text,
	`report` text,
	`review_dismissed` integer DEFAULT false NOT NULL,
	`started_at` integer NOT NULL,
	`finished_at` integer,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `imports_workspace_idx` ON `imports` (`workspace_id`,`started_at`);--> statement-breakpoint
CREATE INDEX `imports_project_idx` ON `imports` (`project_id`);--> statement-breakpoint
CREATE TABLE `page_origins` (
	`project_id` text NOT NULL,
	`lang` text NOT NULL,
	`page_id` text NOT NULL,
	`path` text NOT NULL,
	PRIMARY KEY(`project_id`, `lang`, `page_id`),
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
