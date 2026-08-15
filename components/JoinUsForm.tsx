"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
} from "react";
import {
  JOIN_CLOSE_MS,
  JOIN_OPEN_MS,
  MAIL_RESULT_AT_MS,
  MAIL_UI_MS,
} from "@/lib/animations";
import { EASE_IN_OUT_SMOOTH } from "@/lib/motion";
import {
  MAIL_MESSAGES,
  isFormValid,
  validateDescription,
  validateEmail,
  validateName,
  validatePhone,
  type FieldErrors,
  type FormField,
} from "@/lib/validation";

type JoinUsFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type FormValues = {
  name: string;
  email: string;
  phone: string;
  desc: string;
};

type FormDims = {
  height: number;
  width: number;
  padding: number;
};

const EMPTY: FormValues = { name: "", email: "", phone: "", desc: "" };

const OPEN_DIMS: FormDims = { height: 493, width: 420, padding: 25 };
const CLOSED_DIMS: FormDims = { height: 0, width: 0, padding: 0 };

const LABEL_REST = "29.5px";
const LABEL_FLOAT = "-4px";
const INPUT_REST = "38px";
const INPUT_FOCUS = "46px";
const DESC_FOCUS = "150px";

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

/**
 * Navbar Join Us overlay (`#contact-form`).
 * Open/close mirrors Django `animateContactForm` in base.html:
 * open ~250ms → 420×493×25; close fades body then ~330ms shrink to 0.
 */
