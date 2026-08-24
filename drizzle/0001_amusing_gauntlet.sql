ALTER TABLE `page_snapshots` RENAME TO `shared_pages`;
--> statement-breakpoint
ALTER TABLE `shared_pages` ADD COLUMN `version` integer DEFAULT 1 NOT NULL;
--> statement-breakpoint
ALTER TABLE `shared_pages`
ADD COLUMN `updated_at` integer NOT NULL DEFAULT 0;
--> statement-breakpoint
UPDATE `shared_pages`
SET `updated_at` = `created_at`
WHERE `updated_at` = 0;
--> statement-breakpoint
DROP INDEX IF EXISTS `page_snapshots_created_at_idx`;
--> statement-breakpoint
DROP INDEX IF EXISTS `page_snapshots_expires_at_idx`;
--> statement-breakpoint
CREATE INDEX `shared_pages_created_at_idx` ON `shared_pages` (`created_at`);
--> statement-breakpoint
CREATE INDEX `shared_pages_updated_at_idx` ON `shared_pages` (`updated_at`);
--> statement-breakpoint
CREATE INDEX `shared_pages_expires_at_idx` ON `shared_pages` (`expires_at`);
--> statement-breakpoint
CREATE TABLE `share_put_rate_limits` (
	`page_id` text NOT NULL,
	`ip_hash` text NOT NULL,
	`window_start` integer NOT NULL,
	`request_count` integer DEFAULT 1 NOT NULL,
	PRIMARY KEY(`page_id`, `ip_hash`, `window_start`)
);
