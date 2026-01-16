import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { z } from "zod";
import type { InsertGroup, InsertGroupMember } from "@shared/schema";

type CreateGroupData = Omit<InsertGroup, "ownerId">;
type AddMemberData = Omit<InsertGroupMember, "groupId">;

export function useGroups() {
  return useQuery({
    queryKey: [api.groups.list.path],
    queryFn: async () => {
      const res = await fetch(api.groups.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch groups");
      return api.groups.list.responses[200].parse(await res.json());
    },
  });
}

export function useGroupMembers(groupId: number) {
  return useQuery({
    queryKey: [api.groups.getMembers.path, groupId],
    queryFn: async () => {
      const url = buildUrl(api.groups.getMembers.path, { id: groupId });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch members");
      return api.groups.getMembers.responses[200].parse(await res.json());
    },
    enabled: !!groupId,
  });
}

export function useCreateGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateGroupData) => {
      const validated = api.groups.create.input.parse(data);
      const res = await fetch(api.groups.create.path, {
        method: api.groups.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create group");
      return api.groups.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.groups.list.path] });
    },
  });
}

export function useAddGroupMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ groupId, data }: { groupId: number; data: AddMemberData }) => {
      // Coerce split percentage to number if needed, then string for decimal
      const payload = {
        ...data,
        splitPercentage: String(data.splitPercentage),
      };
      
      const validated = api.groups.addMember.input.parse(payload);
      const url = buildUrl(api.groups.addMember.path, { id: groupId });
      
      const res = await fetch(url, {
        method: api.groups.addMember.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      
      if (!res.ok) throw new Error("Failed to add member");
      return api.groups.addMember.responses[201].parse(await res.json());
    },
    onSuccess: (_, { groupId }) => {
      queryClient.invalidateQueries({ queryKey: [api.groups.getMembers.path, groupId] });
    },
  });
}
