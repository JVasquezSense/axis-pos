import type { Customer } from "@/types";
import { CUSTOMERS } from "@/mock/datasets";
import { mockRequest } from "./http";

export const crmService = {
  /** GET /api/v1/customers/ */
  async getCustomers(): Promise<Customer[]> {
    return mockRequest(CUSTOMERS, 600);
  },
};
