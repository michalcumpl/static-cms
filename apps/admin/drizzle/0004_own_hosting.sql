ALTER TABLE `project_hosting` ADD `domain_tenant_id` text;--> statement-breakpoint
CREATE UNIQUE INDEX `project_hosting_site_name_idx` ON `project_hosting` (`provider`,`site_name`);--> statement-breakpoint
ALTER TABLE `publishes` ADD `files_deleted_at` integer;