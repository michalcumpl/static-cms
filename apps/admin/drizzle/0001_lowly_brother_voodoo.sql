CREATE TABLE `media` (
	`project_id` text NOT NULL,
	`key` text NOT NULL,
	`sha256` text NOT NULL,
	`original_name` text NOT NULL,
	`format` text NOT NULL,
	`width` integer NOT NULL,
	`height` integer NOT NULL,
	`bytes` integer NOT NULL,
	`created_at` integer NOT NULL,
	`created_by` text,
	`removed_at` integer,
	PRIMARY KEY(`project_id`, `key`),
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `media_project_sha256_idx` ON `media` (`project_id`,`sha256`);