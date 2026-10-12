import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface Branch {
  id: string;
  name: string;
  address: string | null;
  isDefault: boolean;
}

export interface BranchInput {
  name: string;
  address?: string;
}

export function useBranches() {
  return useQuery({
    queryKey: ["branches"],
    queryFn: async () =>
      (await api.get<{ items: Branch[] }>("/branches")).data.items,
    staleTime: 60_000,
  });
}

export function useCreateBranch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: BranchInput) =>
      (await api.post<Branch>("/branches", input)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["branches"] }),
  });
}
