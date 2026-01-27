export class AudioManager {
  private static instance: AudioManager;
  private backgroundMusic: HTMLAudioElement | null = null;
  private revolutionSound: HTMLAudioElement | null = null;
  private drawSound: HTMLAudioElement | null = null;
  private healSound: HTMLAudioElement | null = null;
  private sacrificeSound: HTMLAudioElement | null = null;
  private shuffleSound: HTMLAudioElement | null = null;
  private cardSound: HTMLAudioElement | null = null;
  private attackSound: HTMLAudioElement | null = null;
  private blockSound: HTMLAudioElement | null = null;
  private isMuted: boolean = false;
  private volume: number = 0.03;
  private revolutionVolume: number = 0.5;
  private isPlaying: boolean = false;

  private constructor() {
    this.initBackgroundMusic();
    this.initRevolutionSound();
    this.initDrawSound();
    this.initHealSound();
    this.initSacrificeSound();
    this.initShuffleSound();
    this.initCardSound();
    this.initAttackSound();
    this.initBlockSound();
  }

  public static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  private initBackgroundMusic() {
    try {
      this.backgroundMusic = new Audio();
      this.backgroundMusic.src = "/assets/sound-design/jazz_loop_119bpm.wav";
      if (this.backgroundMusic) {
        this.backgroundMusic.loop = true;
        this.backgroundMusic.volume = this.volume;
        this.backgroundMusic.load();

        document.addEventListener(
          "click",
          () => {
            if (!this.isPlaying) {
              this.playBackgroundMusic();
            }
          },
          { once: true },
        );

        this.backgroundMusic.onended = () => {
          this.isPlaying = false;
        };

        this.backgroundMusic.onpause = () => {
          this.isPlaying = false;
        };

        this.backgroundMusic.onplay = () => {
          this.isPlaying = true;
        };

        this.backgroundMusic.onerror = () => {
          // console.error("Erreur de chargement audio:", e);
          this.isPlaying = false;
        };
      }
    } catch (error) {
      console.error("Erreur lors de l'initialisation de l'audio:", error);
    }
  }

  private initRevolutionSound() {
    try {
      //   // console.log("Initialisation du son de révolution...");
      this.revolutionSound = new Audio();
      this.revolutionSound.src = "/assets/sound-design/revolution normale.wav";
      if (this.revolutionSound) {
        this.revolutionSound.volume = this.revolutionVolume;
        this.revolutionSound.load();

        this.revolutionSound.onloadeddata = () => {
          //   // console.log("Son de révolution chargé avec succès");
        };
        this.revolutionSound.onerror = () => {
          //   console.error("Erreur de chargement du son de révolution:", e);
        };
      }
    } catch (error) {
      console.error(
        "Erreur lors de l'initialisation du son de révolution:",
        error,
      );
    }
  }

  private initDrawSound() {
    try {
      //   // console.log("Initialisation du son de pioche...");
      this.drawSound = new Audio();
      this.drawSound.src = "/assets/sound-design/tirer 6.wav";
      if (this.drawSound) {
        this.drawSound.volume = this.volume * 20;
        this.drawSound.load();

        this.drawSound.onloadeddata = () => {
          //   // console.log("Son de pioche chargé avec succès");
        };

        this.drawSound.onerror = () => {
          //   console.error("Erreur lors du chargement du son de pioche:", e);
        };
      }
    } catch (error) {
      console.error("Erreur lors de l'initialisation du son de pioche:", error);
    }
  }

  private initHealSound() {
    try {
      //   // console.log("Initialisation du son de soin...");
      this.healSound = new Audio();
      this.healSound.src = "/assets/sound-design/gain pv.wav";
      if (this.healSound) {
        this.healSound.volume = this.volume * 10;
        this.healSound.load();

        this.healSound.onloadeddata = () => {
          //   // console.log("Son de soin chargé avec succès");
        };

        this.healSound.onerror = () => {
          //   console.error("Erreur lors du chargement du son de soin:", e);
        };
      }
    } catch (error) {
      console.error("Erreur lors de l'initialisation du son de soin:", error);
    }
  }

  private initSacrificeSound() {
    try {
      // console.log("Initialisation du son de sacrifice...");
      this.sacrificeSound = new Audio();
      this.sacrificeSound.src = "/assets/sound-design/sf_guillotine_04.mp3";
      if (this.sacrificeSound) {
        this.sacrificeSound.volume = this.volume * 5;
        this.sacrificeSound.load();

        this.sacrificeSound.onloadeddata = () => {
          // console.log("Son de sacrifice chargé avec succès");
        };

        this.sacrificeSound.onerror = () => {
          //   console.error("Erreur lors du chargement du son de sacrifice:", e);
        };
      }
    } catch (error) {
      console.error(
        "Erreur lors de l'initialisation du son de sacrifice:",
        error,
      );
    }
  }

  private initShuffleSound() {
    try {
      // console.log("Initialisation du son de mélange...");
      this.shuffleSound = new Audio();
      this.shuffleSound.src = "/assets/sound-design/shuffle_short.wav";
      if (this.shuffleSound) {
        this.shuffleSound.volume = this.volume * 15;
        this.shuffleSound.load();

        this.shuffleSound.onloadeddata = () => {
          // console.log("Son de mélange chargé avec succès");
        };

        this.shuffleSound.onerror = () => {
          // console.error("Erreur lors du chargement du son de mélange:", e);
        };
      }
    } catch (error) {
      console.error(
        "Erreur lors de l'initialisation du son de mélange:",
        error,
      );
    }
  }

  private initCardSound() {
    try {
      // console.log("Initialisation du son de carte...");
      this.cardSound = new Audio();
      this.cardSound.src = "/assets/sound-design/card_sound.wav";
      if (this.cardSound) {
        this.cardSound.volume = this.volume;
        this.cardSound.load();

        this.cardSound.onloadeddata = () => {
          // console.log("Son de carte chargé avec succès");
        };

        this.cardSound.onerror = () => {
          // console.error("Erreur lors du chargement du son de carte:", e);
        };
      }
    } catch (error) {
      console.error("Erreur lors de l'initialisation du son de carte:", error);
    }
  }

  private initAttackSound() {
    try {
      this.attackSound = new Audio();
      this.attackSound.src = "/assets/sound-design/attack_sound.wav";
      if (this.attackSound) {
        this.attackSound.volume = this.volume;
        this.attackSound.load();
      }
    } catch (error) {
      console.error("Erreur lors de l'initialisation du son d'attaque:", error);
    }
  }

  private initBlockSound() {
    try {
      this.blockSound = new Audio();
      this.blockSound.src = "/assets/sound-design/block_sound.wav";
      if (this.blockSound) {
        this.blockSound.volume = this.volume;
        this.blockSound.load();
      }
    } catch (error) {
      console.error(
        "Erreur lors de l'initialisation du son de blocage:",
        error,
      );
    }
  }

  public playBackgroundMusic() {
    if (!this.backgroundMusic || this.isMuted || this.isPlaying) return;

    try {
      const playPromise = this.backgroundMusic.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            this.isPlaying = true;
          })
          .catch((error) => {
            this.isPlaying = false;
            if (error.name !== "NotAllowedError") {
              // console.error("Erreur lors de la lecture de la musique:", error);
            }
          });
      }
    } catch (error) {
      this.isPlaying = false;
      console.error("Erreur lors de la lecture de la musique:", error);
    }
  }

  public playRevolutionSound() {
    // console.log("Tentative de lecture du son de révolution...");
    // console.log("État du son:", {
    //   exists: !!this.revolutionSound,
    //   isMuted: this.isMuted,
    //   volume: this.volume,
    // });

    if (!this.revolutionSound || this.isMuted) {
      // console.log("Son non joué car:", !this.revolutionSound ? "non initialisé" : "muté");
      return;
    }

    try {
      // Réinitialiser le son pour pouvoir le rejouer
      this.revolutionSound.currentTime = 0;
      const playPromise = this.revolutionSound.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            // console.log("Son de révolution joué avec succès");
          })
          .catch(() => {
            // console.error("Erreur lors de la lecture du son de révolution:", error);
          });
      }
    } catch (error) {
      console.error("Erreur lors de la lecture du son de révolution:", error);
    }
  }

  public playDrawSound() {
    try {
      if (this.drawSound && !this.isMuted) {
        this.drawSound.currentTime = 0;
        this.drawSound.play().catch((error) => {
          console.error("Erreur lors de la lecture du son de pioche:", error);
        });
      }
    } catch (error) {
      console.error("Erreur lors de la lecture du son de pioche:", error);
    }
  }

  public playHealSound() {
    try {
      if (this.healSound && !this.isMuted) {
        this.healSound.currentTime = 0;
        this.healSound.play().catch((error) => {
          console.error("Erreur lors de la lecture du son de soin:", error);
        });
      }
    } catch (error) {
      console.error("Erreur lors de la lecture du son de soin:", error);
    }
  }

  public playSacrificeSound() {
    try {
      if (this.sacrificeSound && !this.isMuted) {
        this.sacrificeSound.currentTime = 0;
        this.sacrificeSound.play().catch((error) => {
          console.error(
            "Erreur lors de la lecture du son de sacrifice:",
            error,
          );
        });
      }
    } catch (error) {
      console.error("Erreur lors de la lecture du son de sacrifice:", error);
    }
  }

  public playShuffleSound() {
    try {
      if (this.shuffleSound && !this.isMuted) {
        this.shuffleSound.currentTime = 0;
        this.shuffleSound.play().catch((error) => {
          console.error("Erreur lors de la lecture du son de mélange:", error);
        });
      }
    } catch (error) {
      console.error("Erreur lors de la lecture du son de mélange:", error);
    }
  }

  public playCardSound() {
    try {
      if (this.cardSound && !this.isMuted) {
        this.cardSound.currentTime = 0;
        this.cardSound.play().catch((error) => {
          console.error("Erreur lors de la lecture du son de carte:", error);
        });
      }
    } catch (error) {
      console.error("Erreur lors de la lecture du son de carte:", error);
    }
  }

  public playAttackSound() {
    try {
      if (this.attackSound && !this.isMuted) {
        this.attackSound.currentTime = 0;
        this.attackSound.play().catch((error) => {
          console.error("Erreur lors de la lecture du son d'attaque:", error);
        });
      }
    } catch (error) {
      console.error("Erreur lors de la lecture du son d'attaque:", error);
    }
  }

  public playBlockSound() {
    try {
      if (this.blockSound && !this.isMuted) {
        this.blockSound.currentTime = 0;
        this.blockSound.play().catch((error) => {
          console.error("Erreur lors de la lecture du son de blocage:", error);
        });
      }
    } catch (error) {
      console.error("Erreur lors de la lecture du son de blocage:", error);
    }
  }

  public async playSacrificeWithHealSound() {
    try {
      if (this.sacrificeSound && this.healSound && !this.isMuted) {
        this.sacrificeSound.currentTime = 0;
        await this.sacrificeSound.play();

        // Attendre un court délai avant de jouer le son de soin
        setTimeout(() => {
          if (this.healSound) {
            this.healSound.currentTime = 0;
            this.healSound.play().catch((error) => {
              console.error("Erreur lors de la lecture du son de soin:", error);
            });
          }
        }, 300); // Délai de 300ms pour une transition naturelle
      }
    } catch (error) {
      console.error("Erreur lors de la lecture des sons:", error);
    }
  }

  public stopBackgroundMusic() {
    if (!this.backgroundMusic || !this.isPlaying) return;

    try {
      this.backgroundMusic.pause();
      this.backgroundMusic.currentTime = 0;
      this.isPlaying = false;
    } catch (error) {
      console.error("Erreur lors de l'arrêt de la musique:", error);
    }
  }

  public toggleMute() {
    this.isMuted = !this.isMuted;

    if (!this.backgroundMusic) return;

    try {
      if (this.isMuted) {
        if (this.isPlaying) {
          this.backgroundMusic.pause();
          this.isPlaying = false;
        }
      } else if (!this.isPlaying) {
        this.playBackgroundMusic();
      }
    } catch (error) {
      console.error("Erreur lors du changement de mute:", error);
    }
  }

  public setVolume(value: number) {
    this.volume = value;
    if (this.backgroundMusic) {
      this.backgroundMusic.volume = this.volume;
    }
    if (this.revolutionSound) {
      this.revolutionSound.volume = this.revolutionVolume;
    }
    if (this.drawSound) {
      this.drawSound.volume = this.volume * 20;
    }
    if (this.healSound) {
      this.healSound.volume = this.volume * 10;
    }
    if (this.sacrificeSound) {
      this.sacrificeSound.volume = this.volume * 5;
    }
    if (this.shuffleSound) {
      this.shuffleSound.volume = this.volume * 15;
    }
    if (this.cardSound) {
      this.cardSound.volume = this.volume * 15;
    }
  }

  public getVolume(): number {
    return this.volume;
  }

  public isMusicMuted(): boolean {
    return this.isMuted;
  }
}
