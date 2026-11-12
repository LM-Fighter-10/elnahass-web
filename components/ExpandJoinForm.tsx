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
  EXPAND_HEIGHT_MS,
  EXPAND_HEIGHT_PX,
  MAIL_RESULT_AT_MS,
  MAIL_UI_MS,
} from "@/lib/animations";
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
import { FORM_TOKEN_FIELD, HONEYPOT_FIELD } from "@/lib/spam-constants";
import { useFormToken } from "@/lib/useFormToken";
import HoneypotField from "@/components/HoneypotField";

type ExpandJoinFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type FormValues = {
  name: string;
  email: string;
  phone: string;
  desc: string;
};

const EMPTY: FormValues = { name: "", email: "", phone: "", desc: "" };

const LABEL_REST = "29.5px";
const LABEL_FLOAT = "-4px";
const INPUT_REST = "38px";
const INPUT_FOCUS = "46px";
const DESC_FOCUS = "150px";

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

/**
 * Home expand Join Us (`#joinBTN2` → `.expand-form` height 615px).
 * Form ids/classes use `*2` suffix; submit is `#joinBTN3`.
 */
export default function ExpandJoinForm({
  open,
  onOpenChange,
}: ExpandJoinFormProps) {
  const [values, setValues] = useState<FormValues>(EMPTY);
  const honeypotRef = useRef<HTMLInputElement>(null);
  const takeToken = useFormToken(open);
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

  const resetErrorMsgs = useCallback(() => {
    setErrors({});
    setValues(EMPTY);
    setFocused({});
  }, []);

  // Parent (scroll auto-close) may set open=false without going through toggle
  useEffect(() => {
    if (!open) {
      resetErrorMsgs();
      document.querySelector(".expand-form")?.classList.remove("h-auto");
    }
  }, [open, resetErrorMsgs]);

  const toggleExpand = useCallback(() => {
    if (open) {
      document.querySelector(".expand-form")?.classList.remove("h-auto");
    }
    onOpenChange(!open);
  }, [open, onOpenChange]);

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

  /** Floated labels sit on the dark photo — Django sets color white / black. */
  const labelColor = (field: FormField) =>
    focused[field] || values[field] ? "#fff" : "#000";

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
      formData.append(HONEYPOT_FIELD, honeypotRef.current?.value ?? "");
      formData.append(FORM_TOKEN_FIELD, await takeToken());

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

  const expandStyle: CSSProperties = {
    height: open ? EXPAND_HEIGHT_PX : 0,
    // Django home.css: height 0.3s ease-in-out (linear mid-motion, not expo snap)
    transition: `opacity 0.5s, transform 0.5s, height ${EXPAND_HEIGHT_MS}ms ease-in-out`,
  };

  return (
    <section id="join_sec" className="bg-white py-3">
      <div className="container">
        <div className="row row-edited">
          <div id="join-section" className="col-sm">
            <h2 id="joinUs-title" className="display-4">
              Get Your Work Done!
            </h2>
            <div className="row row-edited" id="joinUs-body">
              <p
                className="lead join-sentence"
                style={{ textAlign: "center", width: "100%" }}
              >
                Embark on a Journey of Excellence: Let Elnahass For Construction
                and Technology Build Your Dream Project
              </p>
            </div>
            <div className="row row-edited d-flex justify-content-center joinus-btn-div">
              <button
                type="button"
                id="joinBTN2"
                className={
                  open ? "joinus-btn joinus-btn-cancel" : "joinus-btn"
                }
                onClick={toggleExpand}
              >
                {open ? "Cancel" : "Join Us"}
              </button>
            </div>
          </div>
        </div>

        <div
          className={`container expand-form ${
            open ? "expand-form-active" : "expand-form-inactive"
          }`}
          style={expandStyle}
          onMouseDown={(e) => {
            // Match Django: add h-auto after interaction (does not affect open height tween)
            (e.currentTarget as HTMLElement).classList.add("h-auto");
          }}
        >
          <div className="row form-row2">
            <form
              autoComplete="off"
              id="contact-form2"
              method="POST"
              action="/send/"
              onSubmit={(e) => void handleSubmit(e)}
            >
              <div id="contact-bdy2">
                <div
                  className="loader"
                  id="loading2"
                  style={{
                    opacity: showLoading ? 1 : 0,
                    pointerEvents: showLoading ? "auto" : "none",
                  }}
                >
                  <div className="justify-content-center jimu-primary-loading" />
                </div>
                <div
                  className="loader"
                  id="done2"
                  style={{
                    display: showDone ? undefined : "none",
                    opacity: showDone ? 1 : 0,
                    pointerEvents: showDone ? "auto" : "none",
                  }}
                >
                  <div className="container loader-container">
                    <svg
                      id="checkmark2"
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
                      id="crossmark2"
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
                      className="mail-sent2"
                      style={{ display: mailSentText ? undefined : "none" }}
                    >
                      {mailSentText}
                    </div>
                  </div>
                </div>
                <h1 id="contact-title2">Join Us</h1>
                <div style={{ width: "auto" }}>
                  <div
                    className={`alert alert-${alertKind || "success"}`}
                    role="alert"
                    id="success_msg2"
                    style={{
                      opacity: alertOpaque ? 1 : 0,
                      height: alertOpaque ? "auto" : undefined,
                    }}
                  >
                    {alertMsg}
                  </div>
                </div>
                <div
                  id="form_content2"
                  style={{
                    opacity: contentHidden ? 0 : 1,
                    position: contentHidden ? "relative" : undefined,
                    zIndex: contentHidden ? -1 : undefined,
                    /* Django: -52px overlaps reserved alert; 10px when #success_msg2 visible */
                    marginTop: alertOpaque ? 10 : -52,
                    transition: "margin-top 0.2s ease-in-out",
                  }}
                >
                  <div className="info">
                    <label
                      className="nameLable2"
                      style={{ top: labelTop("name"), color: labelColor("name") }}
                      onClick={() => {
                        setFocused((f) => ({ ...f, name: true }));
                        document
                          .querySelector<HTMLInputElement>(".name2")
                          ?.focus();
                      }}
                    >
                      Name
                    </label>
                    <input
                      className="name2"
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
                      onFocus={() =>
                        setFocused((f) => ({ ...f, name: true }))
                      }
                      onBlur={() => {
                        if (!values.name)
                          setFocused((f) => ({ ...f, name: false }));
                      }}
                      onChange={(e) => setField("name", e.target.value)}
                    />
                    <div
                      className="error-message name-error2"
                      style={{
                        display: errors.name ? "block" : "none",
                        marginBottom: errors.name ? 10 : 0,
                      }}
                    >
                      {errors.name}
                    </div>

                    <label
                      className="emailLable2"
                      style={{
                        top: labelTop("email"),
                        color: labelColor("email"),
                      }}
                      onClick={() => {
                        setFocused((f) => ({ ...f, email: true }));
                        document
                          .querySelector<HTMLInputElement>(".email2")
                          ?.focus();
                      }}
                    >
                      Email
                    </label>
                    <input
                      className="email2"
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
                      onFocus={() =>
                        setFocused((f) => ({ ...f, email: true }))
                      }
                      onBlur={() => {
                        if (!values.email)
                          setFocused((f) => ({ ...f, email: false }));
                      }}
                      onChange={(e) => setField("email", e.target.value)}
                    />
                    <div
                      className="error-message email-error2"
                      style={{
                        display: errors.email ? "block" : "none",
                        marginBottom: errors.email ? 10 : 0,
                      }}
                    >
                      {errors.email}
                    </div>

                    <label
                      className="phoneLable2"
                      style={{
                        top: labelTop("phone"),
                        color: labelColor("phone"),
                      }}
                      onClick={() => {
                        setFocused((f) => ({ ...f, phone: true }));
                        document
                          .querySelector<HTMLInputElement>(".phone2")
                          ?.focus();
                      }}
                    >
                      Phone Number
                    </label>
                    <input
                      className="phone2"
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
                      onFocus={() =>
                        setFocused((f) => ({ ...f, phone: true }))
                      }
                      onBlur={() => {
                        if (!values.phone)
                          setFocused((f) => ({ ...f, phone: false }));
                      }}
                      onChange={(e) => setField("phone", e.target.value)}
                    />
                    <div
                      className="error-message phone-error2"
                      style={{
                        display: errors.phone ? "block" : "none",
                        marginBottom: errors.phone ? 10 : 0,
                      }}
                    >
                      {errors.phone}
                    </div>
                  </div>

                  <label
                    className="descLable2"
                    style={{ top: labelTop("desc"), color: labelColor("desc") }}
                    onClick={() => {
                      setFocused((f) => ({ ...f, desc: true }));
                      document
                        .querySelector<HTMLTextAreaElement>(".desc2")
                        ?.focus();
                    }}
                  >
                    Outline Description (max 200 Words)
                  </label>
                  <div>
                    <textarea
                      className="desc2"
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
                      onFocus={() =>
                        setFocused((f) => ({ ...f, desc: true }))
                      }
                      onBlur={() => {
                        if (!values.desc)
                          setFocused((f) => ({ ...f, desc: false }));
                      }}
                      onChange={(e) => setField("desc", e.target.value)}
                    />
                    <div
                      className="error-message desc-error2"
                      style={{
                        display: errors.desc ? "block" : "none",
                        marginBottom: errors.desc ? 10 : 0,
                      }}
                    >
                      {errors.desc}
                    </div>
                  </div>
                </div>
                <HoneypotField ref={honeypotRef} />
                <div
                  className="d-flex justify-content-center joinus-btn-div2"
                  style={{
                    marginTop: 10,
                    marginBottom: 10,
                    opacity: contentHidden ? 0 : 1,
                  }}
                >
                  <button
                    type="button"
                    className="joinus-btn"
                    id="joinBTN3"
                    disabled={submitting}
                    onClick={() => void handleSubmit()}
                  >
                    Submit
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
