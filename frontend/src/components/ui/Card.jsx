import { COLORS } from '../../constants';

export function Card({ children, style = {}, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: COLORS.card,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 10,
        padding: 20,
        ...style
      }}
    >
      {children}
    </div>
  );
}
