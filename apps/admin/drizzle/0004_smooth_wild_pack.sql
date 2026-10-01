ALTER TABLE `versions` ADD `restored_from` text REFERENCES versions(id) ON DELETE set null;
