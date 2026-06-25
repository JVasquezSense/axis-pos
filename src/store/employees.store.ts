import { create } from "zustand";
import { USE_API } from "@/services/http";
import { employeesService } from "@/services/employees.service";

export type EmployeeRole = "mesero" | "cocinero" | "cajero" | "admin" | "almacen";

export interface Employee {
  id: string;
  name: string;
  role: EmployeeRole;
  active: boolean;
  phone: string;
  email: string;
}

interface EmployeesState {
  employees: Employee[];
  load: () => Promise<void>;
  add: (e: Omit<Employee, "id">) => void;
  update: (e: Employee) => void;
  remove: (id: string) => void;
  toggle: (id: string) => void;
}

function uid() {
  return `emp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export const EMPLOYEE_ROLE_LABELS: Record<EmployeeRole, string> = {
  mesero: "Mesero",
  cocinero: "Cocinero",
  cajero: "Cajero",
  admin: "Administrador",
  almacen: "Almacén",
};

export const EMPLOYEE_ROLE_COLORS: Record<EmployeeRole, string> = {
  mesero: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  cocinero: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  cajero: "bg-sky-500/15 text-sky-600 border-sky-500/30",
  admin: "bg-violet-500/15 text-violet-600 border-violet-500/30",
  almacen: "bg-cyan-500/15 text-cyan-600 border-cyan-500/30",
};

export const useEmployeesStore = create<EmployeesState>()((set) => ({
  employees: [],

  load: async () => {
    if (!USE_API) return;
    const employees = await employeesService.getAll();
    set({ employees });
  },

  add: (e) => {
    const newEmp = { ...e, id: uid() };
    set((s) => ({ employees: [newEmp, ...s.employees] }));
    if (USE_API) employeesService.create(e).then((saved) =>
      set((s) => ({ employees: s.employees.map((x) => (x.id === newEmp.id ? saved : x)) }))
    ).catch(console.error);
  },

  update: (e) => {
    set((s) => ({ employees: s.employees.map((x) => (x.id === e.id ? e : x)) }));
    if (USE_API) employeesService.update(e).catch(console.error);
  },

  remove: (id) => {
    set((s) => ({ employees: s.employees.filter((e) => e.id !== id) }));
    if (USE_API) employeesService.remove(id).catch(console.error);
  },

  toggle: (id) => {
    set((s) => ({
      employees: s.employees.map((e) => (e.id === id ? { ...e, active: !e.active } : e)),
    }));
    if (USE_API) {
      const emp = useEmployeesStore.getState().employees.find((e) => e.id === id);
      if (emp) employeesService.update(emp).catch(console.error);
    }
  },
}));
