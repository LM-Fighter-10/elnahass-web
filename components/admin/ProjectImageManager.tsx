"use client";

import {
  DragEvent,
  FormEvent,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

export type ProjectImageRow = {
  _id: string;
  url: string;
  thumbnail: boolean;
};

type UploadItem = {
  id: string;
  name: string;
  previewUrl: string;
  progress: number;
  error?: string;
};

type Props = {
  projectId: number;
  images: ProjectImageRow[];
  onChange: (images: ProjectImageRow[]) => void;
  onMessage?: (msg: string) => void;
  onError?: (msg: string) => void;
};

export default function ProjectImageManager({
  projectId,
  images,
  onChange,
  onMessage,
  onError,
}: Props) {
  const inputId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [asThumb, setAsThumb] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const didDragRef = useRef(false);
  const previewsRef = useRef<string[]>([]);

  useEffect(() => {
    return () => {
      for (const url of previewsRef.current) URL.revokeObjectURL(url);
      previewsRef.current = [];
    };
  }, []);

  const api = `/api/admin/projects/${projectId}/images`;

  const reload = useCallback(async () => {
    const res = await fetch(`/api/admin/projects/${projectId}`);
    if (!res.ok) throw new Error("Failed to refresh images");
    const data = await res.json();
    onChange(data.images ?? []);
  }, [onChange, projectId]);

  async function uploadFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList).filter((f) => f.type.startsWith("image/"));
    if (files.length === 0) {
      onError?.("Choose one or more image files");
      return;
    }

    setBusy(true);
    onError?.("");
    let uploaded = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const previewUrl = URL.createObjectURL(file);
      previewsRef.current.push(previewUrl);
      const uploadId = `${Date.now()}-${i}-${file.name}`;
      setUploads((prev) => [
        ...prev,
        { id: uploadId, name: file.name, previewUrl, progress: 8 },
      ]);

      try {
        const fd = new FormData();
        fd.set("file", file);
        if (asThumb && i === 0) fd.set("thumbnail", "true");

        setUploads((prev) =>
          prev.map((u) =>
            u.id === uploadId ? { ...u, progress: 45 } : u,
          ),
        );

        const res = await fetch(api, { method: "POST", body: fd });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Upload failed");
        }

        setUploads((prev) =>
          prev.map((u) =>
            u.id === uploadId ? { ...u, progress: 100 } : u,
          ),
        );
        uploaded += 1;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Upload failed";
        setUploads((prev) =>
          prev.map((u) =>
            u.id === uploadId ? { ...u, progress: 100, error: message } : u,
          ),
        );
        onError?.(message);
      }
    }

    try {
      await reload();
      if (uploaded > 0) {
        onMessage?.(
          uploaded === 1 ? "Image uploaded" : `${uploaded} images uploaded`,
        );
        setAsThumb(false);
      }
    } catch {
      onError?.("Upload finished but refresh failed");
    } finally {
      setBusy(false);
      window.setTimeout(() => {
        setUploads((prev) => {
          for (const u of prev) {
            if (u.previewUrl) URL.revokeObjectURL(u.previewUrl);
          }
          return [];
        });
      }, 600);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function onUploadSubmit(e: FormEvent) {
    e.preventDefault();
    const files = fileRef.current?.files;
    if (!files?.length) {
      onError?.("Choose a file");
      return;
    }
    void uploadFiles(files);
  }

  async function makeThumb(imageId: string) {
    const res = await fetch(api, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "setThumbnail", imageId }),
    });
    if (!res.ok) {
      onError?.("Failed to set cover");
      return;
    }
    onMessage?.("Cover updated");
    await reload();
  }

  async function removeImage(imageId: string) {
    if (!confirm("Remove this image from the project?")) return;
    const res = await fetch(api, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", imageId }),
    });
    if (!res.ok) {
      onError?.("Failed to remove image");
      return;
    }
    onMessage?.("Image removed");
    await reload();
  }

  async function persistOrder(next: ProjectImageRow[]) {
    onChange(next);
    const res = await fetch(api, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "reorder",
        imageIds: next.map((img) => img._id),
      }),
    });
    if (!res.ok) {
      onError?.("Reorder failed");
      await reload();
      return;
    }
  }

  async function move(index: number, dir: -1 | 1) {
    const j = index + dir;
    if (j < 0 || j >= images.length) return;
    const next = [...images];
    [next[index], next[j]] = [next[j], next[index]];
    await persistOrder(next);
  }

  function onTileDragStart(index: number) {
    didDragRef.current = true;
    setDragIndex(index);
  }

  function onTileDragOver(e: DragEvent, index: number) {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    setOverIndex(index);
  }

  async function onTileDrop(index: number) {
    if (dragIndex === null || dragIndex === index) {
      setDragIndex(null);
      setOverIndex(null);
      return;
    }
    const next = [...images];
    const [item] = next.splice(dragIndex, 1);
    next.splice(index, 0, item);
    setDragIndex(null);
    setOverIndex(null);
    await persistOrder(next);
  }

  function onDropzoneDragOver(e: DragEvent) {
    e.preventDefault();
    setDragging(true);
  }

  function onDropzoneDragLeave(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
  }

  function onDropzoneDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files?.length) {
      void uploadFiles(e.dataTransfer.files);
    }
  }

  return (
    <div className="admin-media">
      <form
        className="admin-media-upload"
        onSubmit={onUploadSubmit}
        data-testid="admin-upload-form"
      >
        <div
          className={`admin-dropzone${dragging ? " is-dragging" : ""}`}
          onDragOver={onDropzoneDragOver}
          onDragLeave={onDropzoneDragLeave}
          onDrop={onDropzoneDrop}
          onClick={() => fileRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              fileRef.current?.click();
            }
          }}
        >
          <div className="admin-dropzone-icon" aria-hidden>
            +
          </div>
          <div className="admin-dropzone-title">Drop images here</div>
          <p className="admin-muted admin-dropzone-hint">
            or click to browse — PNG, JPG, WebP. Multiple files supported.
          </p>
          <input
            id={inputId}
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="admin-file-input"
            onChange={(e) => {
              if (e.target.files?.length) void uploadFiles(e.target.files);
            }}
            data-testid="admin-image-file"
          />
        </div>

        <div className="admin-media-upload-bar">
          <label className="admin-check">
            <input
              type="checkbox"
              checked={asThumb}
              onChange={(e) => setAsThumb(e.target.checked)}
              data-testid="admin-image-as-thumb"
            />
            First upload as cover
          </label>
          <button
            type="submit"
            className="admin-btn"
            disabled={busy}
            data-testid="admin-image-upload"
          >
            {busy ? "Uploading…" : "Upload"}
          </button>
        </div>
      </form>

      {uploads.length > 0 ? (
        <div className="admin-media-grid admin-media-uploading">
          {uploads.map((u) => (
            <div key={u.id} className="admin-media-tile is-uploading">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={u.previewUrl} alt="" />
              <div className="admin-media-progress">
                <div
                  className="admin-media-progress-bar"
                  style={{ width: `${u.progress}%` }}
                />
              </div>
              <div className="admin-media-tile-meta">
                {u.error ? u.error : u.name}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <div className="admin-media-grid">
        {images.map((img, i) => (
          <div
            key={img._id}
            className={`admin-media-tile${img.thumbnail ? " is-cover" : ""}${
              overIndex === i ? " is-drop-target" : ""
            }${dragIndex === i ? " is-dragging-tile" : ""}`}
            draggable
            onDragStart={() => onTileDragStart(i)}
            onDragOver={(e) => onTileDragOver(e, i)}
            onDrop={() => void onTileDrop(i)}
            onDragEnd={() => {
              setDragIndex(null);
              setOverIndex(null);
              window.setTimeout(() => {
                didDragRef.current = false;
              }, 0);
            }}
            onClick={() => {
              if (didDragRef.current) return;
              if (!img.thumbnail) void makeThumb(img._id);
            }}
            title={img.thumbnail ? "Cover image" : "Click to set as cover"}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if ((e.key === "Enter" || e.key === " ") && !img.thumbnail) {
                e.preventDefault();
                void makeThumb(img._id);
              }
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.url} alt="" />
            {img.thumbnail ? (
              <span className="admin-media-badge">Cover</span>
            ) : null}
            <div
              className="admin-media-tile-actions"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                className="admin-icon-btn"
                title="Move earlier"
                disabled={i === 0}
                onClick={() => void move(i, -1)}
              >
                ↑
              </button>
              <button
                type="button"
                className="admin-icon-btn"
                title="Move later"
                disabled={i === images.length - 1}
                onClick={() => void move(i, 1)}
              >
                ↓
              </button>
              {!img.thumbnail ? (
                <button
                  type="button"
                  className="admin-icon-btn accent"
                  title="Set as cover"
                  onClick={() => void makeThumb(img._id)}
                  data-testid={`admin-set-thumb-${img._id}`}
                >
                  ★
                </button>
              ) : (
                <span className="admin-icon-btn accent" title="Cover image">
                  ★
                </span>
              )}
              <button
                type="button"
                className="admin-icon-btn danger"
                title="Remove"
                onClick={() => void removeImage(img._id)}
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>

      {images.length === 0 && uploads.length === 0 ? (
        <p className="admin-muted">No images yet — drop files above to start.</p>
      ) : null}
    </div>
  );
}
