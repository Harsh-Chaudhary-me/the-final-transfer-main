import { useEffect, useState } from "react";
import { supabase } from "../supabase";

export default function Notifications({ user, onBack }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) { setLoading(false); return; }

    const { data, error } = await supabase
      .from("web_notifications")
      .select("*")
      .eq("user_email", user.email)
      .order("created_at", { ascending: false });

    if (!error) setItems(data || []);
    setLoading(false);
  };

  const markRead = async (id) => {
    await supabase.from("web_notifications").update({ read: true }).eq("id", id);
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Notifications</h1>

      {items.length === 0 ? (
        <div className="bg-gray-50 rounded-xl p-6 text-center text-gray-500">
          No notifications yet.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((n) => (
            <div
              key={n.id}
              className={`p-4 rounded-xl border ${
                n.read ? "bg-white border-gray-200" : "bg-blue-50 border-blue-200"
              }`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold">{n.title}</p>
                  <p className="text-sm text-gray-700 mt-1">{n.message}</p>
                  <p className="text-xs text-gray-500 mt-2">
                    {new Date(n.created_at).toLocaleString()}
                  </p>
                </div>
                {!n.read && (
                  <button
                    onClick={() => markRead(n.id)}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Mark read
                  </button>
                )}
              </div>
              {n.link && (
                <a
                  href={n.link}
                  className="inline-block mt-3 text-sm text-blue-600 hover:underline"
                >
                  Open →
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}