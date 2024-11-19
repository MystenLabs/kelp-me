import React from "react";

const ribbonStyle: React.CSSProperties = {
  top: 0,
  left: 0,
  right: 0,
  zIndex: 999,
  backgroundColor: "#fdd835",
  color: "black",
  textAlign: "center" as React.CSSProperties["textAlign"],
  padding: "8px 0",
  fontSize: "14px",
  fontWeight: "bold",
  boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
};

const Ribbon: React.FC = () => {
  return (
    <div style={ribbonStyle} className="rounded-2xl">
      We are constantly adding new features and improvements. Stay tuned!
    </div>
  );
};

export default Ribbon;
