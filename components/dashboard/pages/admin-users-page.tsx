"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { AdminUserForm } from "../forms/admin-user-form";

interface AdminUsersPageProps {
  token: string | null;
}

interface AdminUser {
  id: string;
  username: string;
  is_active: boolean;
}

const normalizeAdminUsers = (payload: unknown): AdminUser[] => {
  const container = payload as {
    results?: unknown;
    data?: unknown;
    items?: unknown;
  };

  const list = Array.isArray(payload)
    ? payload
    : container.results ?? container.data ?? container.items ?? [];

  if (!Array.isArray(list)) return [];

  return list.map((item: any) => ({
    id: String(item.id ?? item.pk ?? item.admin_user_id ?? ""),
    username: String(item.username ?? item.name ?? ""),
    is_active: Boolean(item.is_active ?? item.active ?? true),
  }));
};

export function AdminUsersPage({ token }: AdminUsersPageProps) {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editingAdmin, setEditingAdmin] = useState<AdminUser | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchAdmins();
  }, [token]);

  const fetchAdmins = async () => {
    if (!token) return;
    setLoading(true);

    console.log("Fetching admins with token:", token);

    try {
      const response = await fetch(
        process.env.NEXT_PUBLIC_BACKEND_URL + "/api/admin/admin-users/",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setAdmins(normalizeAdminUsers(data));
      }
    } catch (err) {
      console.log("[v0] Admins fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!token) return;

    try {
      const response = await fetch(
        process.env.NEXT_PUBLIC_BACKEND_URL + `/api/admin/admin-users/${id}/`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        setAdmins((prev) => prev.filter((a) => a.id !== id));
      }
    } catch (err) {
      console.log("[v0] Delete error:", err);
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingAdmin(null);
    fetchAdmins();
  };

  const filteredAdmins = admins.filter((a) =>
    a.username.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Admin Users</h1>
          <p className="text-muted-foreground mt-1">
            Manage administrator accounts
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingAdmin(null);
            setShowForm(true);
          }}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Admin
        </Button>
      </div>

      {showForm && (
        <AdminUserForm
          token={token}
          admin={editingAdmin}
          onClose={handleFormClose}
        />
      )}

      <Card>
        <div className="p-6 border-b border-border">
          <Input
            placeholder="Search by username..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-border">
              <tr>
                <th className="text-left p-6 font-semibold text-foreground">
                  Username
                </th>
                <th className="text-left p-6 font-semibold text-foreground">
                  Status
                </th>
                <th className="text-right p-6 font-semibold text-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={4}
                    className="p-6 text-center text-muted-foreground"
                  >
                    Loading...
                  </td>
                </tr>
              ) : filteredAdmins.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="p-6 text-center text-muted-foreground"
                  >
                    No admin users found
                  </td>
                </tr>
              ) : (
                filteredAdmins.map((admin) => (
                  <tr
                    key={admin.id}
                    className="border-b border-border hover:bg-muted/50 transition"
                  >
                    <td className="p-6 font-medium text-foreground">
                      {admin.username}
                    </td>
                    <td className="p-6">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          admin.is_active
                            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                        }`}
                      >
                        {admin.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="p-6">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingAdmin(admin);
                            setShowForm(true);
                          }}
                          className="text-primary"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(admin.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
