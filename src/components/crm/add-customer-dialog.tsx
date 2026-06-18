"use client";

import { useEffect, useState } from "react";
import type { Customer, LoyaltyTier } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LOYALTY } from "@/lib/status";

const TIERS = Object.keys(LOYALTY) as LoyaltyTier[];

export function AddCustomerDialog({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreate: (c: Customer) => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [tier, setTier] = useState<LoyaltyTier>("bronze");

  useEffect(() => {
    if (open) {
      setName(""); setPhone(""); setEmail(""); setTier("bronze");
    }
  }, [open]);

  const valid = name.trim() && phone.trim();

  const submit = () => {
    if (!valid) return;
    onCreate({
      id: `c-${Date.now()}`,
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim() || "—",
      lastVisit: "Hoy",
      totalSpent: 0,
      visits: 0,
      points: 0,
      tier,
      history: [],
      coupons: [],
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nuevo cliente</DialogTitle>
          <DialogDescription>Registra un cliente en el programa de fidelización.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Nombre completo</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: María Fernanda López" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Teléfono</label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="300 123 4567" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Nivel</label>
              <Select value={tier} onValueChange={(v) => setTier(v as LoyaltyTier)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIERS.map((t) => <SelectItem key={t} value={t}>{LOYALTY[t].label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Correo (opcional)</label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="cliente@email.com" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={!valid}>Agregar cliente</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
