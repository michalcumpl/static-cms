CREATE TABLE `contact_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`block_id` text NOT NULL,
	`kind` text NOT NULL,
	`heading` text NOT NULL,
	`page` text NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`phone` text NOT NULL,
	`when` text NOT NULL,
	`message` text NOT NULL,
	`delivered` integer NOT NULL,
	`handled_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `contact_messages_project_idx` ON `contact_messages` (`project_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `form_recipients` (
	`project_id` text NOT NULL,
	`email` text NOT NULL,
	`token_hash` text NOT NULL,
	`confirmed_at` integer,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`project_id`, `email`),
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `form_recipients_token_idx` ON `form_recipients` (`token_hash`);