import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface Props {
  /** Last photo of this room, shown as a ghost so a retake lines up. */
  ghost?: string | null;
  onCapture: (file: File) => void;
  onLibrary: () => void;
  onClose: () => void;
}

type State = { t: "starting" } | { t: "live" } | { t: "denied" } | { t: "unavailable" };

/**
 * The in-app camera. Full screen, back camera, one big shutter. On a retake,
 * the last photo floats over the viewfinder so you can stand in the same spot.
 * Nothing leaves the device here: the frame goes to the same prep as any photo.
 */
export function Camera({ ghost, onCapture, onLibrary, onClose }: Props) {
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const [state, setState] = useState<State>({ t: "starting" });
  const [facing, setFacing] = useState<"environment" | "user">("environment");
  const [showGhost, setShowGhost] = useState(Boolean(ghost));
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const start = async () => {
      stream.current?.getTracks().forEach((t) => t.stop());
      if (!navigator.mediaDevices?.getUserMedia) {
        setState({ t: "unavailable" });
        return;
      }
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facing }, width: { ideal: 1920 }, height: { ideal: 1440 } },
          audio: false,
        });
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        stream.current = s;
        if (video.current) {
          video.current.srcObject = s;
          await video.current.play().catch(() => {});
        }
        setState({ t: "live" });
      } catch (e) {
        const name = (e as Error).name;
        setState({ t: name === "NotAllowedError" || name === "SecurityError" ? "denied" : "unavailable" });
      }
    };
    start();
    return () => {
      cancelled = true;
    };
  }, [facing]);

  // Always release the camera when the sheet closes.
  useEffect(
    () => () => {
      stream.current?.getTracks().forEach((t) => t.stop());
    },
    [],
  );

  // Escape closes; the page behind doesn't scroll.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", key);
    };
  }, [onClose]);

  const shoot = async () => {
    const v = video.current;
    if (!v || !v.videoWidth) return;
    setFlash(true);
    navigator.vibrate?.(10);
    const c = document.createElement("canvas");
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    if (facing === "user") {
      ctx.translate(c.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(v, 0, 0);
    const blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/jpeg", 0.92));
    if (!blob) return;
    stream.current?.getTracks().forEach((t) => t.stop());
    onCapture(new File([blob], "room.jpg", { type: "image/jpeg" }));
  };

  const sheet = (
    <div className="camera" role="dialog" aria-modal="true" aria-label="Take a photo of your room">
      <video ref={video} playsInline muted autoPlay className={facing === "user" ? "mirror" : ""} />
      {ghost && showGhost && state.t === "live" && <img className="camera-ghost" src={ghost} alt="" />}
      {flash && <div className="camera-flash" onAnimationEnd={() => setFlash(false)} />}

      <div className="camera-top">
        <button className="camera-x" onClick={onClose} aria-label="Close the camera">
          ×
        </button>
        <p className="camera-tip">
          {ghost ? "Line up with last time. Same corner, same height." : "Stand in a corner. Get the bed and the door in if you can."}
        </p>
      </div>

      {state.t === "starting" && <p className="camera-msg">Finding her glasses…</p>}
      {(state.t === "denied" || state.t === "unavailable") && (
        <div className="camera-msg">
          <p>
            {state.t === "denied"
              ? "She needs the camera to see. Allow it in your browser settings, or pick a photo instead."
              : "This browser won't share its camera. Pick a photo instead."}
          </p>
          <button className="btn btn-paper" onClick={onLibrary}>
            Choose from your photos
          </button>
        </div>
      )}

      <div className="camera-bottom">
        <button className="camera-side" onClick={onLibrary}>
          Photos
        </button>
        <button className="camera-shutter" onClick={shoot} disabled={state.t !== "live"} aria-label="Take the photo">
          <span />
        </button>
        {ghost ? (
          <button className="camera-side" onClick={() => setShowGhost((g) => !g)} aria-pressed={showGhost}>
            {showGhost ? "Hide last" : "Show last"}
          </button>
        ) : (
          <button
            className="camera-side"
            onClick={() => setFacing((f) => (f === "environment" ? "user" : "environment"))}
            aria-label="Switch camera"
          >
            Flip
          </button>
        )}
      </div>
    </div>
  );
  return createPortal(sheet, document.body);
}
