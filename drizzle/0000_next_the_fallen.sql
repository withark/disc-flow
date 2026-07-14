CREATE TABLE `disc_results` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`team` text DEFAULT '' NOT NULL,
	`d` integer NOT NULL,
	`i` integer NOT NULL,
	`s` integer NOT NULL,
	`c` integer NOT NULL,
	`dominant` text NOT NULL,
	`secondary` text NOT NULL,
	`pace` integer NOT NULL,
	`focus` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
