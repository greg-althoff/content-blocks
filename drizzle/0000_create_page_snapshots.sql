CREATE TABLE `page_snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`state_json` text NOT NULL,
	`state_bytes` integer NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`expires_at` integer,
	`revoked_at` integer,
	`creator_ip_hash` text
);
--> statement-breakpoint
CREATE INDEX `page_snapshots_created_at_idx` ON `page_snapshots` (`created_at`);--> statement-breakpoint
CREATE INDEX `page_snapshots_expires_at_idx` ON `page_snapshots` (`expires_at`);--> statement-breakpoint
CREATE TABLE `share_rate_limits` (
	`ip_hash` text NOT NULL,
	`window_start` integer NOT NULL,
	`request_count` integer DEFAULT 1 NOT NULL,
	PRIMARY KEY(`ip_hash`, `window_start`)
);
