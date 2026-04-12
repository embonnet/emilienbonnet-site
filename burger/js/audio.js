(function () {
  // Gestion centralisee de la musique de fond et des effets sonores.
  class SoundManager {
    constructor({
      bgmElement,
      successPath = "./audio/success.mp3",
      resetPath = "./audio/reset.mp3",
      emptyResetPath = null,
      ringPath = "./audio/ring.mp3",
      errorPath = "./audio/error.mp3"
    } = {}) {
      this.bgm = bgmElement || null;
      this.defaultBgmPath = this.bgm ? this.bgm.getAttribute("src") || this.bgm.src : "";
      this.currentBgmPath = this.defaultBgmPath;

      this.successAudio = new Audio(successPath);
      this.successAudio.preload = "auto";

      this.resetAudio = new Audio(resetPath);
      this.resetAudio.preload = "auto";

      this.emptyResetAudio = emptyResetPath ? new Audio(emptyResetPath) : null;
      if (this.emptyResetAudio) {
        this.emptyResetAudio.preload = "auto";
      }

      this.ringAudio = new Audio(ringPath);
      this.ringAudio.preload = "auto";

      this.errorAudio = new Audio(errorPath);
      this.errorAudio.preload = "auto";

      this.audioEnabled = false;
      this.userPausedAudio = false;
      this.audioContext = null;
      this.baseBgmVolume = 0.03;
      this.activeFadeToken = null;
    }

    init() {
      // Reglages initiaux pour eviter une musique trop forte au chargement.
      if (this.bgm) {
        this.bgm.volume = this.baseBgmVolume;
      }

      this.successAudio.volume = 0.5;
      this.resetAudio.volume = 0.45;
      if (this.emptyResetAudio) {
        this.emptyResetAudio.volume = 0.45;
      }
      this.ringAudio.volume = 0.45;
      this.errorAudio.volume = 0.5;
    }

    async tryAutoStartMusic() {
      // Tente de lancer la musique au premier geste utilisateur si le navigateur l'autorise.
      if (!this.bgm || this.audioEnabled || this.userPausedAudio) return;

      try {
        await this.bgm.play();
        this.audioEnabled = true;
      } catch {
        this.audioEnabled = false;
      }
    }

    async toggleMusic() {
      // Alterne lecture/pause tout en gardant une information d'etat exploitable par l'UI.
      if (!this.bgm) return { ok: false };

      if (this.bgm.paused) {
        try {
          await this.bgm.play();
          this.audioEnabled = true;
          this.userPausedAudio = false;
          return { ok: true, playing: true };
        } catch {
          return { ok: false, playing: false };
        }
      }

      this.bgm.pause();
      this.audioEnabled = false;
      this.userPausedAudio = true;
      return { ok: true, playing: false };
    }

    updateMusicButton(buttonEl) {
      // Synchronise le libelle du bouton avec l'etat reel de la musique.
      if (!buttonEl || !this.bgm) return;
      buttonEl.textContent = this.bgm.paused ? "Relancer la musique" : "Stopper la musique";
    }

    async setMusicTrack(trackPath, { forcePlay = false } = {}) {
      // Remplace la piste de fond tout en conservant autant que possible l'etat de lecture.
      if (!this.bgm || !trackPath) {
        return { ok: false, playing: false };
      }

      const shouldPlay = forcePlay || (!this.bgm.paused && !this.userPausedAudio);
      const currentPath = this.bgm.getAttribute("src") || this.bgm.currentSrc || "";

      if (currentPath === trackPath) {
        if (shouldPlay && this.bgm.paused) {
          try {
            await this.bgm.play();
            this.audioEnabled = true;
            this.userPausedAudio = false;
            return { ok: true, playing: true };
          } catch {
            return { ok: false, playing: false };
          }
        }

        return { ok: true, playing: !this.bgm.paused };
      }

      this.bgm.pause();
      this.bgm.setAttribute("src", trackPath);
      this.bgm.load();
      this.currentBgmPath = trackPath;

      if (!shouldPlay) {
        this.audioEnabled = false;
        return { ok: true, playing: false };
      }

      try {
        await this.bgm.play();
        this.audioEnabled = true;
        this.userPausedAudio = false;
        return { ok: true, playing: true };
      } catch {
        this.audioEnabled = false;
        return { ok: false, playing: false };
      }
    }

    async restoreDefaultMusic(options = {}) {
      if (!this.defaultBgmPath) {
        return { ok: false, playing: false };
      }

      return this.setMusicTrack(this.defaultBgmPath, options);
    }

    async fadeOutCurrentMusic(durationMs = 900) {
      if (!this.bgm || this.bgm.paused) {
        return { ok: true };
      }

      const token = Symbol("bgm-fade");
      this.activeFadeToken = token;
      const initialVolume = this.bgm.volume;
      const startTime = performance.now();

      return new Promise((resolve) => {
        const step = (now) => {
          if (this.activeFadeToken !== token) {
            resolve({ ok: false, cancelled: true });
            return;
          }

          const progress = Math.min((now - startTime) / durationMs, 1);
          this.bgm.volume = initialVolume * (1 - progress);

          if (progress < 1) {
            window.requestAnimationFrame(step);
            return;
          }

          this.bgm.pause();
          this.bgm.currentTime = 0;
          this.bgm.volume = this.baseBgmVolume;
          resolve({ ok: true });
        };

        window.requestAnimationFrame(step);
      });
    }

    async transitionToDefaultMusic({ fadeDurationMs = 900 } = {}) {
      if (!this.bgm) {
        return { ok: false, playing: false };
      }

      await this.fadeOutCurrentMusic(fadeDurationMs);
      return this.restoreDefaultMusic({ forcePlay: true });
    }

    async unlockSfx() {
      // Force la creation/reprise du contexte audio pour debloquer les bips web audio.
      await this.#getContext();
    }

    async playDropSuccess() {
      await this.#playToneSequence([
        { frequency: 660, type: "sine", duration: 0.08, gain: 0.3, delay: 0 },
        { frequency: 880, type: "sine", duration: 0.09, gain: 0.3, delay: 0.055 }
      ]);
    }

    async playDropError() {
      await this.#playToneSequence([
        { frequency: 240, type: "triangle", duration: 0.12, gain: 0.3, delay: 0 },
        { frequency: 190, type: "triangle", duration: 0.14, gain: 0.3, delay: 0.075 }
      ]);
    }

    playPuzzleSuccess() {
      try {
        this.successAudio.currentTime = 0;
        this.successAudio.play().catch(() => {});
      } catch {}
    }

    playReset({ empty = false } = {}) {
      try {
        const audio = empty && this.emptyResetAudio ? this.emptyResetAudio : this.resetAudio;
        audio.currentTime = 0;
        audio.play().catch(() => {});
      } catch {}
    }

    playRing() {
      try {
        this.ringAudio.pause();
        this.ringAudio.currentTime = 0;
        this.ringAudio.play().catch(() => {});
      } catch {}
    }

    playValidationError() {
      try {
        this.errorAudio.pause();
        this.errorAudio.currentTime = 0;
        this.errorAudio.play().catch(() => {});
      } catch {}
    }

    async #playToneSequence(notes) {
      // Joue une courte sequence de notes synthetiques pour les feedbacks instantanes.
      const ctx = await this.#getContext();
      if (!ctx) return;

      const now = ctx.currentTime;

      for (const note of notes) {
        this.#scheduleBeep(ctx, {
          at: now + (note.delay || 0),
          frequency: note.frequency,
          type: note.type || "sine",
          duration: note.duration || 0.1,
          gain: note.gain || 0.03
        });
      }
    }

    #scheduleBeep(ctx, { at, frequency, type, duration, gain }) {
      // Programme un beep unique avec une petite enveloppe pour eviter les clics audio.
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(frequency, at);

      gainNode.gain.setValueAtTime(0.0001, at);
      gainNode.gain.exponentialRampToValueAtTime(gain, at + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, at + duration);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start(at);
      osc.stop(at + duration + 0.03);
    }

    async #getContext() {
      // Cree le contexte audio a la demande puis le reactive si le navigateur l'a suspendu.
      try {
        if (!this.audioContext) {
          this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }

        if (this.audioContext.state === "suspended") {
          await this.audioContext.resume();
        }

        return this.audioContext;
      } catch {
        return null;
      }
    }
  }

  window.SoundManager = SoundManager;
})();
