import { pgTable, text, serial, integer, boolean, timestamp, decimal } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === TABLE DEFINITIONS ===

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  cost: decimal("cost", { precision: 10, scale: 2 }).notNull(),
  billingCycle: text("billing_cycle").notNull(), // 'monthly', 'yearly'
  startDate: timestamp("start_date").notNull(),
  trialEndDate: timestamp("trial_end_date"),
  isActive: boolean("is_active").default(true).notNull(),
  autoCancel: boolean("auto_cancel").default(false).notNull(), // Ghost Cancel flag
  lastUsageDate: timestamp("last_usage_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const usageLogs = pgTable("usage_logs", {
  id: serial("id").primaryKey(),
  subscriptionId: integer("subscription_id").notNull(),
  date: timestamp("date").defaultNow().notNull(),
});

export const groups = pgTable("groups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  ownerId: integer("owner_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const groupMembers = pgTable("group_members", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").notNull(),
  userId: integer("user_id").notNull(), // In a real app this might link to users table, but for simplicity/demo we might just store names if users aren't fully reg'd
  memberName: text("member_name").notNull(), // For the "Virtual" wallet simulation
  splitPercentage: decimal("split_percentage", { precision: 5, scale: 2 }).default("0"),
});

// === RELATIONS ===

export const usersRelations = relations(users, ({ many }) => ({
  subscriptions: many(subscriptions),
  ownedGroups: many(groups),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one, many }) => ({
  user: one(users, {
    fields: [subscriptions.userId],
    references: [users.id],
  }),
  usageLogs: many(usageLogs),
}));

export const usageLogsRelations = relations(usageLogs, ({ one }) => ({
  subscription: one(subscriptions, {
    fields: [usageLogs.subscriptionId],
    references: [subscriptions.id],
  }),
}));

export const groupsRelations = relations(groups, ({ one, many }) => ({
  owner: one(users, {
    fields: [groups.ownerId],
    references: [users.id],
  }),
  members: many(groupMembers),
}));

export const groupMembersRelations = relations(groupMembers, ({ one }) => ({
  group: one(groups, {
    fields: [groupMembers.groupId],
    references: [groups.id],
  }),
}));

// === BASE SCHEMAS ===

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({ 
  id: true, 
  createdAt: true, 
  lastUsageDate: true 
});
export const insertUsageLogSchema = createInsertSchema(usageLogs).omit({ id: true, date: true });
export const insertGroupSchema = createInsertSchema(groups).omit({ id: true, createdAt: true });
export const insertGroupMemberSchema = createInsertSchema(groupMembers).omit({ id: true });

// === EXPLICIT API CONTRACT TYPES ===

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;

export type UsageLog = typeof usageLogs.$inferSelect;
export type Group = typeof groups.$inferSelect;
export type GroupMember = typeof groupMembers.$inferSelect;

// Request types
export type CreateSubscriptionRequest = InsertSubscription;
export type UpdateSubscriptionRequest = Partial<InsertSubscription>;

export type CreateGroupRequest = z.infer<typeof insertGroupSchema>;
export type AddGroupMemberRequest = z.infer<typeof insertGroupMemberSchema>;

// Response types extended with calculated fields
export interface SubscriptionWithStats extends Subscription {
  usageCount: number;
  costPerUse: string; // formatted string
  valueScore: 'Good' | 'Average' | 'Waste';
  daysUntilRenewal: number;
}

export interface DashboardStats {
  totalMonthlySpend: number;
  activeCount: number;
  cancelledCount: number;
  wasteCount: number;
}

export type SubscriptionsListResponse = SubscriptionWithStats[];

