import type { CSSProperties, Ref } from "react";
import { HONEYPOT_FIELD } from "@/lib/spam-constants";

const HIDDEN: CSSProperties = {
  position: "absolute",
  left: "-10000px",
  top: "auto",
  width: 1,
  height: 1,
  overflow: "hidden",
  opacity: 0,
  pointerEvents: "none",
};

/**
 * Off-screen trap input. Real visitors never see or tab into it; form-filling
 * bots do, and the server silently drops those submissions.
 */
export default function HoneypotField({ ref }: { ref: Ref<HTMLInputElement> }) {
  return (
    <div aria-hidden="true" style={HIDDEN}>
      <label>
        Leave this field empty
        <input
          ref={ref}
          type="text"
          name={HONEYPOT_FIELD}
          tabIndex={-1}
          autoComplete="off"
          defaultValue=""
        />
      </label>
    </div>
  );
}
