import { useEffect, useMemo, useState } from "react";
import { Ban, Search, Trash2, Users } from "lucide-react";
import { deleteUser, listUsers, toggleUserBlock } from "../services/adminApi";
import { useStaffPermission } from "../hooks/useStaffAuth";

function normalizeError(error) {
  return error?.response?.data?.message || error?.message || "Request failed";
}

export function StaffUsersPage() {
  const { hasPermission } = useStaffPermission();
  const [searchTerm, setSearchTerm] = useState("");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadUsers() {
      setLoading(true);
      setError("");
      try {
        const response = await listUsers();
        if (active) {
          setUsers((response.data || []).filter((user) => user.role !== "admin"));
        }
      } catch (err) {
        if (active) setError(normalizeError(err));
      } finally {
        if (active) setLoading(false);
      }
    }

    loadUsers();

    return () => {
      active = false;
    };
  }, []);

  const filteredUsers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return users;

    return users.filter((user) =>
      [user.name, user.email, user.phone].filter(Boolean).some((value) => String(value).toLowerCase().includes(query))
    );
  }, [searchTerm, users]);

  async function handleBlock(user) {
    setBusyId(user._id);
    setError("");
    try {
      const response = await toggleUserBlock(user._id);
      setUsers((current) => current.map((item) => (item._id === user._id ? response.data : item)));
    } catch (err) {
      setError(normalizeError(err));
    } finally {
      setBusyId("");
    }
  }

  async function handleDelete(user) {
    if (!window.confirm(`Delete ${user.name}?`)) return;
    setBusyId(user._id);
    setError("");
    try {
      await deleteUser(user._id);
      setUsers((current) => current.filter((item) => item._id !== user._id));
    } catch (err) {
      setError(normalizeError(err));
    } finally {
      setBusyId("");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Users</h1>
          <p className="mt-1 text-slate-600">Live customer account management based on your user permissions.</p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
          <Users size={16} />
          {filteredUsers.length} visible
        </div>
      </div>

      <div className="relative flex-1">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search by name, email, or phone"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          className="w-full rounded-[1.25rem] border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm focus:border-amber-500 focus:outline-none"
        />
      </div>

      {error ? (
        <div className="rounded-[1.25rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="grid gap-3 p-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-16 animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
        ) : filteredUsers.length ? (
          <div className="divide-y divide-slate-200">
            {filteredUsers.map((user) => (
              <div key={user._id} className="grid gap-4 px-4 py-4 lg:grid-cols-[1.2fr_1fr_.8fr_.8fr] lg:items-center lg:px-5">
                <div>
                  <div className="font-semibold text-slate-950">{user.name}</div>
                  <div className="mt-1 text-xs text-slate-500">Joined {new Date(user.createdAt).toLocaleDateString()}</div>
                </div>
                <div className="text-sm text-slate-600">
                  <div>{user.email || "No email"}</div>
                  <div className="mt-1 text-xs text-slate-500">{user.phone || "No phone"}</div>
                </div>
                <div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${user.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                    {user.status}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {hasPermission("users.update") ? (
                    <button
                      type="button"
                      disabled={busyId === user._id}
                      onClick={() => handleBlock(user)}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                      <Ban size={14} />
                      {user.status === "disabled" ? "Unblock" : "Block"}
                    </button>
                  ) : null}
                  {hasPermission("users.delete") ? (
                    <button
                      type="button"
                      disabled={busyId === user._id}
                      onClick={() => handleDelete(user)}
                      className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                    >
                      <Trash2 size={14} />
                      Delete
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-4 py-12 text-center text-sm text-slate-500">No users found for your current filters.</div>
        )}
      </div>
    </div>
  );
}
