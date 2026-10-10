CREATE TABLE `project_setups` (
	`project_id` text PRIMARY KEY NOT NULL,
	`answers` text NOT NULL,
	`step` integer NOT NULL,
	`finished_at` integer,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
