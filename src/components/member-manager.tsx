"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { RoleBadge } from "@/components/role-badge";
import { UserPlus, Trash2, X, Mail, Clock } from "lucide-react";
import { toast } from "sonner";

type Role = "admin" | "editor" | "viewer";

interface Member {
  _id: Id<"teamMembers">;
  teamId: Id<"teams">;
  userId: Id<"users">;
  role: Role;
  joinedAt: number;
  user: {
    _id: Id<"users">;
    name: string;
    email: string;
    imageUrl?: string;
  } | null;
}

interface MemberManagerProps {
  teamId: Id<"teams">;
  members: Member[];
  currentUserRole: Role;
  teamCreatorId: Id<"users">;
}

export function MemberManager({
  teamId,
  members,
  currentUserRole,
  teamCreatorId,
}: MemberManagerProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("viewer");
  const [isAdding, setIsAdding] = useState(false);

  const addMember = useMutation(api.teams.addMember);
  const updateRole = useMutation(api.teams.updateMemberRole);
  const removeMember = useMutation(api.teams.removeMember);
  const cancelInvite = useMutation(api.invites.cancel);

  const pendingInvites = useQuery(api.invites.listPending, { teamId });

  const isAdmin = currentUserRole === "admin";

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsAdding(true);
    try {
      const result = await addMember({ teamId, email: email.trim(), role });
      if (result === "invited") {
        toast.success("Invite sent! They'll be added when they sign up.");
      } else {
        toast.success("Member added successfully");
      }
      setEmail("");
      setRole("viewer");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to add member"
      );
    } finally {
      setIsAdding(false);
    }
  };

  const handleRoleChange = async (
    memberId: Id<"teamMembers">,
    newRole: Role
  ) => {
    try {
      await updateRole({ teamId, memberId, role: newRole });
      toast.success("Role updated");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update role"
      );
    }
  };

  const handleRemoveMember = async (memberId: Id<"teamMembers">) => {
    try {
      await removeMember({ teamId, memberId });
      toast.success("Member removed");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to remove member"
      );
    }
  };

  const handleCancelInvite = async (inviteId: Id<"invites">) => {
    try {
      await cancelInvite({ teamId, inviteId });
      toast.success("Invite cancelled");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to cancel invite"
      );
    }
  };

  return (
    <div className="space-y-6">
      {isAdmin && (
        <form onSubmit={handleAddMember} className="space-y-4">
          <h3 className="text-sm font-medium">Add Member</h3>
          <div className="flex gap-3">
            <div className="flex-1">
              <Label htmlFor="email" className="sr-only">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="user@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isAdding}
              />
            </div>
            <Select
              value={role}
              onValueChange={(v) => setRole(v as Role)}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="editor">Editor</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
              </SelectContent>
            </Select>
            <Button type="submit" disabled={!email.trim() || isAdding}>
              <UserPlus className="h-4 w-4 mr-2" />
              Add
            </Button>
          </div>
        </form>
      )}

      <div>
        <h3 className="text-sm font-medium mb-3">
          Members ({members.length})
        </h3>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Joined</TableHead>
                {isAdmin && <TableHead className="w-12" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member._id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage
                          src={member.user?.imageUrl}
                          alt={member.user?.name}
                        />
                        <AvatarFallback className="text-xs">
                          {member.user?.name
                            ?.split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase() ?? "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">
                          {member.user?.name}
                          {member.userId === teamCreatorId && (
                            <span className="text-xs text-muted-foreground ml-1.5">
                              (creator)
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {member.user?.email}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {isAdmin &&
                    member.userId !== teamCreatorId ? (
                      <Select
                        value={member.role}
                        onValueChange={(v) =>
                          handleRoleChange(
                            member._id,
                            v as Role
                          )
                        }
                      >
                        <SelectTrigger className="w-28 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">
                            Admin
                          </SelectItem>
                          <SelectItem value="editor">
                            Editor
                          </SelectItem>
                          <SelectItem value="viewer">
                            Viewer
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <RoleBadge role={member.role} />
                    )}
                  </TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">
                    {new Date(
                      member.joinedAt
                    ).toLocaleDateString()}
                  </TableCell>
                  {isAdmin && (
                    <TableCell>
                      {member.userId !== teamCreatorId && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() =>
                            handleRemoveMember(member._id)
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {isAdmin && pendingInvites && pendingInvites.length > 0 && (
        <div>
          <h3 className="text-sm font-medium mb-3">
            Pending Invites ({pendingInvites.length})
          </h3>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right">Invited</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingInvites.map((invite) => (
                  <TableRow key={invite._id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            {invite.email}
                          </p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Invited by {invite.invitedByName}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <RoleBadge role={invite.role} />
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {new Date(
                        invite.createdAt
                      ).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() =>
                          handleCancelInvite(invite._id)
                        }
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
