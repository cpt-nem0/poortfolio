import * as THREE from "three";
import { useAudioStore } from "@/threeam/state/audio";
import { playNeedleDrop, startCrackle } from "./sfx";

const AMBIENT_URL = "/3am/audio/ambient.mp3";
const AMBIENT_VOL = 0.35;
const AMBIENT_DUCKED = 0.07;
const PREVIEW_VOL = 0.9;

/**
 * Singleton audio engine. Positional nodes live at the turntable; the
 * listener rides the camera (wired by AudioRig). All user-facing state
 * goes through useAudioStore; this module owns the WebAudio graph.
 */
class Engine {
  private listener: THREE.AudioListener | null = null;
  private ambient: THREE.PositionalAudio | null = null;
  private preview: THREE.PositionalAudio | null = null;
  /** Crackle runs for the whole unlocked session by design (until detach). */
  private stopCrackle: (() => void) | null = null;
  private wantUnlock = false;
  private ambientStarted = false;
  private previewToken = 0;

  attach(listener: THREE.AudioListener, mount: THREE.Object3D) {
    this.listener = listener;
    this.ambient = this.makePositional(mount);
    this.preview = this.makePositional(mount);
    this.ambientStarted = false;
    listener.setMasterVolume(useAudioStore.getState().muted ? 0 : 1);
    if (this.wantUnlock) this.unlock();
  }

  /** Tears down the WebAudio graph on scene unmount; attach() can rebuild. */
  detach() {
    if (this.preview?.isPlaying) this.preview.stop(); // stop() nulls onended
    if (this.ambient?.isPlaying) this.ambient.stop();
    this.stopCrackle?.();
    this.stopCrackle = null;
    this.preview?.parent?.remove(this.preview);
    this.ambient?.parent?.remove(this.ambient);
    this.ambient = null;
    this.preview = null;
    this.listener = null;
    this.ambientStarted = false;
    this.previewToken++; // kills in-flight preview fetches
    useAudioStore.getState().setNowPlaying(null);
  }

  private makePositional(mount: THREE.Object3D) {
    const node = new THREE.PositionalAudio(this.listener!);
    node.setRefDistance(3);
    node.setRolloffFactor(1.6);
    node.setDistanceModel("exponential");
    mount.add(node);
    return node;
  }

  /** Must be called from a user-gesture handler. Safe to call repeatedly. */
  unlock() {
    this.wantUnlock = true;
    if (!this.listener || !this.ambient) return; // attach() will re-run us
    const ctx = this.listener.context;
    if (ctx.state === "suspended") void ctx.resume();
    useAudioStore.getState().setUnlocked(true); // idempotent
    this.startAmbient();
  }

  /** Fetch/decode/loop the ambient track once per attach. */
  private startAmbient() {
    if (this.ambientStarted || !this.ambient || !this.listener) return;
    this.ambientStarted = true;
    const ctx = this.listener.context;
    const node = this.ambient; // capture: bail if detach/attach raced us

    void fetch(AMBIENT_URL)
      .then((r) => r.arrayBuffer())
      .then((buf) => ctx.decodeAudioData(buf))
      .then((audio) => {
        if (this.ambient !== node) return; // stale attach
        this.ambient.setBuffer(audio);
        this.ambient.setLoop(true);
        this.ambient.setVolume(AMBIENT_VOL);
        this.ambient.play();
        this.stopCrackle = startCrackle(ctx, this.listener!.getInput());
        useAudioStore.getState().setNowPlaying({
          kind: "ambient", artist: "late night mix", title: "side a",
        });
      })
      .catch(() => useAudioStore.getState().setError("the record player is being weird"));
  }

  async playPreview(
    meta: { artist: string; title: string; albumKey: string; storeUrl?: string },
    proxyUrl: string
  ) {
    if (!this.preview || !this.ambient || !this.listener) return;
    const token = ++this.previewToken;
    const ctx = this.listener.context;
    try {
      const buf = await fetch(proxyUrl).then((r) => {
        if (!r.ok) throw new Error(`stream ${r.status}`);
        return r.arrayBuffer();
      });
      const audio = await ctx.decodeAudioData(buf);
      if (token !== this.previewToken) return; // a newer click won
      if (this.preview.isPlaying) this.preview.stop();
      this.ambient.setVolume(AMBIENT_DUCKED);
      playNeedleDrop(ctx, this.listener.getInput());
      this.preview.setBuffer(audio);
      this.preview.setLoop(false);
      this.preview.setVolume(PREVIEW_VOL);
      // `play()` binds the current `onEnded` onto the underlying source's
      // `onended` handler at call time — the override must be assigned
      // *before* `play()` runs, or the bind captures the base-class no-op
      // instead (three@0.185 made `onEnded` a real prototype method).
      this.preview.onEnded = () => {
        if (token !== this.previewToken) return;
        // `isPlaying` is typed readonly for callers, but overriding
        // `onEnded` makes us responsible for the bookkeeping the base
        // implementation would otherwise do.
        (this.preview as unknown as { isPlaying: boolean }).isPlaying = false;
        this.ambient!.setVolume(AMBIENT_VOL);
        useAudioStore.getState().setNowPlaying({
          kind: "ambient", artist: "late night mix", title: "side a",
        });
      };
      this.preview.play();
      useAudioStore.getState().setNowPlaying({ kind: "preview", ...meta });
      useAudioStore.getState().setError(null);
    } catch {
      if (token === this.previewToken) {
        useAudioStore.getState().setError("record skipped… try again");
      }
    }
  }

  /** Tonearm lift/drop: hard-mutes everything via the listener master gain. */
  toggleMute() {
    if (!this.listener) return;
    const muted = !useAudioStore.getState().muted;
    this.listener.setMasterVolume(muted ? 0 : 1);
    useAudioStore.getState().setMuted(muted);
  }
}

export const audioEngine = new Engine();
