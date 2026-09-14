import { NgOptimizedImage } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { HlmButton } from '@spartan-ng/helm/button';
import { afterNextGsap } from '../../core/animation/gsap';
import { SmoothScroll } from '../../core/animation/smooth-scroll';
import { TOURS_CLOSER_IMAGE, TOURS_PATH } from '../../core/catalog/tours';
import { I18nService } from '../../core/i18n/i18n';
import { TranslatePipe } from '../../core/i18n/translate-pipe';
import { AboutArchive } from './about-archive';
import { ABOUT_TRIO_IMAGE } from './about-media';
import { PeruIca } from './peru-ica';

export const ABOUT_POSTER = '/about/sand-poster.jpg';
export const ABOUT_VIDEO_WEBM = '/about/sand.webm';
export const ABOUT_VIDEO_MP4 = '/about/sand.mp4';
export { ABOUT_TRIO_IMAGE } from './about-media';

type SplitInstance = {
  revert: () => void;
  kill?: () => void;
  words: Element[];
  chars: Element[];
  lines: Element[];
};
type TweenInstance = { kill: () => void; scrollTrigger?: { kill: () => void } };

@Component({
  selector: 'app-about',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    NgOptimizedImage,
    RouterLink,
    HlmButton,
    TranslatePipe,
    AboutArchive,
    PeruIca,
  ],
  templateUrl: './about.html',
  styleUrl: './about.css',
})
export class About {
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly smooth = inject(SmoothScroll);
  private readonly motionReady = signal(false);
  private bindHero: (() => void) | undefined;
  private bindManifesto: (() => void) | undefined;
  private bindQuote: (() => void) | undefined;
  private bindRibbon: (() => void) | undefined;
  private bindMapCopy: (() => void) | undefined;
  private bindMotiva: (() => void) | undefined;
  private bindMapLabel: (() => void) | undefined;

  protected readonly i18n = inject(I18nService);
  protected readonly poster = ABOUT_POSTER;
  protected readonly videoWebm = ABOUT_VIDEO_WEBM;
  protected readonly videoMp4 = ABOUT_VIDEO_MP4;
  protected readonly trioImage = ABOUT_TRIO_IMAGE;
  protected readonly closerImage = TOURS_CLOSER_IMAGE;
  protected readonly toursPath = TOURS_PATH;
  protected readonly motivaCols = [
    { label: 'about.motivaLabel1', body: 'about.motivaP1' },
    { label: 'about.motivaLabel2', body: 'about.motivaP2' },
    { label: 'about.motivaLabel3', body: 'about.motivaP3' },
  ] as const;
  protected readonly craftCells = [
    { label: 'about.craftLabel1', body: 'about.craftMeet' },
    { label: 'about.craftLabel2', body: 'about.craftFormat' },
    { label: 'about.craftLabel3', body: 'about.craftLang' },
  ] as const;
  protected readonly videoReady = signal(false);

  protected onHeroPlaying(): void {
    this.videoReady.set(true);
  }

  protected onHeroVideoError(): void {
    this.videoReady.set(false);
  }

