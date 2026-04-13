"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/presentation/providers/auth-provider";

export default function LoginPage() {
  const { signIn, register } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const action = isRegister ? register : signIn;
    const { error: authError } = await action(email, password);

    setLoading(false);
    if (authError) {
      setError(authError);
    } else {
      router.push("/");
    }
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        padding: "24px",
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          width: "100%",
          maxWidth: "360px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        <h1
          style={{
            fontSize: "24px",
            fontWeight: 700,
            color: "var(--color-accent)",
            textAlign: "center",
          }}
        >
          The Block 6
        </h1>
        <p
          style={{
            color: "var(--color-text-secondary)",
            textAlign: "center",
            fontSize: "14px",
          }}
        >
          {isRegister ? "建立帳號" : "登入"}
        </p>

        {error && (
          <div
            style={{
              background: "var(--color-bg-tertiary)",
              border: "1px solid var(--color-block-buffer)",
              borderRadius: "var(--radius-md)",
              padding: "10px 14px",
              color: "var(--color-block-buffer)",
              fontSize: "13px",
            }}
          >
            {error}
          </div>
        )}

        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          required
          style={{
            background: "var(--color-bg-tertiary)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
            color: "var(--color-text-primary)",
            padding: "10px 14px",
            fontSize: "14px",
          }}
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="密碼（至少 6 位）"
          required
          minLength={6}
          style={{
            background: "var(--color-bg-tertiary)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
            color: "var(--color-text-primary)",
            padding: "10px 14px",
            fontSize: "14px",
          }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{
            background: "var(--color-accent)",
            border: "none",
            borderRadius: "var(--radius-md)",
            color: "white",
            padding: "10px",
            fontSize: "14px",
            fontWeight: 600,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? "處理中..." : isRegister ? "註冊" : "登入"}
        </button>
        <button
          type="button"
          onClick={() => {
            setIsRegister(!isRegister);
            setError(null);
          }}
          style={{
            background: "none",
            border: "none",
            color: "var(--color-text-secondary)",
            cursor: "pointer",
            fontSize: "13px",
          }}
        >
          {isRegister ? "已有帳號？登入" : "還沒有帳號？註冊"}
        </button>
      </form>
    </div>
  );
}
