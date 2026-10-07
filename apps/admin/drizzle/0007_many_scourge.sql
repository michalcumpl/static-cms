ALTER TABLE `projects` ADD `deleted_at` integer;--> statement-breakpoint
ALTER TABLE `projects` ADD `deleted_by` text REFERENCES users(id) ON UPDATE no action ON DELETE set null;