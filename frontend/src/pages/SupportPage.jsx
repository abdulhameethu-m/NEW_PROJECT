import { useEffect, useState } from "react";
import {
  createUserSupportTicket,
  getUserSupportTickets,
  replyUserSupportTicket,
} from "../services/userService";

function normalizeError(err) {
  return err?.response?.data?.message || err?.message || "Failed to update support tickets.";
}

const defaultForm = {
  subject: "",
  category: "",
  priority: "medium",
  message: "",
};

export function SupportPage() {
  const [tickets, setTickets] = useState([]);
  const [form, setForm] = useState(defaultForm);
  const [replyDrafts, setReplyDrafts] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadTickets() {
    setLoading(true);
    try {
      const response = await getUserSupportTickets();
      setTickets(response.data || []);
      setError("");
    } catch (err) {
      setError(normalizeError(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTickets();
  }, []);

  async function submitTicket(event) {
    event.preventDefault();
    try {
      const response = await createUserSupportTicket(form);
      setTickets((current) => [response.data, ...current]);
      setForm(defaultForm);
      setShowForm(false);
      setError("");
    } catch (err) {
      setError(normalizeError(err));
    }
  }

  async function submitReply(ticketId) {
    const message = replyDrafts[ticketId];
    if (!message) return;

    try {
      const response = await replyUserSupportTicket(ticketId, { message });
      setTickets((current) => current.map((ticket) => (ticket._id === ticketId ? response.data : ticket)));
      setReplyDrafts((current) => ({ ...current, [ticketId]: "" }));
      setError("");
    } catch (err) {
      setError(normalizeError(err));
    }
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950 dark:text-white">Support center</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Raise tickets, follow support replies, and keep all customer help conversations in one place.</p>
        </div>
        <button type="button" onClick={() => setShowForm((current) => !current)} className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white dark:bg-white dark:text-slate-950">
          {showForm ? "Close form" : "Raise ticket"}
        </button>
      </div>

      {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

      {showForm ? (
        <form onSubmit={submitTicket} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Subject</span>
              <input value={form.subject} onChange={(event) => setForm((current) => ({ ...current, subject: event.target.value }))} className="rounded-2xl border border-slate-300 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Category</span>
              <input value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))} className="rounded-2xl border border-slate-300 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
            </label>
            <label className="grid gap-2 sm:col-span-2">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Priority</span>
              <select value={form.priority} onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value }))} className="rounded-2xl border border-slate-300 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </label>
            <label className="grid gap-2 sm:col-span-2">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Message</span>
              <textarea value={form.message} onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))} className="min-h-32 rounded-2xl border border-slate-300 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
            </label>
          </div>
          <button type="submit" className="mt-5 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white">Create ticket</button>
        </form>
      ) : null}

      {loading ? (
        <div className="h-56 animate-pulse rounded-3xl bg-slate-100 dark:bg-slate-800" />
      ) : tickets.length ? (
        <div className="grid gap-4">
          {tickets.map((ticket) => (
            <div key={ticket._id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-slate-950 dark:text-white">{ticket.subject}</div>
                  <div className="mt-1 text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    {ticket.category || "General"} | {ticket.priority} | {ticket.status}
                  </div>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">{new Date(ticket.updatedAt || ticket.createdAt).toLocaleString()}</div>
              </div>
              <div className="mt-4 grid gap-3">
                {(ticket.messages || []).map((message, index) => (
                  <div key={index} className={`rounded-2xl px-4 py-3 text-sm ${message.senderType === "USER" ? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200" : "bg-blue-50 text-blue-900 dark:bg-blue-950/20 dark:text-blue-200"}`}>
                    <div className="font-semibold">{message.senderType === "USER" ? "You" : "Support"}</div>
                    <div className="mt-1">{message.message}</div>
                    <div className="mt-2 text-xs opacity-70">{new Date(message.createdAt).toLocaleString()}</div>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex gap-2">
                <textarea
                  value={replyDrafts[ticket._id] || ""}
                  onChange={(event) => setReplyDrafts((current) => ({ ...current, [ticket._id]: event.target.value }))}
                  placeholder="Reply to support"
                  className="min-h-20 flex-1 rounded-2xl border border-slate-300 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
                <button type="button" onClick={() => submitReply(ticket._id)} className="self-end rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white dark:bg-white dark:text-slate-950">
                  Reply
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
          No support tickets yet.
        </div>
      )}
    </div>
  );
}
