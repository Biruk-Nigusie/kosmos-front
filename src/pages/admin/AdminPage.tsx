import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getAdminUsers, getAuditLogs } from "@/api/admin";
import { Users, ScrollText, ShieldCheck, CheckCircle, XCircle, User } from "lucide-react";

type Tab = "users" | "audit";

const ACTION_COLORS: Record<string, string> = {
  create: "bg-green-100 text-green-700",
  update: "bg-blue-100 text-blue-700",
  delete: "bg-red-100 text-red-700",
  share:  "bg-purple-100 text-purple-700",
};

export const AdminPage = () => {
  const [tab, setTab] = useState<Tab>("users");

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: getAdminUsers,
    enabled: tab === "users",
  });

  const { data: logs = [], isLoading: logsLoading } = useQuery({
    queryKey: ["audit-logs"],
    queryFn: getAuditLogs,
    enabled: tab === "audit",
  });

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-base-100">
      <div className="px-6 py-4 border-b border-base-300 flex items-center gap-2">
        <ShieldCheck size={16} className="text-[#4C72AA]" />
        <h1 className="text-sm font-semibold text-base-content">Admin Panel</h1>
      </div>

      <div className="flex gap-1 px-6 pt-3 border-b border-base-300">
        {(["users", "audit"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border-b-2 transition-colors capitalize ${
              tab === t
                ? "border-[#4C72AA] text-[#4C72AA]"
                : "border-transparent text-base-content/50 hover:text-base-content"
            }`}
          >
            {t === "users" ? <Users size={12} /> : <ScrollText size={12} />}
            {t === "users" ? "Users" : "Audit Logs"}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto px-6 py-4">
        {tab === "users" && (
          usersLoading ? (
            <div className="flex justify-center pt-16"><span className="loading loading-spinner loading-md" /></div>
          ) : (
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="text-left text-base-content/40 uppercase tracking-widest text-[10px]">
                  <th className="pb-2 pr-4 font-medium">User</th>
                  <th className="pb-2 pr-4 font-medium">Email</th>
                  <th className="pb-2 pr-4 font-medium">Role</th>
                  <th className="pb-2 pr-4 font-medium">Verified</th>
                  <th className="pb-2 font-medium">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-base-200">
                {users.map((u: any) => (
                  <tr key={u.id} className="hover:bg-base-200/50 transition-colors">
                    <td className="py-2 pr-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-[#4C72AA]/15 flex items-center justify-center shrink-0 overflow-hidden">
                          {u.avatar_url
                            ? <img src={u.avatar_url} className="w-full h-full object-cover" alt="" />
                            : <User size={12} className="text-[#4C72AA]" />}
                        </div>
                        <span className="text-base-content font-medium truncate max-w-[120px]">
                          {u.display_name || "—"}
                        </span>
                      </div>
                    </td>
                    <td className="py-2 pr-4 text-base-content/70 font-mono">{u.email}</td>
                    <td className="py-2 pr-4">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${
                        u.role === "admin"
                          ? "bg-[#4C72AA]/15 text-[#4C72AA]"
                          : "bg-base-300 text-base-content/50"
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="py-2 pr-4">
                      {u.is_verified
                        ? <CheckCircle size={13} className="text-green-500" />
                        : <XCircle size={13} className="text-base-content/30" />}
                    </td>
                    <td className="py-2 text-base-content/40">
                      {new Date(u.created_at).toLocaleDateString([], {
                        month: "short", day: "numeric", year: "numeric",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}

        {tab === "audit" && (
          logsLoading ? (
            <div className="flex justify-center pt-16"><span className="loading loading-spinner loading-md" /></div>
          ) : (
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="text-left text-base-content/40 uppercase tracking-widest text-[10px]">
                  <th className="pb-2 pr-4 font-medium">Action</th>
                  <th className="pb-2 pr-4 font-medium">Entity</th>
                  <th className="pb-2 pr-4 font-medium">Entity ID</th>
                  <th className="pb-2 pr-4 font-medium">User ID</th>
                  <th className="pb-2 font-medium">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-base-200">
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-base-content/30">No audit logs yet</td>
                  </tr>
                )}
                {logs.map((log: any) => (
                  <tr key={log.id} className="hover:bg-base-200/50 transition-colors">
                    <td className="py-2 pr-4">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${ACTION_COLORS[log.action] ?? "bg-base-300 text-base-content/50"}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="py-2 pr-4 text-base-content/70 capitalize">{log.entity_type}</td>
                    <td className="py-2 pr-4 font-mono text-base-content/40 text-[10px]">{log.entity_id?.slice(0, 8)}…</td>
                    <td className="py-2 pr-4 font-mono text-base-content/40 text-[10px]">{log.user_id?.slice(0, 8)}…</td>
                    <td className="py-2 text-base-content/40">
                      {log.created_at
                        ? new Date(log.created_at).toLocaleString([], {
                            month: "short", day: "numeric",
                            hour: "2-digit", minute: "2-digit",
                          })
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}
      </div>
    </div>
  );
};
