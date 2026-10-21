CREATE TABLE `blocks` (
	`player_id` text NOT NULL,
	`target` text NOT NULL,
	PRIMARY KEY(`player_id`, `target`),
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`target`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `players` (
	`id` text PRIMARY KEY NOT NULL,
	`token_hash` text NOT NULL,
	`nickname` text NOT NULL,
	`avatar` integer NOT NULL,
	`moderated` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	CONSTRAINT "valid_name" CHECK(length("players"."nickname") between 3 and 18),
	CONSTRAINT "valid_avatar" CHECK("players"."avatar" between 0 and 3)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `players_token_hash_unique` ON `players` (`token_hash`);--> statement-breakpoint
CREATE TABLE `rate_windows` (
	`key` text NOT NULL,
	`bucket` integer NOT NULL,
	`count` integer NOT NULL,
	`expires_at` integer NOT NULL,
	PRIMARY KEY(`key`, `bucket`)
);
--> statement-breakpoint
CREATE INDEX `rate_expiry` ON `rate_windows` (`expires_at`);--> statement-breakpoint
CREATE TABLE `reports` (
	`id` text PRIMARY KEY NOT NULL,
	`reporter` text,
	`target` text NOT NULL,
	`reason` text NOT NULL,
	`state` text DEFAULT 'open' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`reporter`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`target`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `report_state` ON `reports` (`state`,`created_at`);--> statement-breakpoint
CREATE TABLE `results` (
	`player_id` text NOT NULL,
	`level` integer NOT NULL,
	`points` integer NOT NULL,
	`score` integer NOT NULL,
	`moves` integer NOT NULL,
	`scene` text NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`player_id`, `level`),
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "valid_points" CHECK("results"."points" in (125,150,175)),
	CONSTRAINT "valid_level" CHECK("results"."level" between 1 and 2000)
);
--> statement-breakpoint
CREATE TABLE `support_tickets` (
	`id` text PRIMARY KEY NOT NULL,
	`category` text NOT NULL,
	`message` text NOT NULL,
	`reply_hash` text NOT NULL,
	`reply` text,
	`state` text DEFAULT 'open' NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `support_tickets_reply_hash_unique` ON `support_tickets` (`reply_hash`);--> statement-breakpoint
CREATE INDEX `ticket_expiry` ON `support_tickets` (`expires_at`);