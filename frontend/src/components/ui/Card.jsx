import { COLORS } from "../../constants";

export function Card({ children, style = {}, onClick, className = "" }) {
  return (
    <div
      onClick={onClick}
      className={`lg-surface ${className}`.trim()}
      style={{
        padding: 20,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
