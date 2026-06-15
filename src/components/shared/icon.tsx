import * as Icons from "lucide-react";
import type { LucideProps } from "lucide-react";

export function Icon({ name, ...props }: { name: string } & LucideProps) {
  const Cmp = (Icons[name as keyof typeof Icons] ?? Icons.Circle) as React.ElementType;
  return <Cmp {...props} />;
}
