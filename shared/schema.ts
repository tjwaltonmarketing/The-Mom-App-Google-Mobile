import { pgTable, text, serial, integer, boolean, timestamp, varchar, index, jsonb } from "drizzle-orm/pg-core";
import { sql } from 'drizzle-orm';
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash"), // Make optional for Replit Auth users
  firstName: varchar("first_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }),
  profileImageUrl: varchar("profile_image_url", { length: 500 }), // Add for Replit Auth
  replitUserId: varchar("replit_user_id", { length: 255 }).unique(), // Link to Replit Auth
  authMethod: varchar("auth_method", { length: 50 }).default("email"), // "email", "replit"
  isVerified: boolean("is_verified").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Separate table for trial and billing information
export const userSubscriptions = pgTable("user_subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  trialStartDate: timestamp("trial_start_date").defaultNow(),
  trialEndDate: timestamp("trial_end_date"),
  subscriptionPlan: varchar("subscription_plan", { length: 50 }).default("trial"), // "trial", "individual", "family", "expired"
  subscriptionStatus: varchar("subscription_status", { length: 50 }).default("active"), // "active", "cancelled", "past_due", "expired"
  stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
  stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }),
  billingInterval: varchar("billing_interval", { length: 20 }), // "monthly", "yearly"
  lastPaymentDate: timestamp("last_payment_date"),
  nextBillingDate: timestamp("next_billing_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  isUsed: boolean("is_used").default(false),
  resetType: text("reset_type").notNull().default("email"), // "email", "sms", "security_questions"
  phoneNumber: text("phone_number"), // for SMS resets
  createdAt: timestamp("created_at").defaultNow(),
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
  role: text("role").notNull(), // "mom", "dad", "child", "teen"
  color: text("color").notNull(), // hex color for UI
  avatar: text("avatar"), // initial letter - optional, will be generated from name
  phone: text("phone"), // for SMS notifications
  email: text("email"), // for email notifications
  notificationPreference: text("notification_preference").default("sms"), // "sms", "email", "both", "none"
  userId: integer("user_id").references(() => users.id), // Links to actual user account (for parents/teens who can log in)
  familyId: integer("family_id").references(() => families.id).notNull(), // Which family this member belongs to
  canLogin: boolean("can_login").default(false), // Whether this member can log into the app
  isActive: boolean("is_active").default(true), // For soft deletion/deactivation
});



export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  location: text("location"),
  familyId: integer("family_id").references(() => families.id),
  assignedTo: integer("assigned_to").array().default([]),
  isAllDay: boolean("is_all_day").default(false),
  isPrivate: boolean("is_private").default(false),
  visibilityType: text("visibility_type").notNull().default("shared"), // "shared", "private", "busy"
  sharedWith: integer("shared_with").array().default([]), // array of family member IDs
  createdBy: integer("created_by").references(() => familyMembers.id),
  // Recurrence fields
  recurrenceType: text("recurrence_type").default("none"), // "none", "daily", "weekly", "monthly", "yearly"
  recurrenceInterval: integer("recurrence_interval").default(1), // every N days/weeks/months/years
  recurrenceEndDate: timestamp("recurrence_end_date"), // when recurrence ends (null = forever)
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
  createdBy: integer("created_by").references(() => familyMembers.id),
  createdAt: timestamp("created_at").defaultNow(),
  category: text("category").default("chores"), // "chores", "homework", "personal", "family"
  estimatedTime: integer("estimated_time"), // in minutes
  points: integer("points").default(10), // reward points for teens
  teenId: integer("teen_id"), // reference to teen profile if assigned to teen
  childProfileId: integer("child_profile_id").references(() => childProfiles.id), // reference to child profile if assigned to child
  isPrivate: boolean("is_private").default(false), // private tasks only visible to creator
});

export const voiceNotes = pgTable("voice_notes", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  transcription: text("transcription"),
  createdBy: integer("created_by").references(() => familyMembers.id),
  createdAt: timestamp("created_at").defaultNow(),
  isProcessed: boolean("is_processed").default(false),
});

