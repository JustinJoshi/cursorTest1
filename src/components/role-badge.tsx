import { Badge } from "@/components/ui/badge";

const roleConfig = {
  admin: {
    label: "Admin",
    variant: "default" as const,
  },
  editor: {
    label: "Editor",
    variant: "secondary" as const,
  },
  viewer: {
    label: "Viewer",
    variant: "outline" as const,
  },
};

export function RoleBadge({ role }: { role: "admin" | "editor" | "viewer" }) {
  const config = roleConfig[role];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