export default function JoinUsForm({ open, onOpenChange }: JoinUsFormProps) {
  const [values, setValues] = useState<FormValues>(EMPTY);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [focused, setFocused] = useState<Partial<Record<FormField, boolean>>>(
    {},
  );
  const [submitting, setSubmitting] = useState(false);
  const [showLoading, setShowLoading] = useState(false);
  const [showDone, setShowDone] = useState(false);
  const [showCheck, setShowDoneCheck] = useState(false);
  const [showCross, setShowCross] = useState(false);
  const [mailSentText, setMailSentText] = useState("");
  const [alertMsg, setAlertMsg] = useState("");
  const [alertKind, setAlertKind] = useState<"success" | "danger" | "">("");
  const [alertOpaque, setAlertOpaque] = useState(false);
  const [contentHidden, setContentHidden] = useState(false);

  const [dims, setDims] = useState<FormDims>(CLOSED_DIMS);
  const [formOpacity, setFormOpacity] = useState(0);
  const [zIndex, setZIndex] = useState(-1);
  const [bodyOpaque, setBodyOpaque] = useState(false);
  /** true while animating open (250ms) vs close (330ms). */
  const [sizeMs, setSizeMs] = useState(JOIN_OPEN_MS);

  const formRef = useRef<HTMLFormElement>(null);
  const timersRef = useRef<number[]>([]);
  const mountedRef = useRef(false);
  /** Tracks whether the panel has non-zero size (for outside-click / scroll). */
  const isExpandedRef = useRef(false);

  const clearTimers = useCallback(() => {
    for (const id of timersRef.current) window.clearTimeout(id);
    timersRef.current = [];
  }, []);

  const schedule = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    timersRef.current.push(id);
    return id;
  }, []);

  const resetErrors = useCallback(() => setErrors({}), []);

  const closeForm = useCallback(() => {
    setFocused({});
    resetErrors();
    onOpenChange(false);
  }, [onOpenChange, resetErrors]);

  // Drive open/close animation from `open` (Django animateContactForm).
  useEffect(() => {
    clearTimers();

    if (!mountedRef.current) {
      mountedRef.current = true;
      if (!open) return;
    }

    const form = formRef.current;

    if (open) {
      isExpandedRef.current = true;
      if (form) form.style.height = "";
      setSizeMs(JOIN_OPEN_MS);
      setFormOpacity(1);
      setZIndex(6);
      setBodyOpaque(false);
      setDims(OPEN_DIMS);
      schedule(() => {
        setBodyOpaque(true);
        schedule(() => {
          if (formRef.current) formRef.current.style.height = "auto";
        }, 50);
      }, JOIN_OPEN_MS);
      return clearTimers;
    }

    // Close: fade body, lock pixel size (height may be "auto"), then shrink.
    setBodyOpaque(false);
    setSizeMs(JOIN_CLOSE_MS);

    let h = OPEN_DIMS.height;
    let w = OPEN_DIMS.width;
    if (form) {
      h = form.offsetHeight || OPEN_DIMS.height;
      w = form.offsetWidth || OPEN_DIMS.width;
      form.style.height = `${h}px`;
      void form.offsetHeight;
    }
    setFormOpacity(1);
    setZIndex(6);
    setDims({ height: h, width: w, padding: OPEN_DIMS.padding });

    schedule(() => {
      if (formRef.current) formRef.current.style.height = "";
      setDims(CLOSED_DIMS);
      schedule(() => {
        setZIndex(-1);
        setFormOpacity(0);
        isExpandedRef.current = false;
        if (formRef.current) formRef.current.style.height = "";
      }, 310);
    }, 30);

    return clearTimers;
  }, [open, clearTimers, schedule]);

  // Outside click closes (ignore form, carousel dots, Join Us button)
  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (!open && !isExpandedRef.current) return;
      const t = e.target as Element | null;
      if (!t) return;
      if (t.closest("#contact-form, .carousel-indicators, #join-btn")) return;
      closeForm();
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open, closeForm]);

  // Escape closes (works with validation errors still showing)
  useEffect(() => {
    if (!open && !isExpandedRef.current) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeForm();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, closeForm]);

  // Scroll closes when form expanded
  useEffect(() => {
    const onScroll = () => {
      const form = formRef.current;
      if (!form || (!open && !isExpandedRef.current) || form.offsetHeight <= 400)
        return;
      const windowHeight = window.innerHeight;
      const scrollPosition = window.scrollY;
      const animateStart = windowHeight * 1.3;
      const elementOffset = form.getBoundingClientRect().top + scrollPosition;
      if (elementOffset < scrollPosition + windowHeight - animateStart) {
        closeForm();
      }
    };
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, [open, closeForm]);

  const setField = (field: FormField, value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      let err: string | null = null;
      if (field === "name") err = validateName(value);
      else if (field === "email") err = validateEmail(value);
      else if (field === "phone") err = validatePhone(value);
      else err = validateDescription(value);
      if (err) next[field] = err;
      else delete next[field];
      return next;
    });
  };

  const labelTop = (field: FormField) =>
    focused[field] || values[field] ? LABEL_FLOAT : LABEL_REST;

  const inputHeight = (field: FormField) => {
    if (field === "desc") {
      return focused.desc || values.desc ? DESC_FOCUS : INPUT_REST;
    }
    return focused[field] || values[field] ? INPUT_FOCUS : INPUT_REST;
  };

  const fieldBorder = (field: FormField) =>
    errors[field] ? "red" : undefined;

  const fieldMargin = (field: FormField) =>
    errors[field] ? "0" : "15px";

  const handleSubmit = async (e?: FormEvent) => {
    e?.preventDefault();
    if (submitting) return;

    const { ok, errors: allErrors } = isFormValid(values);
    setErrors(allErrors);
    if (!ok) return;

    setSubmitting(true);
    setContentHidden(true);
    setShowLoading(true);
    setShowDone(false);
    setShowDoneCheck(false);
    setShowCross(false);
    setAlertOpaque(false);

    const started = Date.now();
    const payload = { ...values };
    setValues(EMPTY);
    setFocused({});

    let failed = false;

    try {
      const qs = new URLSearchParams({
        name: payload.name,
        email: payload.email,
        phone: payload.phone,
        desc: payload.desc,
      });
      const formData = new FormData();
      formData.append("name", payload.name);
      formData.append("email", payload.email);
      formData.append("phone", payload.phone);
      formData.append("outline_desc", payload.desc);

      // Keep fetchCustomer for legacy/e2e network expectations; ignore duplicate flag.
      const [, sendRes] = await Promise.all([
        fetch(`/fetchCustomer?${qs.toString()}`),
        fetch("/send/", { method: "POST", body: formData }),
      ]);

      if (sendRes.status !== 200) {
        failed = true;
      }
    } catch {
      failed = true;
    }

    const elapsed = Date.now() - started;
    await sleep(Math.max(0, MAIL_RESULT_AT_MS - elapsed));

    setShowLoading(false);
    setShowDone(true);
    if (failed) {
      setAlertKind("danger");
      setMailSentText(MAIL_MESSAGES.mailFailed);
      setAlertMsg(MAIL_MESSAGES.failed);
      setShowCross(true);
      setShowDoneCheck(false);
    } else {
      setAlertKind("success");
      setMailSentText(MAIL_MESSAGES.mailSent);
      setAlertMsg(MAIL_MESSAGES.success);
      setShowDoneCheck(true);
      setShowCross(false);
    }

    await sleep(Math.max(0, MAIL_UI_MS - (Date.now() - started)));

    setContentHidden(false);
    setShowLoading(false);
    setShowDone(false);
    setShowDoneCheck(false);
    setShowCross(false);
    setMailSentText("");
    setAlertOpaque(true);
    setSubmitting(false);

    window.setTimeout(() => {
      setAlertOpaque(false);
      setAlertMsg("");
      setAlertKind("");
    }, 5000);
  };

  const interactive = open || dims.height > 10;

  const formStyle: CSSProperties = {
    overflow: "hidden",
    height: dims.height,
    width: dims.width,
    padding: dims.padding,
    opacity: formOpacity,
    zIndex,
    pointerEvents: interactive ? "auto" : "none",
    transition: [
      `height ${sizeMs}ms ease`,
      `width ${sizeMs}ms ease`,
      `padding ${sizeMs}ms ease`,
    ].join(", "),
  };

  // Django only toggles #contact-bdy opacity (not height) during close.
  const bodyStyle: CSSProperties = {
    opacity: bodyOpaque ? 1 : 0,
    height: "auto",
    transition: `opacity 0.1s ${EASE_IN_OUT_SMOOTH}`,
  };

  return (
    <form
      ref={formRef}
      autoComplete="off"
      id="contact-form"
      method="POST"
      action="/send/"
      style={formStyle}
      onSubmit={(e) => void handleSubmit(e)}
    >
      <div id="contact-bdy" style={bodyStyle}>
        <div
          className="loader"
          id="loading"
          style={{
            opacity: showLoading ? 1 : 0,
            pointerEvents: showLoading ? "auto" : "none",
          }}
        >
          <div className="justify-content-center jimu-primary-loading" />
        </div>
        <div
          className="loader"
          id="done"
          style={{
            display: showDone ? undefined : "none",
            opacity: showDone ? 1 : 0,
            pointerEvents: showDone ? "auto" : "none",
          }}
        >
          <div className="container loader-container">
            <svg
              id="checkmark1"
              className="checkmark justify-content-center"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 52 52"
              style={{ display: showCheck ? undefined : "none" }}
            >
              <circle
                className="checkmark__circle"
                cx="26"
                cy="26"
                r="25"
                fill="none"
              />
              <path
                className="checkmark__check"
                fill="none"
                d="M14.1 29.5l7.1 7.2L37.9 17.4"
              />
            </svg>
            <svg
              id="crossmark1"
              className="crossmark"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 52 52"
              style={{ display: showCross ? undefined : "none" }}
            >
              <circle
                className="crossmark_circle"
                cx="26"
                cy="26"
                r="25"
                fill="none"
              />
              <path
                className="crossmark_check"
                fill="none"
                d="M14.1 14.1l23.8 23.8 m0,-23.8 l-23.8,23.8"
              />
            </svg>
            <div
              className="mail-sent"
              style={{ display: mailSentText ? undefined : "none" }}
            >
              {mailSentText}
            </div>
          </div>
        </div>
        <h1 id="contact-title">Join Us</h1>
        <div style={{ width: "auto" }}>
          <div
            className={`alert alert-${alertKind || "success"}`}
            role="alert"
            id="success_msg"
            style={{
              opacity: alertOpaque ? 1 : 0,
              height: alertOpaque ? "auto" : undefined,
            }}
          >
            {alertMsg}
          </div>
        </div>
        <div
          id="form_content"
          style={{
            opacity: contentHidden ? 0 : 1,
            position: contentHidden ? "relative" : undefined,
            zIndex: contentHidden ? -1 : undefined,
            /* Django: -52px overlaps reserved alert; 10px when #success_msg visible */
            marginTop: alertOpaque ? 10 : -52,
            transition: "margin-top 0.2s ease-in-out",
          }}
        >
          <div className="info">
            <label
              className="nameLable"
              style={{ top: labelTop("name") }}
              onClick={() => {
                setFocused((f) => ({ ...f, name: true }));
                document
                  .querySelector<HTMLInputElement>("#contact-form .name")
                  ?.focus();
              }}
            >
              Name
            </label>
            <input
              className="name"
              type="text"
              name="name"
              autoComplete="nothing"
              value={values.name}
              disabled={submitting}
              style={{
                height: inputHeight("name"),
                borderColor: fieldBorder("name"),
                marginBottom: fieldMargin("name"),
              }}
              onFocus={() => setFocused((f) => ({ ...f, name: true }))}
              onBlur={() => {
                if (!values.name) setFocused((f) => ({ ...f, name: false }));
              }}
              onChange={(e) => setField("name", e.target.value)}
            />
            <div
              className="error-message name-error"
              style={{
                display: errors.name ? "block" : "none",
                marginBottom: errors.name ? 10 : 0,
              }}
            >
              {errors.name}
            </div>

            <label
              className="emailLable"
              style={{ top: labelTop("email") }}
              onClick={() => {
                setFocused((f) => ({ ...f, email: true }));
                document
                  .querySelector<HTMLInputElement>("#contact-form .email")
                  ?.focus();
              }}
            >
              Email
            </label>
            <input
              className="email"
              type="email"
              name="email"
              autoComplete="nothing"
              value={values.email}
              disabled={submitting}
              style={{
                height: inputHeight("email"),
                borderColor: fieldBorder("email"),
                marginBottom: fieldMargin("email"),
              }}
              onFocus={() => setFocused((f) => ({ ...f, email: true }))}
              onBlur={() => {
                if (!values.email) setFocused((f) => ({ ...f, email: false }));
              }}
              onChange={(e) => setField("email", e.target.value)}
            />
            <div
              className="error-message email-error"
              style={{
                display: errors.email ? "block" : "none",
                marginBottom: errors.email ? 10 : 0,
              }}
            >
              {errors.email}
            </div>

            <label
              className="phoneLable"
              style={{ top: labelTop("phone") }}
              onClick={() => {
                setFocused((f) => ({ ...f, phone: true }));
                document
                  .querySelector<HTMLInputElement>("#contact-form .phone")
                  ?.focus();
              }}
            >
              Phone Number
            </label>
            <input
              className="phone"
              type="text"
              name="phone"
              autoComplete="nothing"
              value={values.phone}
              disabled={submitting}
              style={{
                height: inputHeight("phone"),
                borderColor: fieldBorder("phone"),
                marginBottom: fieldMargin("phone"),
              }}
              onFocus={() => setFocused((f) => ({ ...f, phone: true }))}
              onBlur={() => {
                if (!values.phone) setFocused((f) => ({ ...f, phone: false }));
              }}
              onChange={(e) => setField("phone", e.target.value)}
            />
            <div
              className="error-message phone-error"
              style={{
                display: errors.phone ? "block" : "none",
                marginBottom: errors.phone ? 10 : 0,
              }}
            >
              {errors.phone}
            </div>
          </div>

          <label
            className="descLable"
            style={{ top: labelTop("desc") }}
            onClick={() => {
              setFocused((f) => ({ ...f, desc: true }));
              document
                .querySelector<HTMLTextAreaElement>("#contact-form .desc")
                ?.focus();
            }}
          >
            Outline Description (max 200 Words)
          </label>
          <div>
            <textarea
              className="desc"
              rows={4}
              name="outline_desc"
              autoComplete="nothing"
              value={values.desc}
              disabled={submitting}
              style={{
                height: inputHeight("desc"),
                borderColor: fieldBorder("desc"),
                marginBottom: fieldMargin("desc"),
              }}
              onFocus={() => setFocused((f) => ({ ...f, desc: true }))}
              onBlur={() => {
                if (!values.desc) setFocused((f) => ({ ...f, desc: false }));
              }}
              onChange={(e) => setField("desc", e.target.value)}
            />
            <div
              className="error-message desc-error"
              style={{
                display: errors.desc ? "block" : "none",
                marginBottom: errors.desc ? 10 : 0,
              }}
            >
              {errors.desc}
            </div>
          </div>
        </div>
        <div
          className="d-flex justify-content-center joinus-btn-div"
          style={{
            marginTop: 10,
            marginBottom: 10,
            opacity: contentHidden ? 0 : 1,
          }}
        >
          <button
            type="button"
            className="joinus-btn"
            id="joinBTN"
            disabled={submitting}
            onClick={() => void handleSubmit()}
          >
            Send
          </button>
        </div>
      </div>
    </form>
  );
}
