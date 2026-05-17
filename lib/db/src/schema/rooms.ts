import { pgTable, text, boolean, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const roomsTable = pgTable("rooms", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  isPrivate: boolean("is_private").notNull().default(false),
  isGlobal: boolean("is_global").notNull().default(false),
  inviteCode: text("invite_code"),
  inactivityDeleteMinutes: integer("inactivity_delete_minutes"),
  emptyDeleteMinutes: integer("empty_delete_minutes").default(15),
  messageRetentionHours: integer("message_retention_hours"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  lastActivityAt: timestamp("last_activity_at"),
  expiresAt: timestamp("expires_at"),
});

export const insertRoomSchema = createInsertSchema(roomsTable).omit({ createdAt: true, lastActivityAt: true });
export type InsertRoom = z.infer<typeof insertRoomSchema>;
export type Room = typeof roomsTable.$inferSelect;
