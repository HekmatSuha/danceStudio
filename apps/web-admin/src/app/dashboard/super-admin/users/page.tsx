"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "../../../../lib/supabase";
import { Shield, Search, Pencil, Trash2 } from "lucide-react";
import { type AccountProfile } from "../../../../lib/auth";
import { deleteUserAction, updateUserProfileAction } from "../../../actions/manage-user";

export default function SuperAdminUsersPage() {
  const [users, setUsers] = useState<AccountProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editingUser, setEditingUser] = useState<AccountProfile | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Error fetching users:", error);
      } else {
        setUsers(data as AccountProfile[]);
      }
      setLoading(false);
    };

    fetchUsers();
  }, []);

  const filteredUsers = users.filter(u => 
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.first_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.last_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.role?.toLowerCase().includes(search.toLowerCase())
  );

  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingUser) return;
    setSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const result = await updateUserProfileAction(formData);
    if (!result.success) {
      alert(result.message || "Failed to update user.");
      setSubmitting(false);
      return;
    }

    const updated = {
      ...editingUser,
      first_name: formData.get("firstName") as string,
      last_name: formData.get("lastName") as string,
      role: formData.get("role") as AccountProfile["role"],
    };

    setUsers((prev) => prev.map((u: any) => ((u as any).id === (editingUser as any).id ? updated : u)));
    setEditingUser(null);
    setSubmitting(false);
  };

  const handleDelete = async (user: AccountProfile) => {
    const id = (user as any).id as string;
    if (!id) return;
    if (!confirm(`Delete ${user.first_name} ${user.last_name}? This cannot be undone.`)) return;
    setSubmitting(true);
    const result = await deleteUserAction(id);
    if (!result.success) {
      alert(result.message || "Failed to delete user.");
      setSubmitting(false);
      return;
    }
    setUsers((prev) => prev.filter((u: any) => (u as any).id !== id));
    setSubmitting(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">System Users</h1>
          <p className="text-slate-600 mt-1">View and search all registered users across the platform.</p>
        </div>
      </div>

      <div className="mb-6 relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
        <input 
          type="text" 
          placeholder="Search users by name, email, or role..." 
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {editingUser && (
        <div className="mb-6 max-w-3xl bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="text-lg font-bold mb-4">Edit User</h3>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <input type="hidden" name="userId" value={(editingUser as any).id} />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                <input name="firstName" defaultValue={editingUser.first_name} required className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                <input name="lastName" defaultValue={editingUser.last_name} required className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
              <select name="role" defaultValue={editingUser.role || "student"} required className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                <option value="student">student</option>
                <option value="instructor">instructor</option>
                <option value="owner">owner</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setEditingUser(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
              <button type="submit" disabled={submitting} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-70 disabled:cursor-not-allowed">Save Changes</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading users...</div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-semibold text-slate-500">
                <tr>
                  <th className="px-6 py-4">User</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Joined</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                      No users found.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={(user as any).id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-bold">
                            {user.first_name?.[0]}{user.last_name?.[0]}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900">
                              {user.first_name} {user.last_name}
                            </div>
                            <div className="text-xs text-slate-400 font-mono">
                              {user.username}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium capitalize
                          ${user.role === 'super_admin' ? 'bg-purple-100 text-purple-700' : 
                            user.role === 'owner' ? 'bg-blue-100 text-blue-700' :
                            user.role === 'instructor' ? 'bg-amber-100 text-amber-700' :
                            'bg-emerald-100 text-emerald-700'
                          }`}>
                          {user.role === 'super_admin' && <Shield size={12} />}
                          {user.role || 'User'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {user.email}
                      </td>
                      <td className="px-6 py-4">
                        {(user as any).created_at ? new Date((user as any).created_at).toLocaleDateString() : "-"}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingUser(user)}
                            disabled={user.role === 'super_admin' || submitting}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title={user.role === 'super_admin' ? "Super admins cannot be edited" : "Edit user"}
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(user)}
                            disabled={user.role === 'super_admin' || submitting}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title={user.role === 'super_admin' ? "Super admins cannot be deleted" : "Delete user"}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
