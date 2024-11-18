import React from "react";

const ribbonStyle = {
  // position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  zIndex: 999,
  backgroundColor: "#fdd835",
  color: "black",
  // textAlign: 'center',
  textAlign: "center",
  padding: "8px 0",
  fontSize: "14px",
  fontWeight: "bold",
  boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
};

const Ribbon = () => {
  return (
    <div style={ribbonStyle} className="rounded-2xl">
      We are constantly adding new features and improvements. Stay tuned!
    </div>
  );
};

// In your CSS file:
/*
.ribbon {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 999;
  background-color: #fdd835;
  color: black;
  text-align: center;
  padding: 8px 0;
  font-size: 14px;
  font-weight: bold;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}
*/

export default Ribbon; // Or use it within a larger component as in the styled-components example
