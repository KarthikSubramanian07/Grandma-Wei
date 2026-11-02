import { useEffect, useRef, useState } from "react";
import { setPending } from "../lib/pending";
import type { Visit } from "../lib/history";
import { navigate } from "../lib/router";
import { Camera } from "./Camera";

const touch = typeof matchMedia !== "undefined" && matchMedia("(pointer: coarse)").matches;
const canStream = typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia);

interface Props {
  prev?: Visit;
  primary?: string;
  /** Stack the buttons full width (used beside a reading). */
  compact?: boolean;
  tone?: "paper" | "ink";
}

/**
 * The one button that matters.
 * Phones: open the in-app camera (or the system camera if the browser can't
 * stream), with "choose from your photos" right underneath.
 * Computers: choose a file (or drop one on the page), with the webcam as an option.
 */
export function PhotoPicker({ prev, primary, compact = false, tone = "paper" }: Props) {
  const system = useRef<HTMLInputElement>(null);
  const library = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [ghost, setGhost] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !prev?.photo) return;
    const url = URL.createObjectURL(prev.photo);
    setGhost(url);
    return () => URL.revokeObjectURL(url);
  }, [open, prev]);

  const go = (file: File) => {
    setPending({ file, prev });
    navigate("/read");
  };
  const pick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) go(file);
  };
  const takePhoto = () => (canStream ? setOpen(true) : system.current?.click());

  const label = primary ?? (touch ? "Take a photo" : "Choose a photo");
  return (
    <div className={`picker ${compact ? "compact" : ""}`}>
      <button className={`btn btn-${tone}`} onClick={() => (touch ? takePhoto() : library.current?.click())}>
        <span className="dot" aria-hidden="true" />
        {label}
      </button>
      {touch ? (
        <button className={compact ? "link-btn" : "btn btn-ghost"} onClick={() => library.current?.click()}>
          Choose from your photos
        </button>
      ) : (
        canStream && (
          <button className="link-btn picker-webcam" onClick={() => setOpen(true)}>
            or use your camera
          </button>
        )
      )}
      <input ref={system} type="file" accept="image/*" capture="environment" hidden onChange={pick} />
      <input ref={library} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,image/*" hidden onChange={pick} />
      {open && (
        <Camera
          ghost={ghost}
          onCapture={(f) => {
            setOpen(false);
            go(f);
          }}
          onLibrary={() => {
            setOpen(false);
            library.current?.click();
          }}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}
