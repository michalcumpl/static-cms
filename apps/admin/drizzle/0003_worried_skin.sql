CREATE TABLE `publish_documents` (
	`publish_id` text NOT NULL,
	`lang` text NOT NULL,
	`version_id` text NOT NULL,
	PRIMARY KEY(`publish_id`, `lang`),
	FOREIGN KEY (`publish_id`) REFERENCES `publishes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`version_id`) REFERENCES `versions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `projects` ADD `primary_lang` text DEFAULT 'cs' NOT NULL;--> statement-breakpoint
ALTER TABLE `site_documents` ADD `published` integer DEFAULT true NOT NULL;--> statement-breakpoint
-- Earlier publishes held one language: the project's primary, which is Czech for all of them.
INSERT INTO `publish_documents` (`publish_id`, `lang`, `version_id`)
SELECT `publishes`.`id`, `projects`.`primary_lang`, `publishes`.`version_id`
FROM `publishes` INNER JOIN `projects` ON `projects`.`id` = `publishes`.`project_id`;
