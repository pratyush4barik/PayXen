import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { z } from "zod";
import type { SubscriptionWithStats, InsertSubscription } from "@shared/schema";

// Type definitions derived from schema/routes
type CreateSubscriptionData = Omit<InsertSubscription, "userId">;
type UpdateSubscriptionData = Partial<Omit<InsertSubscription, "userId">>;

export function useSubscriptions() {
  return useQuery({
    queryKey: [api.subscriptions.list.path],
    queryFn: async () => {
      const res = await fetch(api.subscriptions.list.path, { credentials: "include" });
      if (res.status === 401) throw new Error("Unauthorized");
      if (!res.ok) throw new Error("Failed to fetch subscriptions");
      // Using 'any' cast here as z.custom<SubscriptionWithStats> is complex to validate fully client-side
      // Ideally you'd have a full Zod schema for the response type
      return (await res.json()) as SubscriptionWithStats[];
    },
  });
}

export function useSubscription(id: number) {
  return useQuery({
    queryKey: [api.subscriptions.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.subscriptions.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) throw new Error("Subscription not found");
      if (!res.ok) throw new Error("Failed to fetch subscription");
      return api.subscriptions.get.responses[200].parse(await res.json());
    },
    enabled: !!id,
  });
}

export function useCreateSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateSubscriptionData) => {
      // Coerce numeric types
      const payload = {
        ...data,
        cost: Number(data.cost),
      };
      
      const validated = api.subscriptions.create.input.parse(payload);
      
      const res = await fetch(api.subscriptions.create.path, {
        method: api.subscriptions.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      
      if (!res.ok) throw new Error("Failed to create subscription");
      return api.subscriptions.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.subscriptions.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.stats.dashboard.path] });
    },
  });
}

export function useUpdateSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdateSubscriptionData }) => {
       const payload = {
        ...data,
        cost: data.cost ? Number(data.cost) : undefined,
      };
      
      const validated = api.subscriptions.update.input.parse(payload);
      const url = buildUrl(api.subscriptions.update.path, { id });
      
      const res = await fetch(url, {
        method: api.subscriptions.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      
      if (!res.ok) throw new Error("Failed to update subscription");
      return api.subscriptions.update.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.subscriptions.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.stats.dashboard.path] });
    },
  });
}

export function useDeleteSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.subscriptions.delete.path, { id });
      const res = await fetch(url, {
        method: api.subscriptions.delete.method,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete subscription");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.subscriptions.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.stats.dashboard.path] });
    },
  });
}

export function useLogUsage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.subscriptions.logUsage.path, { id });
      const res = await fetch(url, {
        method: api.subscriptions.logUsage.method,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to log usage");
      return api.subscriptions.logUsage.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.subscriptions.list.path] });
    },
  });
}

export function useDashboardStats() {
  return useQuery({
    queryKey: [api.stats.dashboard.path],
    queryFn: async () => {
      const res = await fetch(api.stats.dashboard.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch dashboard stats");
      return api.stats.dashboard.responses[200].parse(await res.json());
    },
  });
}
