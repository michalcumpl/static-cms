CREATE TABLE `import_retries` (
	`id` text PRIMARY KEY NOT NULL,
	`import_id` text NOT NULL,
	`user_id` text,
	`kind` text NOT NULL,
	`state` text NOT NULL,
	`progress` text,
	`error` text,
	`added` text,
	`started_at` integer NOT NULL,
	`finished_at` integer,
	FOREIGN KEY (`import_id`) REFERENCES `imports`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `import_retries_import_idx` ON `import_retries` (`import_id`,`started_at`);--> statement-breakpoint
ALTER TABLE `imports` ADD `retry_state` text;--> statement-breakpoint
ALTER TABLE `imports` ADD `import_version_id` text;