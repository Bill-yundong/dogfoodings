import React, { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div
            style={{
              padding: "40px",
              background: "#1e293b",
              minHeight: "100vh",
              color: "#f8fafc",
            }}
          >
            <h2 style={{ color: "#ef4444", marginBottom: "20px" }}>
              ⚠️ 应用运行错误
            </h2>
            <div
              style={{
                background: "#334155",
                padding: "20px",
                borderRadius: "8px",
                fontFamily: "monospace",
                fontSize: "14px",
                whiteSpace: "pre-wrap",
                wordBreak: "break-all",
              }}
            >
              {this.state.error?.message}
              {"\n\n"}
              {this.state.error?.stack}
            </div>
            <button
              onClick={() => window.location.reload()}
              style={{
                marginTop: "20px",
                padding: "12px 24px",
                background: "#0ea5e9",
                border: "none",
                borderRadius: "8px",
                color: "white",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "bold",
              }}
            >
              刷新页面
            </button>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
