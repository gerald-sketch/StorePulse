import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Branch } from "@/features/branches/use-branches";

export type Role = "OWNER" | "MANAGER" | "STAFF";

export interface Employee {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
  branch: Pick<Branch, "id" | "name">;
}

export interface CreateEmployeeInput {
  name: string;
  email: string;
  password: string;
  role: Role;
  branchId: string;
}

export interface UpdateEmployeeInput {
  name?: string;
  role?: Role;
  branchId?: string;
}

export interface ResetPasswordInput {
  id: string;
  password: string;
}

export function useEmployees() {
  return useQuery({
    queryKey: ["employees"],
    queryFn: async () =>
      (await api.get<{ items: Employee[] }>("/employees")).data.items,
  });
}

export function useCreateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateEmployeeInput) =>
      (await api.post<Employee>("/employees", input)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["employees"] }),
  });
}

export function useUpdateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...input
    }: UpdateEmployeeInput & { id: string }) =>
      (await api.patch<Employee>(`/employees/${id}`, input)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["employees"] }),
  });
}

export function useResetPassword() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, password }: ResetPasswordInput) => {
      await api.patch(`/employees/${id}/password`, { password });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["employees"] }),
  });
}

export function useDeleteEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/employees/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["employees"] }),
  });
}
