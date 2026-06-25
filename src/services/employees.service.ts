import type { Employee } from "@/store/employees.store";
import { USE_API, request, mockRequest } from "./http";

export const employeesService = {
  async getAll(): Promise<Employee[]> {
    return USE_API ? request<Employee[]>("/employees/") : mockRequest([], 300);
  },
  async create(e: Omit<Employee, "id">): Promise<Employee> {
    return USE_API
      ? request<Employee>("/employees/", { method: "POST", body: JSON.stringify(e) })
      : mockRequest({ ...e, id: `emp-${Date.now()}` } as Employee, 200);
  },
  async update(e: Employee): Promise<Employee> {
    return USE_API
      ? request<Employee>(`/employees/${e.id}/`, { method: "PATCH", body: JSON.stringify(e) })
      : mockRequest(e, 200);
  },
  async remove(id: string): Promise<void> {
    if (USE_API) await request<void>(`/employees/${id}/`, { method: "DELETE" });
  },
};
