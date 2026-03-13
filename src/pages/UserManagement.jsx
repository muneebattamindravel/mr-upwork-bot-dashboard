import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Trash2, UserPlus, ShieldCheck, KeyRound, ToggleLeft, ToggleRight } from 'lucide-react';
import { listUsers, deleteUser, updateUserRole, toggleUserActive, updateUserPassword, registerUser } from '@/apis/auth';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const ROLE_COLORS = {
  superAdmin: 'bg-purple-100 text-purple-800',
  admin:      'bg-blue-100 text-blue-800',
  employee:   'bg-gray-100 text-gray-700',
};

const currentUser = () => {
  try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; }
};

// ── Create User Modal ──────────────────────────────────────────────────────────
const CreateUserModal = ({ onClose, onCreated }) => {
  const [form, setForm]       = useState({ username: '', name: '', password: '', role: 'employee' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.username || !form.password) return toast.error('Username and password required');
    if (form.password.length < 6)           return toast.error('Password must be at least 6 characters');
    setLoading(true);
    try {
      await registerUser(form);
      toast.success(`User "${form.username}" created`);
      onCreated();
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
        <h3 className="text-lg font-bold mb-4 text-purple-800">Create New User</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Username *</label>
            <input className="input-field w-full" placeholder="e.g. john_doe"
              value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Full Name</label>
            <input className="input-field w-full" placeholder="e.g. John Doe"
              value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Password *</label>
            <input className="input-field w-full" type="password" placeholder="Min 6 characters"
              value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Role</label>
            <select className="input-field w-full" value={form.role}
              onChange={e => setForm({ ...form, role: e.target.value })}>
              <option value="employee">Employee</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-outline">Cancel</button>
            <button type="submit" disabled={loading}
              className="btn-primary flex items-center gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Change Password Modal ──────────────────────────────────────────────────────
const ChangePasswordModal = ({ user, onClose, onDone }) => {
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 6) return toast.error('Password must be at least 6 characters');
    setLoading(true);
    try {
      await updateUserPassword(user._id, password);
      toast.success(`Password updated for "${user.username}"`);
      onDone();
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm">
        <h3 className="text-lg font-bold mb-4">Change Password — {user.username}</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input className="input-field w-full" type="password" placeholder="New password (min 6 chars)"
            value={password} onChange={e => setPassword(e.target.value)} />
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-outline">Cancel</button>
            <button type="submit" disabled={loading}
              className="btn-primary flex items-center gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
              Update
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Main Page ──────────────────────────────────────────────────────────────────
const UserManagement = () => {
  const [users, setUsers]               = useState([]);
  const [loading, setLoading]           = useState(true);
  const [showCreate, setShowCreate]     = useState(false);
  const [pwModal, setPwModal]           = useState(null); // user object
  const me = currentUser();

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await listUsers();
      setUsers(res.data.data || []);
    } catch (err) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleDelete = async (user) => {
    if (!window.confirm(`Delete user "${user.username}"? This cannot be undone.`)) return;
    try {
      await deleteUser(user._id);
      toast.success(`User "${user.username}" deleted`);
      fetchUsers();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to delete');
    }
  };

  const handleRoleChange = async (user, newRole) => {
    try {
      await updateUserRole(user._id, newRole);
      toast.success(`Role updated to "${newRole}"`);
      fetchUsers();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update role');
    }
  };

  const handleToggleActive = async (user) => {
    try {
      await toggleUserActive(user._id);
      toast.success(`User ${user.isActive ? 'disabled' : 'enabled'}`);
      fetchUsers();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to toggle status');
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="page-title">👥 User Management</h2>
          <p className="text-sm text-gray-500">Manage team access to the dashboard</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="btn-primary flex items-center gap-2"
        >
          <UserPlus className="w-4 h-4" />
          New User
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
        </div>
      ) : (
        <div className="grid gap-3">
          {users.map((user) => {
            const isSelf   = user._id === me.id || user.username === me.username;
            const isSuperAdmin = user.role === 'superAdmin';

            return (
              <Card key={user._id} className={cn('p-4 flex flex-col sm:flex-row sm:items-center gap-3',
                !user.isActive && 'opacity-60')}>
                {/* Avatar */}
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold text-lg uppercase">
                  {(user.name || user.username || '?')[0]}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-800">{user.name || user.username}</span>
                    {isSelf && <span className="text-xs text-purple-500 font-medium">(you)</span>}
                    <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', ROLE_COLORS[user.role] || ROLE_COLORS.employee)}>
                      {user.role}
                    </span>
                    {!user.isActive && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">disabled</span>
                    )}
                  </div>
                  <div className="text-sm text-gray-500 mt-0.5">@{user.username}</div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    Created {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}
                    {user.lastLogin && ` · Last login ${new Date(user.lastLogin).toLocaleDateString()}`}
                  </div>
                </div>

                {/* Actions — only editable if not self and not superAdmin */}
                {!isSelf && !isSuperAdmin && (
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Role select */}
                    <select
                      value={user.role}
                      onChange={e => handleRoleChange(user, e.target.value)}
                      className="text-sm border rounded px-2 py-1 bg-white"
                    >
                      <option value="employee">Employee</option>
                      <option value="admin">Admin</option>
                    </select>

                    {/* Toggle active */}
                    <button
                      onClick={() => handleToggleActive(user)}
                      className="p-1.5 rounded hover:bg-gray-100"
                      title={user.isActive ? 'Disable account' : 'Enable account'}
                    >
                      {user.isActive
                        ? <ToggleRight className="w-5 h-5 text-green-600" />
                        : <ToggleLeft  className="w-5 h-5 text-gray-400" />}
                    </button>

                    {/* Change password */}
                    <button
                      onClick={() => setPwModal(user)}
                      className="p-1.5 rounded hover:bg-gray-100"
                      title="Change password"
                    >
                      <KeyRound className="w-4 h-4 text-blue-600" />
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => handleDelete(user)}
                      className="p-1.5 rounded hover:bg-red-50"
                      title="Delete user"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                )}

                {isSuperAdmin && !isSelf && (
                  <div className="flex items-center gap-1 text-xs text-purple-600 font-medium">
                    <ShieldCheck className="w-4 h-4" />
                    Protected
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {showCreate && (
        <CreateUserModal
          onClose={() => setShowCreate(false)}
          onCreated={fetchUsers}
        />
      )}

      {pwModal && (
        <ChangePasswordModal
          user={pwModal}
          onClose={() => setPwModal(null)}
          onDone={fetchUsers}
        />
      )}
    </div>
  );
};

export default UserManagement;
