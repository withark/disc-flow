import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const discResults = sqliteTable(
  "disc_results",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    team: text("team").notNull().default(""),
    d: integer("d").notNull(),
    i: integer("i").notNull(),
    s: integer("s").notNull(),
    c: integer("c").notNull(),
    dominant: text("dominant").notNull(),
    secondary: text("secondary").notNull(),
    pace: integer("pace").notNull(),
    focus: integer("focus").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("disc_results_created_at_idx").on(table.createdAt)],
);
