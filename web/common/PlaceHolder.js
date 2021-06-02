import React from "react";

export function PlaceHolder({ children, style }) {
  return (
    <div
      style={{
        flexGrow: 1,
        display: "flex",
        flexDirection: "column",
        ...style
      }}
    >
      <div style={{ flexGrow: 3 }} />
      <div style={{ flexShrink: 0 }}>{children}</div>
      <div style={{ flexGrow: 2 }} />
    </div>
  );
}
