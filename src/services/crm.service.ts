import type { Customer } from "@/types";
import { CUSTOMERS } from "@/mock/datasets";
import { USE_API, request, mockRequest } from "./http";

export const crmService = {
  /** GET /api/v1/customers/ */
  async getCustomers(): Promise<Customer[]> {
    return USE_API ? request<Customer[]>("/customers/") : mockRequest(CUSTOMERS, 600);
  },
};
