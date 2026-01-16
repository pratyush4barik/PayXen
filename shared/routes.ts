import { z } from 'zod';
import { insertSubscriptionSchema, insertGroupSchema, insertGroupMemberSchema, subscriptions, groups, groupMembers, usageLogs } from './schema';

// ============================================
// SHARED ERROR SCHEMAS
// ============================================
export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
  unauthorized: z.object({
    message: z.string(),
  }),
};

// ============================================
// API CONTRACT
// ============================================
export const api = {
  auth: {
    register: {
      method: 'POST' as const,
      path: '/api/register',
      input: z.object({
        username: z.string().min(3),
        password: z.string().min(6),
      }),
      responses: {
        201: z.object({ id: z.number(), username: z.string() }),
        400: errorSchemas.validation,
      },
    },
    login: {
      method: 'POST' as const,
      path: '/api/login',
      input: z.object({
        username: z.string(),
        password: z.string(),
      }),
      responses: {
        200: z.object({ id: z.number(), username: z.string() }),
        401: errorSchemas.unauthorized,
      },
    },
    logout: {
      method: 'POST' as const,
      path: '/api/logout',
      responses: {
        200: z.void(),
      },
    },
    me: {
      method: 'GET' as const,
      path: '/api/user',
      responses: {
        200: z.object({ id: z.number(), username: z.string() }).nullable(),
      },
    }
  },
  subscriptions: {
    list: {
      method: 'GET' as const,
      path: '/api/subscriptions',
      responses: {
        200: z.array(z.custom<any>()), // SubscriptionWithStats
        401: errorSchemas.unauthorized,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/subscriptions',
      input: insertSubscriptionSchema.omit({ userId: true }), // userId comes from session
      responses: {
        201: z.custom<typeof subscriptions.$inferSelect>(),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/subscriptions/:id',
      responses: {
        200: z.custom<typeof subscriptions.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/subscriptions/:id',
      input: insertSubscriptionSchema.omit({ userId: true }).partial(),
      responses: {
        200: z.custom<typeof subscriptions.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/subscriptions/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
    logUsage: {
      method: 'POST' as const,
      path: '/api/subscriptions/:id/usage',
      responses: {
        201: z.custom<typeof usageLogs.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
  },
  groups: {
    list: {
      method: 'GET' as const,
      path: '/api/groups',
      responses: {
        200: z.array(z.custom<typeof groups.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/groups',
      input: insertGroupSchema.omit({ ownerId: true }),
      responses: {
        201: z.custom<typeof groups.$inferSelect>(),
      },
    },
    addMember: {
      method: 'POST' as const,
      path: '/api/groups/:id/members',
      input: insertGroupMemberSchema.omit({ groupId: true }),
      responses: {
        201: z.custom<typeof groupMembers.$inferSelect>(),
      },
    },
    getMembers: {
      method: 'GET' as const,
      path: '/api/groups/:id/members',
      responses: {
        200: z.array(z.custom<typeof groupMembers.$inferSelect>()),
      },
    }
  },
  stats: {
    dashboard: {
      method: 'GET' as const,
      path: '/api/stats/dashboard',
      responses: {
        200: z.object({
          totalMonthlySpend: z.number(),
          activeCount: z.number(),
          cancelledCount: z.number(),
          wasteCount: z.number(),
        }),
      },
    },
  },
};

// ============================================
// HELPER
// ============================================
export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
