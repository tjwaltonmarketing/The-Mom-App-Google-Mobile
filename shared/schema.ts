import { pgTable, text, serial, integer, boolean, timestamp, varchar } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  firstName: varchar("first_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }),
  isVerified: boolean("is_verified").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const families = pgTable("families", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  ownerId: integer("owner_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const familyMemberships = pgTable("family_memberships", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  familyId: integer("family_id").references(() => families.id).notNull(),
  role: text("role").notNull().default("member"), // "owner", "admin", "member"
  joinedAt: timestamp("joined_at").defaultNow(),
});

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
  isPrivate: boolean("is_private").default(false),
  visibilityType: text("visibility_type").notNull().default("shared"), // "shared", "private", "busy"
  sharedWith: integer("shared_with").array().default([]), // array of family member IDs
  createdBy: integer("created_by").references(() => familyMembers.id),
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

export const passwords = pgTable("passwords", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(), // "Netflix", "School Portal", "Bank of America"
  category: text("category").notNull(), // "streaming", "banking", "school", "shopping", "utilities"
  website: text("website"), // "netflix.com"
  username: text("username"),
  email: text("email"),
  password: text("password").notNull(), // Encrypted in real implementation
  notes: text("notes"), // Additional info, security questions, etc.
  lastUpdated: timestamp("last_updated").defaultNow(),
  createdBy: integer("created_by").references(() => familyMembers.id),
  sharedWith: text("shared_with"), // JSON array of family member IDs who can access
  isFavorite: boolean("is_favorite").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  familyId: integer("family_id").references(() => familyMembers.id).notNull(),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  status: text("status").notNull().default("trial"), // "trial", "active", "canceled", "past_due"
  plan: text("plan").notNull().default("family"), // "family"
  billingCycle: text("billing_cycle").notNull().default("monthly"), // "monthly", "yearly"
  trialStartDate: timestamp("trial_start_date").defaultNow(),
  trialEndDate: timestamp("trial_end_date").notNull(),
  subscriptionStartDate: timestamp("subscription_start_date"),
  subscriptionEndDate: timestamp("subscription_end_date"),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const groceryItems = pgTable("grocery_items", {
  id: serial("id").primaryKey(),
  item: text("item").notNull(),
  quantity: text("quantity").notNull(),
  category: text("category").notNull(),
  isCompleted: boolean("is_completed").default(false),
  addedBy: integer("added_by").references(() => familyMembers.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const mealPlans = pgTable("meal_plans", {
  id: serial("id").primaryKey(),
  day: text("day").notNull(),
  mealType: text("meal_type").notNull(), // "breakfast", "lunch", "dinner", "snack"
  meal: text("meal").notNull(),
  ingredients: text("ingredients").array(),
  notes: text("notes"),
  createdBy: integer("created_by").references(() => familyMembers.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
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

export const insertPasswordSchema = createInsertSchema(passwords).omit({
  id: true,
  lastUpdated: true,
  createdAt: true,
});

export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertGroceryItemSchema = createInsertSchema(groceryItems).omit({
  id: true,
  createdAt: true,
});

export const insertMealPlanSchema = createInsertSchema(mealPlans).omit({
  id: true,
  createdAt: true,
});

// New auth-related schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  isVerified: true,
  createdAt: true,
  updatedAt: true,
});

export const insertFamilySchema = createInsertSchema(families).omit({
  id: true,
  createdAt: true,
});

export const insertFamilyMembershipSchema = createInsertSchema(familyMemberships).omit({
  id: true,
  joinedAt: true,
});

// Sessions table for authentication
export const sessions = pgTable("sessions", {
  sid: varchar("sid").primaryKey(),
  sess: text("sess").notNull(),
  expire: timestamp("expire").notNull(),
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

export const passwordsRelations = relations(passwords, ({ one }) => ({
  creator: one(familyMembers, {
    fields: [passwords.createdBy],
    references: [familyMembers.id],
  }),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  family: one(familyMembers, {
    fields: [subscriptions.familyId],
    references: [familyMembers.id],
  }),
}));

export const groceryItemsRelations = relations(groceryItems, ({ one }) => ({
  addedBy: one(familyMembers, {
    fields: [groceryItems.addedBy],
    references: [familyMembers.id],
  }),
}));

export const mealPlansRelations = relations(mealPlans, ({ one }) => ({
  createdBy: one(familyMembers, {
    fields: [mealPlans.createdBy],
    references: [familyMembers.id],
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

export type Password = typeof passwords.$inferSelect;
export type InsertPassword = z.infer<typeof insertPasswordSchema>;

export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;

export type GroceryItem = typeof groceryItems.$inferSelect;
export type InsertGroceryItem = z.infer<typeof insertGroceryItemSchema>;

export type MealPlan = typeof mealPlans.$inferSelect;
export type InsertMealPlan = z.infer<typeof insertMealPlanSchema>;

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Family = typeof families.$inferSelect;
export type InsertFamily = z.infer<typeof insertFamilySchema>;

export type FamilyMembership = typeof familyMemberships.$inferSelect;
export type InsertFamilyMembership = z.infer<typeof insertFamilyMembershipSchema>;