export const textNotes = pgTable("text_notes", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
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

export const pushTokens = pgTable("push_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  familyMemberId: integer("family_member_id").references(() => familyMembers.id),
  token: text("token").notNull().unique(),
  platform: varchar("platform", { length: 20 }).notNull(), // "android", "ios", "web"
  deviceInfo: jsonb("device_info"), // Store additional device information
  isActive: boolean("is_active").default(true),
  lastUsed: timestamp("last_used").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userIdIdx: index("push_tokens_user_id_idx").on(table.userId),
  familyMemberIdIdx: index("push_tokens_family_member_id_idx").on(table.familyMemberId),
  platformIdx: index("push_tokens_platform_idx").on(table.platform),
}));

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

export const householdSettings = pgTable("household_settings", {
  id: serial("id").primaryKey(),
  familyId: integer("family_id").references(() => families.id).notNull(),
  dishwasherIsClean: boolean("dishwasher_is_clean").default(false),
  dishwasherLastUpdated: timestamp("dishwasher_last_updated").defaultNow(),
  dishwasherLastUpdatedBy: integer("dishwasher_last_updated_by").references(() => familyMembers.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Teen account system tables
export const familyInvites = pgTable("family_invites", {
  id: serial("id").primaryKey(),
  inviteCode: varchar("invite_code", { length: 50 }).notNull().unique(),
  familyId: integer("family_id").references(() => families.id).notNull(),
  invitedBy: integer("invited_by").references(() => users.id).notNull(),
  invitedContact: varchar("invited_contact", { length: 255 }).notNull(), // email or phone
  contactType: text("contact_type").notNull(), // "email" or "phone"
  invitedRole: text("invited_role").notNull().default("teen"), // "teen", "child", "young-adult"
  teenName: varchar("teen_name", { length: 100 }).notNull(),
  status: text("status").notNull().default("pending"), // "pending", "accepted", "expired"
  expiresAt: timestamp("expires_at").notNull(),
  acceptedAt: timestamp("accepted_at"),
  acceptedBy: integer("accepted_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const teenProfiles = pgTable("teen_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("userId").references(() => users.id).notNull().unique(),
  familyMemberId: integer("familyMemberId").references(() => familyMembers.id).notNull(),
  firstName: varchar("firstName", { length: 100 }).notNull(),
  lastName: varchar("lastName", { length: 100 }),
  username: varchar("username", { length: 50 }).notNull().unique(),
  avatar: text("avatar"), // base64 image data - persistent storage
  age: integer("age"),
  favoriteColor: varchar("favoriteColor", { length: 20 }).default("purple"),
  points: integer("points").default(0),
  streak: integer("streak").default(0), // consecutive days of completing tasks
  lastActivityDate: timestamp("lastActivityDate"),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
});

export const teenNotificationSettings = pgTable("teen_notification_settings", {
  id: serial("id").primaryKey(),
  teenProfileId: integer("teenProfileId").references(() => teenProfiles.id).notNull().unique(),
  taskReminders: boolean("taskReminders").default(true),
  eventNotifications: boolean("eventNotifications").default(true),
  dailyDigest: boolean("dailyDigest").default(true),
  quietHours: boolean("quietHours").default(true),
  quietStart: varchar("quietStart", { length: 5 }).default("22:00"),
  quietEnd: varchar("quietEnd", { length: 5 }).default("08:00"),
  updatedAt: timestamp("updatedAt").defaultNow(),
});

export const teenTaskHistory = pgTable("teen_task_history", {
  id: serial("id").primaryKey(),
  teenProfileId: integer("teenProfileId").references(() => teenProfiles.id).notNull(),
  taskId: integer("taskId").references(() => tasks.id).notNull(),
  pointsEarned: integer("pointsEarned").default(0),
  completedAt: timestamp("completedAt").defaultNow(),
  streakDay: integer("streakDay"), // Which day of their streak this was
});

export const teenNotificationLog = pgTable("teen_notification_log", {
  id: serial("id").primaryKey(),
  teenProfileId: integer("teenProfileId").references(() => teenProfiles.id).notNull(),
  taskId: integer("taskId").references(() => tasks.id),
  notificationType: text("notificationType").notNull(), // "task_reminder", "task_overdue", etc.
  templateId: varchar("templateId", { length: 50 }).notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  scheduledFor: timestamp("scheduledFor").notNull(),
  sentAt: timestamp("sentAt"),
  wasDelivered: boolean("wasDelivered").default(false),
  wasOpened: boolean("wasOpened").default(false),
  createdAt: timestamp("createdAt").defaultNow(),
});

// Child account system for young kids without phones
export const childProfiles = pgTable("child_profiles", {
  id: serial("id").primaryKey(),
  familyMemberId: integer("family_member_id").references(() => familyMembers.id).notNull().unique(),
  familyId: integer("family_id").references(() => families.id).notNull(), // enforce family-level security
  createdBy: integer("created_by").references(() => familyMembers.id).notNull(), // parent who created this
  displayName: varchar("display_name", { length: 100 }).notNull(),
  nickname: varchar("nickname", { length: 50 }),
  age: integer("age"),
  favoriteColor: varchar("favorite_color", { length: 20 }).default("blue"),
  avatar: text("avatar"), // emoji or icon identifier
  printLayout: text("print_layout").default("simple"), // "simple", "detailed", "pictorial"
  showIcons: boolean("show_icons").default(true),
  showTimeBlocks: boolean("show_time_blocks").default(false),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Track when parents complete tasks on behalf of children
export const parentTaskCompletions = pgTable("parent_task_completions", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").references(() => tasks.id).notNull(),
  childProfileId: integer("child_profile_id").references(() => childProfiles.id).notNull(),
  completedByParent: integer("completed_by_parent").references(() => familyMembers.id).notNull(),
  familyId: integer("family_id").references(() => families.id).notNull(), // enforce family-level security
  completionMethod: text("completion_method").notNull().default("manual"), // "manual", "printed_checklist"
  notes: text("notes"), // optional notes from parent
  completedAt: timestamp("completed_at").defaultNow(),
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
}).extend({
  dueDate: z.union([z.date(), z.string(), z.null()]).optional(),
});

export const insertVoiceNoteSchema = createInsertSchema(voiceNotes).omit({
  id: true,
  createdAt: true,
  isProcessed: true,
});

export const insertTextNoteSchema = createInsertSchema(textNotes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDeadlineSchema = createInsertSchema(deadlines).omit({
  id: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  sentAt: true,
  createdAt: true,
});

export const insertPushTokenSchema = createInsertSchema(pushTokens).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastUsed: true,
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

export const insertHouseholdSettingsSchema = createInsertSchema(householdSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Teen account schemas
export const insertFamilyInviteSchema = createInsertSchema(familyInvites).omit({
  id: true,
  createdAt: true,
  acceptedAt: true,
  acceptedBy: true,
});

export const insertTeenProfileSchema = createInsertSchema(teenProfiles).omit({
  id: true,
  points: true,
  streak: true,
  lastActivityDate: true,
  createdAt: true,
});

export const insertTeenNotificationSettingsSchema = createInsertSchema(teenNotificationSettings).omit({
  id: true,
  updatedAt: true,
});

export const insertTeenTaskHistorySchema = createInsertSchema(teenTaskHistory).omit({
  id: true,
  completedAt: true,
});

export const insertTeenNotificationLogSchema = createInsertSchema(teenNotificationLog).omit({
  id: true,
  sentAt: true,
  wasDelivered: true,
  wasOpened: true,
  createdAt: true,
});

// Child profile schemas
export const insertChildProfileSchema = createInsertSchema(childProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertParentTaskCompletionSchema = createInsertSchema(parentTaskCompletions).omit({
  id: true,
  completedAt: true,
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

export const insertUserSubscriptionSchema = createInsertSchema(userSubscriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Sessions table for authentication (Replit Auth compatible)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Family merge requests table - temporarily commented out for migration
// export const familyMergeRequests = pgTable("family_merge_requests", {
//   id: serial("id").primaryKey(),
//   requesterId: integer("requester_id").references(() => users.id).notNull(),
//   requesterFamilyId: integer("requester_family_id").references(() => families.id).notNull(),
//   partnerEmail: text("partner_email").notNull(),
//   partnerId: integer("partner_id").references(() => users.id), // Null until partner claims request
//   partnerFamilyId: integer("partner_family_id").references(() => families.id), // Null until partner claims request
//   status: text("status").notNull().default("pending"), // "pending", "approved", "rejected", "expired"
//   requestMessage: text("request_message"),
//   approvedAt: timestamp("approved_at"),
//   rejectedAt: timestamp("rejected_at"),
//   expiresAt: timestamp("expires_at").notNull(),
//   createdAt: timestamp("created_at").defaultNow(),
// });

// export const insertFamilyMergeRequestSchema = createInsertSchema(familyMergeRequests).omit({
//   id: true,
//   partnerId: true,
//   partnerFamilyId: true,
//   approvedAt: true,
//   rejectedAt: true,
//   createdAt: true,
// });

// Relations
export const familyMembersRelations = relations(familyMembers, ({ many }) => ({
  events: many(events),
  assignedTasks: many(tasks, { relationName: "assignedTo" }),
  completedTasks: many(tasks, { relationName: "completedBy" }),
  voiceNotes: many(voiceNotes),
  textNotes: many(textNotes),
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

export const textNotesRelations = relations(textNotes, ({ one }) => ({
  user: one(users, {
    fields: [textNotes.userId],
    references: [users.id],
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

// Child profile relations
export const childProfilesRelations = relations(childProfiles, ({ one, many }) => ({
  familyMember: one(familyMembers, {
    fields: [childProfiles.familyMemberId],
    references: [familyMembers.id],
  }),
  family: one(families, {
    fields: [childProfiles.familyId],
    references: [families.id],
  }),
  creator: one(familyMembers, {
    fields: [childProfiles.createdBy],
    references: [familyMembers.id],
    relationName: "childProfileCreator",
  }),
  parentCompletions: many(parentTaskCompletions),
}));

export const parentTaskCompletionsRelations = relations(parentTaskCompletions, ({ one }) => ({
  task: one(tasks, {
    fields: [parentTaskCompletions.taskId],
    references: [tasks.id],
  }),
  childProfile: one(childProfiles, {
    fields: [parentTaskCompletions.childProfileId],
    references: [childProfiles.id],
  }),
  parent: one(familyMembers, {
    fields: [parentTaskCompletions.completedByParent],
    references: [familyMembers.id],
  }),
  family: one(families, {
    fields: [parentTaskCompletions.familyId],
    references: [families.id],
  }),
}));

// Feedback prompts for user satisfaction tracking
export const feedbackPrompts = pgTable("feedback_prompts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  promptType: varchar("prompt_type", { length: 50 }).notNull().default("7_day_check"), // "7_day_check", "30_day_check", etc.
  response: varchar("response", { length: 50 }), // "yes", "no", null if not responded
  feedbackText: text("feedback_text"), // For negative feedback
  reviewRequested: boolean("review_requested").default(false), // If they said yes to leaving review
  reviewCompleted: boolean("review_completed").default(false), // If they clicked through to store
  remindLater: boolean("remind_later").default(false), // If they chose "Maybe Later"
  remindAt: timestamp("remind_at"), // When to remind them again
  shownAt: timestamp("shown_at").defaultNow(),
  respondedAt: timestamp("responded_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertFeedbackPromptSchema = createInsertSchema(feedbackPrompts).omit({ id: true, createdAt: true });

export type FeedbackPrompt = typeof feedbackPrompts.$inferSelect;
export type InsertFeedbackPrompt = z.infer<typeof insertFeedbackPromptSchema>;

export type FamilyMember = typeof familyMembers.$inferSelect;
export type InsertFamilyMember = z.infer<typeof insertFamilyMemberSchema>;

export type Event = typeof events.$inferSelect;
export type InsertEvent = z.infer<typeof insertEventSchema>;

export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;

export type VoiceNote = typeof voiceNotes.$inferSelect;
export type InsertVoiceNote = z.infer<typeof insertVoiceNoteSchema>;

export type TextNote = typeof textNotes.$inferSelect;
export type InsertTextNote = z.infer<typeof insertTextNoteSchema>;

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

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type InsertPasswordResetToken = typeof passwordResetTokens.$inferInsert;

export type Family = typeof families.$inferSelect;
export type InsertFamily = z.infer<typeof insertFamilySchema>;

export type FamilyMembership = typeof familyMemberships.$inferSelect;
export type InsertFamilyMembership = z.infer<typeof insertFamilyMembershipSchema>;

export type FamilyInvite = typeof familyInvites.$inferSelect;
export type InsertFamilyInvite = z.infer<typeof insertFamilyInviteSchema>;

export type TeenProfile = typeof teenProfiles.$inferSelect;
export type InsertTeenProfile = z.infer<typeof insertTeenProfileSchema>;

export type TeenNotificationSettings = typeof teenNotificationSettings.$inferSelect;
export type InsertTeenNotificationSettings = z.infer<typeof insertTeenNotificationSettingsSchema>;

export type TeenTaskHistory = typeof teenTaskHistory.$inferSelect;
export type InsertTeenTaskHistory = z.infer<typeof insertTeenTaskHistorySchema>;

export type TeenNotificationLog = typeof teenNotificationLog.$inferSelect;
export type InsertTeenNotificationLog = z.infer<typeof insertTeenNotificationLogSchema>;

export type ChildProfile = typeof childProfiles.$inferSelect;
export type InsertChildProfile = z.infer<typeof insertChildProfileSchema>;

export type ParentTaskCompletion = typeof parentTaskCompletions.$inferSelect;
export type InsertParentTaskCompletion = z.infer<typeof insertParentTaskCompletionSchema>;

export type UserSubscription = typeof userSubscriptions.$inferSelect;
export type InsertUserSubscription = z.infer<typeof insertUserSubscriptionSchema>;

// export type FamilyMergeRequest = typeof familyMergeRequests.$inferSelect;
// export type InsertFamilyMergeRequest = z.infer<typeof insertFamilyMergeRequestSchema>;

export type HouseholdSettings = typeof householdSettings.$inferSelect;
export type InsertHouseholdSettings = z.infer<typeof insertHouseholdSettingsSchema>;

export type PushToken = typeof pushTokens.$inferSelect;
export type InsertPushToken = z.infer<typeof insertPushTokenSchema>;

// Referral sharing tracking for analytics
export const referralShares = pgTable("referral_shares", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  platform: varchar("platform", { length: 50 }).notNull(), // "facebook", "instagram", "skip"
  bonusAwarded: boolean("bonus_awarded").default(false), // Whether bonus week was given
  bonusDays: integer("bonus_days").default(0), // Number of bonus days awarded
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertReferralShareSchema = createInsertSchema(referralShares).omit({
  id: true,
  createdAt: true,
});

export type ReferralShare = typeof referralShares.$inferSelect;
export type InsertReferralShare = z.infer<typeof insertReferralShareSchema>;

export const userSatisfactionPrompts = pgTable("user_satisfaction_prompts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  promptType: varchar("prompt_type", { length: 50 }).notNull().default("7_day_review"),
  response: varchar("response", { length: 50 }), // "yes", "no", "dismissed", null if not responded
  feedbackText: text("feedback_text"),
  reviewRequested: boolean("review_requested").default(false),
  remindLater: boolean("remind_later").default(false),
  remindAt: timestamp("remind_at"),
  shownAt: timestamp("shown_at").defaultNow(),
  respondedAt: timestamp("responded_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSatisfactionPromptSchema = createInsertSchema(userSatisfactionPrompts).omit({
  id: true,
  createdAt: true,
});

export type UserSatisfactionPrompt = typeof userSatisfactionPrompts.$inferSelect;
export type InsertUserSatisfactionPrompt = z.infer<typeof insertUserSatisfactionPromptSchema>;
