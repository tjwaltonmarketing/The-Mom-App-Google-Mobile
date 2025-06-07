import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const familyMembers = pgTable("family_members", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  role: text("role").notNull(), // "mom", "dad", "child"
  color: text("color").notNull(), // hex color for UI
  avatar: text("avatar").notNull(), // initial letter
  phone: text("phone"), // for SMS notifications
  email: text("email"), // for email notifications
  notificationPreference: text("notification_preference").default("sms"), // "sms", "email", "both", "none"
});

export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  location: text("location"),
  assignedTo: integer("assigned_to").references(() => familyMembers.id),
  isAllDay: boolean("is_all_day").default(false),
});

export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  isCompleted: boolean("is_completed").default(false),
  priority: text("priority").notNull().default("medium"), // "low", "medium", "high"
  dueDate: timestamp("due_date"),
  assignedTo: integer("assigned_to").references(() => familyMembers.id),
  completedBy: integer("completed_by").references(() => familyMembers.id),
  completedAt: timestamp("completed_at"),
});

export const voiceNotes = pgTable("voice_notes", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  transcription: text("transcription"),
  createdBy: integer("created_by").references(() => familyMembers.id),
  createdAt: timestamp("created_at").defaultNow(),
  isProcessed: boolean("is_processed").default(false),
});

export const deadlines = pgTable("deadlines", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  dueDate: timestamp("due_date").notNull(),
  priority: text("priority").notNull().default("medium"), // "low", "medium", "high"
  isCompleted: boolean("is_completed").default(false),
  relatedTo: integer("related_to").references(() => familyMembers.id),
});

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // "task_assigned", "task_due", "event_reminder"
  title: text("title").notNull(),
  message: text("message").notNull(),
  recipientId: integer("recipient_id").notNull().references(() => familyMembers.id),
  relatedTaskId: integer("related_task_id").references(() => tasks.id),
  relatedEventId: integer("related_event_id").references(() => events.id),
  scheduledFor: timestamp("scheduled_for").notNull(),
  sentAt: timestamp("sent_at"),
  deliveryMethod: text("delivery_method").notNull(), // "sms", "email"
  status: text("status").notNull().default("pending"), // "pending", "sent", "failed"
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertFamilyMemberSchema = createInsertSchema(familyMembers).omit({
  id: true,
});

export const insertEventSchema = createInsertSchema(events).omit({
  id: true,
});

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  completedBy: true,
  completedAt: true,
});

export const insertVoiceNoteSchema = createInsertSchema(voiceNotes).omit({
  id: true,
  createdAt: true,
  isProcessed: true,
});

export const insertDeadlineSchema = createInsertSchema(deadlines).omit({
  id: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  sentAt: true,
  createdAt: true,
});

// Relations
export const familyMembersRelations = relations(familyMembers, ({ many }) => ({
  events: many(events),
  assignedTasks: many(tasks, { relationName: "assignedTo" }),
  completedTasks: many(tasks, { relationName: "completedBy" }),
  voiceNotes: many(voiceNotes),
  deadlines: many(deadlines),
}));

export const eventsRelations = relations(events, ({ one }) => ({
  assignedMember: one(familyMembers, {
    fields: [events.assignedTo],
    references: [familyMembers.id],
  }),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  assignedMember: one(familyMembers, {
    fields: [tasks.assignedTo],
    references: [familyMembers.id],
    relationName: "assignedTo",
  }),
  completedByMember: one(familyMembers, {
    fields: [tasks.completedBy],
    references: [familyMembers.id],
    relationName: "completedBy",
  }),
}));

export const voiceNotesRelations = relations(voiceNotes, ({ one }) => ({
  createdBy: one(familyMembers, {
    fields: [voiceNotes.createdBy],
    references: [familyMembers.id],
  }),
}));

export const deadlinesRelations = relations(deadlines, ({ one }) => ({
  relatedMember: one(familyMembers, {
    fields: [deadlines.relatedTo],
    references: [familyMembers.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  recipient: one(familyMembers, {
    fields: [notifications.recipientId],
    references: [familyMembers.id],
  }),
  relatedTask: one(tasks, {
    fields: [notifications.relatedTaskId],
    references: [tasks.id],
  }),
  relatedEvent: one(events, {
    fields: [notifications.relatedEventId],
    references: [events.id],
  }),
}));

export type FamilyMember = typeof familyMembers.$inferSelect;
export type InsertFamilyMember = z.infer<typeof insertFamilyMemberSchema>;

export type Event = typeof events.$inferSelect;
export type InsertEvent = z.infer<typeof insertEventSchema>;

export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;

export type VoiceNote = typeof voiceNotes.$inferSelect;
export type InsertVoiceNote = z.infer<typeof insertVoiceNoteSchema>;

export type Deadline = typeof deadlines.$inferSelect;
export type InsertDeadline = z.infer<typeof insertDeadlineSchema>;

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