  constructor() {
    effect(() => {
      this.i18n.locale();
      if (!this.motionReady()) {
        return;
      }

      requestAnimationFrame(() => {
        this.bindHero?.();
        this.bindManifesto?.();
        this.bindQuote?.();
        this.bindRibbon?.();
        this.bindMapCopy?.();
        this.bindMotiva?.();
        this.bindMapLabel?.();
      });
    });

    afterNextGsap(
      (gsap, { ScrollTrigger, SplitText }) => {
        const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const motionMq = '(prefers-reduced-motion: no-preference)';
        const reducedMq = '(prefers-reduced-motion: reduce)';

        let heroSplit: SplitInstance | undefined;
        let heroTween: TweenInstance | undefined;
        this.bindHero = () => {
          heroTween?.kill();
          heroSplit?.revert();
          heroSplit = undefined;
          heroTween = undefined;

          const title = this.host.nativeElement.querySelector('[data-hero-title]');
          if (!(title instanceof HTMLElement) || !SplitText) {
            return;
          }

          title.textContent = this.i18n.t('about.heroTitle');
          if (reduced()) {
            return;
          }

          heroSplit = new SplitText(title, {
            type: 'chars,words,lines',
            linesClass: 'about-split-line',
            aria: 'auto',
          });
          heroTween = gsap.from(heroSplit.chars, {
            yPercent: 120,
            rotateZ: 8,
            duration: 0.7,
            stagger: 0.016,
            ease: 'power4.out',
            immediateRender: false,
            onComplete: () => {
              heroSplit?.revert();
              heroSplit = undefined;
            },
          });
        };

        let manifestoSplit: SplitInstance | undefined;
        let manifestoTween: TweenInstance | undefined;
        let manifestoParaSplits: SplitInstance[] = [];
        this.bindManifesto = () => {
          manifestoTween?.scrollTrigger?.kill();
          manifestoTween?.kill();
          manifestoSplit?.kill?.();
          manifestoSplit?.revert();
          manifestoParaSplits.forEach((split) => {
            split.kill?.();
            split.revert();
          });
          manifestoSplit = undefined;
          manifestoTween = undefined;
          manifestoParaSplits = [];

          const section = this.host.nativeElement.querySelector('[data-manifesto]');
          const headline = this.host.nativeElement.querySelector('[data-manifesto-headline]');
          const paragraphs = this.host.nativeElement.querySelectorAll('[data-manifesto-p]');
          if (
            !(section instanceof HTMLElement) ||
            !(headline instanceof HTMLElement) ||
            !SplitText
          ) {
            return;
          }

          headline.textContent = this.i18n.t('about.manifestoHeadline');
          const paraKeys = ['about.manifestoP1', 'about.manifestoP2'] as const;
          paragraphs.forEach((node: Element, index: number) => {
            if (node instanceof HTMLElement) {
              node.textContent = this.i18n.t(paraKeys[index] ?? paraKeys[0]);
            }
          });
          if (reduced()) {
            return;
          }

          manifestoSplit = new SplitText(headline, {
            type: 'words,lines',
            linesClass: 'about-split-line',
            autoSplit: true,
            aria: 'auto',
            onSplit: (self) => {
              manifestoTween?.scrollTrigger?.kill();
              manifestoTween?.kill();
              manifestoTween = gsap.from(self.words, {
                yPercent: 100,
                duration: 0.7,
                stagger: 0.04,
                ease: 'power3.out',
                immediateRender: false,
                scrollTrigger: {
                  trigger: section,
                  start: 'top 80%',
                  toggleActions: 'play none none none',
                },
              });
              return manifestoTween;
            },
          });

          paragraphs.forEach((node: Element) => {
            if (!(node instanceof HTMLElement)) {
              return;
            }
            const split = new SplitText(node, {
              type: 'lines',
              linesClass: 'about-split-line',
              autoSplit: true,
              aria: 'auto',
              onSplit: (self) => {
                return gsap.from(self.lines, {
                  yPercent: 110,
                  duration: 0.85,
                  stagger: 0.07,
                  ease: 'power3.out',
                  immediateRender: false,
                  scrollTrigger: {
                    trigger: node,
                    start: 'top 88%',
                    toggleActions: 'play none none none',
                  },
                });
              },
            });
            manifestoParaSplits.push(split);
          });
        };

        let quoteSplitA: SplitInstance | undefined;
        let quoteSplitB: SplitInstance | undefined;
        let quoteTween: TweenInstance | undefined;
        this.bindQuote = () => {
          quoteTween?.scrollTrigger?.kill();
          quoteTween?.kill();
          quoteSplitA?.revert();
          quoteSplitB?.revert();
          quoteSplitA = undefined;
          quoteSplitB = undefined;
          quoteTween = undefined;

          const section = this.host.nativeElement.querySelector('[data-quote]');
          const lineA = this.host.nativeElement.querySelector('[data-quote-a]');
          const lineB = this.host.nativeElement.querySelector('[data-quote-b]');
          const plateA = lineA?.querySelector('[data-quote-plate]');
          const plateB = lineB?.querySelector('[data-quote-plate]');
          if (
            !(section instanceof HTMLElement) ||
            !(plateA instanceof HTMLElement) ||
            !(plateB instanceof HTMLElement) ||
            !SplitText
          ) {
            return;
          }

          plateA.textContent = this.i18n.t('about.quoteA');
          plateB.textContent = this.i18n.t('about.quoteB');
          if (reduced()) {
            return;
          }

          const pinQuote = false;
          quoteSplitA = new SplitText(plateA, {
            type: 'chars,lines',
            linesClass: 'about-split-line',
            aria: 'auto',
          });
          quoteSplitB = new SplitText(plateB, {
            type: 'chars,lines',
            linesClass: 'about-split-line',
            aria: 'auto',
          });
          quoteTween = gsap
            .timeline({
              scrollTrigger: pinQuote
                ? {
                    trigger: section,
                    pin: true,
                    start: 'center center',
                    end: '+=90%',
                    scrub: true,
                  }
                : {
                    trigger: section,
                    start: 'top 78%',
                    toggleActions: 'play none none none',
                  },
            })
            .from(plateA, {
              scaleX: 0,
              duration: pinQuote ? undefined : 0.55,
              ease: pinQuote ? 'none' : 'power2.out',
              immediateRender: false,
            })
            .from(
              quoteSplitA.chars,
              {
                yPercent: 115,
                stagger: pinQuote ? 0.02 : 0.018,
                duration: pinQuote ? undefined : 0.6,
                ease: pinQuote ? 'none' : 'power3.out',
                immediateRender: false,
              },
              pinQuote ? '<0.12' : '-=0.35',
            )
            .from(
              plateB,
              {
                scaleX: 0,
                duration: pinQuote ? undefined : 0.5,
                ease: pinQuote ? 'none' : 'power2.out',
                immediateRender: false,
              },
              pinQuote ? '>0.08' : '-=0.2',
            )
            .from(
              quoteSplitB.chars,
              {
                yPercent: 110,
                stagger: 0.014,
                duration: pinQuote ? undefined : 0.55,
                ease: pinQuote ? 'none' : 'power2.out',
                immediateRender: false,
              },
              pinQuote ? '<0.1' : '-=0.32',
            );
        };

        let ribbonTween: TweenInstance | undefined;
        this.bindRibbon = () => {
          ribbonTween?.scrollTrigger?.kill();
          ribbonTween?.kill();
          ribbonTween = undefined;

          const ribbon = this.host.nativeElement.querySelector('[data-ribbon]');
          const pinEl = this.host.nativeElement.querySelector('[data-ribbon-pin]');
          const track = this.host.nativeElement.querySelector('[data-ribbon-track]');
          const units = this.host.nativeElement.querySelectorAll('[data-ribbon-unit]');
          const phrase = this.i18n.t('about.ribbon');
          units.forEach((unit: Element) => {
            unit.textContent = `${phrase} · `;
          });
          if (
            reduced() ||
            !(ribbon instanceof HTMLElement) ||
            !(pinEl instanceof HTMLElement) ||
            !(track instanceof HTMLElement)
          ) {
            return;
          }

          const travel = () => Math.max(track.scrollWidth - pinEl.offsetWidth, 0);
          ribbonTween = gsap.to(track, {
            x: () => -travel(),
            ease: 'none',
            scrollTrigger: {
              trigger: pinEl,
              pin: true,
              scrub: 1,
              start: 'top top',
              end: () => `+=${Math.max(travel(), window.innerWidth)}`,
              invalidateOnRefresh: true,
            },
          });
        };

        let mapSplit: SplitInstance | undefined;
        let mapTween: TweenInstance | undefined;
        this.bindMapCopy = () => {
          mapTween?.scrollTrigger?.kill();
          mapTween?.kill();
          mapSplit?.revert();
          mapSplit = undefined;
          mapTween = undefined;

          const scene = this.host.nativeElement.querySelector('[data-map-scene]');
          const headline = this.host.nativeElement.querySelector('[data-map-headline]');
          const lead = this.host.nativeElement.querySelector('[data-map-lead]');
          if (
            !(scene instanceof HTMLElement) ||
            !(headline instanceof HTMLElement) ||
            !SplitText
          ) {
            return;
          }

          headline.textContent = this.i18n.t('about.mapHeadline');
          if (reduced()) {
            return;
          }

          mapSplit = new SplitText(headline, { type: 'words,lines', linesClass: 'about-split-line' });
          mapTween = gsap
            .timeline({
              scrollTrigger: {
                trigger: scene,
                start: 'top 80%',
                toggleActions: 'play none none none',
              },
            })
            .from(mapSplit.words, {
              yPercent: 100,
              duration: 0.7,
              stagger: 0.05,
              ease: 'power3.out',
              immediateRender: false,
            })
            .from(
              lead,
              {
                autoAlpha: 0,
                duration: 0.7,
                ease: 'power1.out',
                immediateRender: false,
              },
              '-=0.35',
            );
        };

        let motivaSplit: SplitInstance | undefined;
        let motivaTween: TweenInstance | undefined;
        let motivaLineSplits: SplitInstance[] = [];
        this.bindMotiva = () => {
          motivaTween?.scrollTrigger?.kill();
          motivaTween?.kill();
          motivaSplit?.revert();
          motivaLineSplits.forEach((split) => {
            split.kill?.();
            split.revert();
          });
          motivaSplit = undefined;
          motivaTween = undefined;
          motivaLineSplits = [];

          const section = this.host.nativeElement.querySelector('[data-motiva]');
          const headline = this.host.nativeElement.querySelector('[data-motiva-headline]');
          const beats = this.host.nativeElement.querySelectorAll('[data-motiva-beat]');
          if (
            !(section instanceof HTMLElement) ||
            !(headline instanceof HTMLElement) ||
            !SplitText
          ) {
            return;
          }

          headline.textContent = this.i18n.t('about.motivaHeadline');
          beats.forEach((node: Element, index: number) => {
            if (node instanceof HTMLElement) {
              node.textContent = this.i18n.t(this.motivaCols[index]?.body ?? 'about.motivaP1');
            }
          });
          if (reduced()) {
            return;
          }

          motivaSplit = new SplitText(headline, { type: 'lines', linesClass: 'about-split-line' });
          motivaTween = gsap.from(motivaSplit.lines, {
            autoAlpha: 0,
            duration: 0.8,
            ease: 'power1.out',
            immediateRender: false,
            scrollTrigger: {
              trigger: section,
              start: 'top 80%',
              toggleActions: 'play none none none',
            },
          });

          beats.forEach((node: Element) => {
            if (!(node instanceof HTMLElement)) {
              return;
            }
            const split = new SplitText(node, {
              type: 'lines',
              linesClass: 'about-split-line',
              autoSplit: true,
              aria: 'auto',
              onSplit: (self) =>
                gsap.from(self.lines, {
                  yPercent: 110,
                  duration: 0.85,
                  stagger: 0.07,
                  ease: 'power3.out',
                  immediateRender: false,
                  scrollTrigger: {
                    trigger: node,
                    start: 'top 90%',
                    toggleActions: 'play none none none',
                  },
                }),
            });
            motivaLineSplits.push(split);
          });
        };

        this.bindMapLabel = () => {
          const label = this.host.nativeElement.querySelector('[data-map-label]');
          if (label instanceof SVGTextElement || label instanceof HTMLElement) {
            label.textContent = this.i18n.t('about.mapIca');
          }
        };

        return gsap.context(() => {
          const poster = this.host.nativeElement.querySelector('[data-hero-poster]');
          const video = this.host.nativeElement.querySelector('[data-hero-video]');
          const kenBurns = () => {
            if (!(poster instanceof HTMLElement) || reduced()) {
              return;
            }
            gsap.to(poster, {
              scale: 1.06,
              duration: 14,
              ease: 'none',
              repeat: -1,
              yoyo: true,
            });
          };

          if (video instanceof HTMLVideoElement) {
            if (reduced()) {
              video.pause();
              this.videoReady.set(false);
              kenBurns();
            } else {
              const play = video.play();
              if (play) {
                void play.catch(() => {
                  this.videoReady.set(false);
                  kenBurns();
                });
              }
            }
          } else {
            kenBurns();
          }

          this.motionReady.set(true);

          void this.smooth.whenReady().then(() => {
            this.bindManifesto?.();
            this.bindQuote?.();
            this.bindRibbon?.();
            this.bindMapCopy?.();
            this.bindMotiva?.();

            const mm = gsap.matchMedia();
            const scene = this.host.nativeElement.querySelector('[data-map-scene]');
            const mapLayer = this.host.nativeElement.querySelector('[data-map-layer]');
            const copy = this.host.nativeElement.querySelector('[data-map-copy]');
            const stageWrap = this.host.nativeElement.querySelector('[data-map-stage-wrap]');
            const stage = this.host.nativeElement.querySelector('[data-map-stage]');
            const svg = this.host.nativeElement.querySelector('.about-map-svg');
            const ica = this.host.nativeElement.querySelector('[data-ica]');
            const label = this.host.nativeElement.querySelector('[data-map-label]');
            const trio = this.host.nativeElement.querySelector('[data-trio]');
            const peruGroup = this.host.nativeElement.querySelector('[data-peru]');
            const lake = this.host.nativeElement.querySelector('[data-lake]');
            const peruPaths =
              peruGroup instanceof Element ? Array.from(peruGroup.querySelectorAll('path')) : [];

            const drawRank = (node: Element) => {
              const ranks: Record<string, number> = {
                'PE-TUM': 0,
                'PE-PIU': 1,
                'PE-LAM': 2,
                'PE-CAJ': 3,
                'PE-LOR': 4,
                'PE-AMA': 5,
                'PE-SAM': 6,
                'PE-LAL': 7,
                'PE-ANC': 8,
                'PE-HUC': 9,
                'PE-UCA': 10,
                'PE-PAS': 11,
                'PE-JUN': 12,
                'PE-LIM': 13,
                'PE-LMA': 14,
                'PE-CAL': 15,
                'PE-MDD': 16,
                'PE-CUS': 17,
                'PE-HUV': 18,
                'PE-AYA': 19,
                'PE-APU': 20,
                'PE-ICA': 21,
                'PE-PUN': 22,
                'PE-LKT': 23,
                'PE-ARE': 24,
                'PE-MOQ': 25,
                'PE-TAC': 26,
              };
              const id = node.id;
              return Object.prototype.hasOwnProperty.call(ranks, id) ? ranks[id] : 50;
            };
            const sortDrawOrder = (nodes: Element[]) =>
              [...nodes].sort((a, b) => drawRank(a) - drawRank(b));

            const placeIcaLabel = () => {
              if (!(label instanceof SVGTextElement) || !(ica instanceof SVGGraphicsElement)) {
                return;
              }
              try {
                const box = ica.getBBox();
                if (box.width < 1 || box.height < 1) {
                  return;
                }
                const cx = box.x + box.width * 0.36;
                const cy = box.y + box.height * 0.48;
                label.setAttribute('text-anchor', 'middle');
                label.setAttribute('dominant-baseline', 'middle');
                label.setAttribute('x', String(cx));
                label.setAttribute('y', String(cy));
              } catch {
                return;
              }
            };

            const icaCamera = () => {
              const fallback = { x: 0, y: 0, w: 542.76703, h: 792 };
              if (
                !(svg instanceof SVGSVGElement) ||
                !(ica instanceof SVGGraphicsElement) ||
                !(stageWrap instanceof HTMLElement)
              ) {
                return fallback;
              }
              try {
                const bbox = ica.getBBox();
                const wrapW = stageWrap.offsetWidth;
                const wrapH = stageWrap.offsetHeight;
                if (bbox.width < 1 || bbox.height < 1 || wrapW < 1 || wrapH < 1) {
                  return fallback;
                }
                const pad = 1 / 0.9;
                const aspect = wrapW / wrapH;
                let h = bbox.height * pad;
                let w = h * aspect;
                if (w < bbox.width * pad) {
                  w = bbox.width * pad;
                  h = w / aspect;
                }
                return {
                  x: bbox.x + bbox.width / 2 - w / 2,
                  y: bbox.y + bbox.height / 2 - h / 2,
                  w,
                  h,
                };
              } catch {
                return fallback;
              }
            };

            mm.add(motionMq, () => {
              if (
                !(scene instanceof HTMLElement) ||
                !(mapLayer instanceof HTMLElement) ||
                !(stageWrap instanceof HTMLElement) ||
                !(stage instanceof Element)
              ) {
                return;
              }

              const drawn = sortDrawOrder([
                ...peruPaths,
                ...(ica instanceof Element ? [ica] : []),
                ...(lake instanceof Element ? [lake] : []),
              ]);

              gsap.set(drawn, { drawSVG: '0% 0%' });
              placeIcaLabel();
              gsap.set(stage, { clearProps: 'transform' });
              gsap.set(stageWrap, { x: 0, y: 0, scale: 1, force3D: false });
              if (ica instanceof Element) {
                gsap.set(ica, { fillOpacity: 0 });
              }
              if (label) {
                gsap.set(label, { autoAlpha: 0 });
              }
              if (trio instanceof Element) {
                gsap.set(trio, { autoAlpha: 0 });
              }

              const icaName = this.i18n.t('about.mapIca');
              const baseVb =
                svg instanceof SVGSVGElement
                  ? svg.viewBox.baseVal
                  : { x: 0, y: 0, width: 542.76703, height: 792 };
              const camera = {
                x: baseVb.x,
                y: baseVb.y,
                w: baseVb.width,
                h: baseVb.height,
              };
              const applyCamera = () => {
                if (svg instanceof SVGSVGElement) {
                  svg.setAttribute('viewBox', `${camera.x} ${camera.y} ${camera.w} ${camera.h}`);
                }
                const k = camera.h / 792;
                for (const node of drawn) {
                  if (node instanceof SVGElement) {
                    node.removeAttribute('vector-effect');
                    node.style.strokeWidth = `${2.15 * k}`;
                  }
                }
                if (lake instanceof SVGElement) {
                  lake.removeAttribute('vector-effect');
                  lake.style.strokeWidth = `${0.7 * k}`;
                }
                if (ica instanceof SVGElement) {
                  ica.removeAttribute('vector-effect');
                  ica.style.strokeWidth = `${2.4 * k}`;
                }
              };
              const vh = () => window.innerHeight;
              const headerPx = () => {
                const bar = document.querySelector('app-site-header header');
                return bar instanceof HTMLElement ? bar.getBoundingClientRect().height : 80;
              };
              const approach = 0.85;
              const drawInPin = 1.8;
              const pinLen = 4;
              const restTl = 8.9;
              const dummyFrac = drawInPin / pinLen;
              const dummyDur = (dummyFrac * restTl) / (1 - dummyFrac);
              const drawTl = gsap.timeline({
                scrollTrigger: {
                  id: 'about-map-draw',
                  trigger: scene,
                  start: 'top 85%',
                  end: () => `+=${vh() * (approach + drawInPin)}`,
                  scrub: true,
                  invalidateOnRefresh: true,
                },
              });
              drawTl.fromTo(
                drawn,
                { drawSVG: '0% 0%' },
                {
                  drawSVG: '0% 100%',
                  duration: 10,
                  stagger: { amount: 12, from: 'start' },
                  ease: 'none',
                },
              );
              if (ica instanceof Element) {
                drawTl.to(ica, { fillOpacity: 1, duration: 2, ease: 'none' });
              }
              if (label) {
                drawTl.set(label, { autoAlpha: 1 }, 'label');
                drawTl.to(
                  label,
                  {
                    duration: 1.5,
                    scrambleText: {
                      text: icaName,
                      chars: 'ICA ',
                      speed: 0.4,
                      revealDelay: 0.15,
                    },
                    ease: 'none',
                  },
                  'label',
                );
              }
              const tl = gsap.timeline({
                scrollTrigger: {
                  id: 'about-map-pin',
                  trigger: scene,
                  pin: true,
                  start: () => `top ${headerPx()}px`,
                  end: () => `+=${vh() * pinLen}`,
                  scrub: true,
                  anticipatePin: 1,
                  invalidateOnRefresh: true,
                },
              });

              tl.to({}, { duration: dummyDur, ease: 'none' });
              tl.to({}, { duration: 0.4 });

              if (copy instanceof Element) {
                tl.to(copy, { autoAlpha: 0, duration: 1.2, ease: 'none' }, 'takeover');
              }
              if (label) {
                tl.to(label, { autoAlpha: 0, duration: 0.8, ease: 'none' }, 'takeover+=3.2');
              }

              tl.to(
                camera,
                {
                  duration: 5.5,
                  ease: 'none',
                  x: () => icaCamera().x,
                  y: () => icaCamera().y,
                  w: () => icaCamera().w,
                  h: () => icaCamera().h,
                  onUpdate: applyCamera,
                },
                'takeover',
              );

              tl.to({}, { duration: 1 });
              tl.to(mapLayer, { autoAlpha: 0, duration: 1.2, ease: 'none' }, 'cross');
              if (trio instanceof Element) {
                tl.to(trio, { autoAlpha: 1, duration: 1.2, ease: 'none' }, 'cross');
              }

              ScrollTrigger.refresh();
            });

            mm.add(reducedMq, () => {
              gsap.set(peruPaths, { drawSVG: '0% 100%' });
              if (lake instanceof Element) {
                gsap.set(lake, { drawSVG: '0% 100%' });
              }
              if (ica instanceof Element) {
                gsap.set(ica, { drawSVG: '0% 100%', fillOpacity: 1 });
              }
              if (label) {
                placeIcaLabel();
                gsap.set(label, { autoAlpha: 1 });
              }
              if (trio instanceof Element) {
                gsap.set(trio, { autoAlpha: 1 });
              }
            });
          });
        }, this.host.nativeElement);
      },
      { morphSvg: false, splitText: true, drawSvg: true, scrambleText: true },
    );
  }
}
