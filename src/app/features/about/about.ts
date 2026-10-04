import { NgOptimizedImage } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  inject,
  signal,
} from '@angular/core';
import { afterNextGsap } from '../../core/animation/gsap';
import { SmoothScroll } from '../../core/animation/smooth-scroll';
import { CatalogService } from '../../core/catalog/catalog';
import { TOURS_CLOSER_IMAGE, TOURS_PATH } from '../../core/catalog/tours';
import { I18nService } from '../../core/i18n/i18n';
import { TranslatePipe } from '../../core/i18n/translate-pipe';
import { PhotoCta } from '../../core/layout/photo-cta';
import { AboutArchive } from './about-archive';
import { ABOUT_TRIO_IMAGE } from './about-media';
import { PeruIca } from './peru-ica';

export const ABOUT_POSTER = '/about/sand-poster.jpg';
export { ABOUT_TRIO_IMAGE } from './about-media';

const ICA_FILL_WASH = 0.18;
const LAKE_STROKE_WIDTH = 1.2;

@Component({
  selector: 'app-about',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgOptimizedImage, TranslatePipe, PhotoCta, AboutArchive, PeruIca],
  templateUrl: './about.html',
  styleUrl: './about.css',
})
export class About {
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly smooth = inject(SmoothScroll);
  private readonly motionReady = signal(false);
  private refreshMotion: (() => void) | undefined;

  protected readonly i18n = inject(I18nService);
  private readonly catalog = inject(CatalogService);
  protected readonly poster = this.catalog.media('about.video')?.poster ?? ABOUT_POSTER;
  protected readonly trioImage = this.catalog.mediaImage('about.trio', ABOUT_TRIO_IMAGE);
  protected readonly closerImage = this.catalog.mediaImage('tours.closer', TOURS_CLOSER_IMAGE);
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

  constructor() {
    effect(() => {
      this.i18n.locale();
      if (!this.motionReady()) {
        return;
      }

      requestAnimationFrame(() => this.refreshMotion?.());
    });

    afterNextGsap(
      (gsap, { ScrollTrigger }) => {
        const motionMq = '(prefers-reduced-motion: no-preference)';
        const reducedMq = '(prefers-reduced-motion: reduce)';
        const root = this.host.nativeElement;
        const query = (sel: string): HTMLElement | null => {
          const node = root.querySelector(sel);
          return node instanceof HTMLElement ? node : null;
        };
        const clearMotion = (node: Element | null) => {
          if (node instanceof HTMLElement) {
            gsap.set(node, { willChange: 'auto', clearProps: 'clipPath,transform,opacity' });
          }
        };

        return gsap.context(() => {
          this.motionReady.set(true);

          void this.smooth.whenReady().then(() => {
            const mm = gsap.matchMedia();
            const heroCopy = query('[data-hero-copy]');
            const motiva = query('[data-motiva]');
            const motivaCols = root.querySelectorAll('[data-motiva-col]');
            const scene = query('[data-map-scene]');
            const mapLayer = query('[data-map-layer]');
            const who = query('[data-map-who]');
            const whoIn = query('[data-map-who-in]');
            const origin = query('[data-map-origin]');
            const originIn = query('[data-map-origin-in]');
            const stageWrap = query('[data-map-stage-wrap]');
            const stage = root.querySelector('[data-map-stage]');
            const svg = root.querySelector('.about-map-svg');
            const ica = root.querySelector('[data-ica]');
            const trio = root.querySelector('[data-trio]');
            const peruGroup = root.querySelector('[data-peru]');
            const lake = root.querySelector('[data-lake]');
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
              if (heroCopy) {
                gsap.from(heroCopy, {
                  opacity: 0,
                  y: 12,
                  duration: 0.8,
                  ease: 'power2.out',
                  onStart: () => gsap.set(heroCopy, { willChange: 'transform, opacity' }),
                  onComplete: () => gsap.set(heroCopy, { willChange: 'auto', clearProps: 'transform' }),
                });
              }

              if (motiva && motivaCols.length) {
                gsap.set(motivaCols, { opacity: 0, y: 18 });
                gsap.to(motivaCols, {
                  opacity: 1,
                  y: 0,
                  stagger: 0.12,
                  ease: 'none',
                  scrollTrigger: {
                    trigger: motiva,
                    start: 'top 75%',
                    end: 'bottom 60%',
                    scrub: true,
                  },
                });
              }

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
              gsap.set(stage, { clearProps: 'transform' });
              gsap.set(stageWrap, { x: 0, y: 0, scale: 1, force3D: false });
              if (ica instanceof Element) {
                gsap.set(ica, { fillOpacity: 0 });
              }
              if (trio instanceof Element) {
                gsap.set(trio, { autoAlpha: 0 });
              }
              if (who instanceof Element) {
                gsap.set(who, { autoAlpha: 1 });
              }
              if (origin instanceof Element) {
                gsap.set(origin, { autoAlpha: 1 });
              }
              if (whoIn instanceof Element) {
                gsap.set(whoIn, { opacity: 0, x: 16 });
              }
              if (originIn instanceof Element) {
                gsap.set(originIn, { opacity: 0, x: -16 });
              }

              const narrowMap = window.matchMedia('(max-width: 767px)').matches;
              if (narrowMap) {
                const reveal = (node: Element, trigger: Element) => {
                  gsap.fromTo(
                    node,
                    { opacity: 0, y: 18 },
                    {
                      opacity: 1,
                      y: 0,
                      ease: 'none',
                      scrollTrigger: {
                        trigger,
                        start: 'top 90%',
                        end: 'top 62%',
                        scrub: true,
                      },
                    },
                  );
                };
                if (whoIn instanceof Element && who instanceof Element) {
                  gsap.set(whoIn, { opacity: 0, x: 0, y: 18 });
                  reveal(whoIn, who);
                }
                if (originIn instanceof Element && origin instanceof Element) {
                  gsap.set(originIn, { opacity: 0, x: 0, y: 18 });
                  reveal(originIn, origin);
                }
                const mobileTl = gsap.timeline({
                  scrollTrigger: {
                    id: 'about-map-draw-mobile',
                    trigger: stageWrap,
                    start: 'top 85%',
                    end: 'center 60%',
                    scrub: true,
                    invalidateOnRefresh: true,
                  },
                });
                mobileTl.fromTo(
                  drawn,
                  { drawSVG: '0% 0%' },
                  {
                    drawSVG: '0% 100%',
                    duration: 10,
                    stagger: { amount: 8, from: 'start' },
                    ease: 'none',
                  },
                  0,
                );
                if (ica instanceof Element) {
                  mobileTl.to(ica, { fillOpacity: ICA_FILL_WASH, duration: 2, ease: 'none' });
                }
                if (trio instanceof Element) {
                  gsap.fromTo(trio, { autoAlpha: 0 }, {
                    autoAlpha: 1,
                    ease: 'none',
                    scrollTrigger: {
                      trigger: trio,
                      start: 'top 92%',
                      end: 'top 62%',
                      scrub: true,
                    },
                  });
                }
                return;
              }

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
                  lake.style.strokeWidth = `${LAKE_STROKE_WIDTH * k}`;
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
              const drawInPin = 0.72;
              const pinLen = 1.6;
              const restTl = 8.9;
              const dummyFrac = drawInPin / pinLen;
              const dummyDur = (dummyFrac * restTl) / (1 - dummyFrac);
              const drawTl = gsap.timeline({
                scrollTrigger: {
                  id: 'about-map-draw',
                  trigger: scene,
                  start: () => `top ${headerPx()}px`,
                  end: () => `+=${vh() * drawInPin}`,
                  scrub: true,
                  invalidateOnRefresh: true,
                },
              });
              if (whoIn instanceof Element) {
                drawTl.to(whoIn, { opacity: 1, x: 0, duration: 3, ease: 'none' }, 0);
              }
              if (originIn instanceof Element) {
                drawTl.to(originIn, { opacity: 1, x: 0, duration: 3, ease: 'none' }, 11);
              }
              drawTl.fromTo(
                drawn,
                { drawSVG: '0% 0%' },
                {
                  drawSVG: '0% 100%',
                  duration: 10,
                  stagger: { amount: 12, from: 'start' },
                  ease: 'none',
                },
                0,
              );
              if (ica instanceof Element) {
                drawTl.to(ica, { fillOpacity: ICA_FILL_WASH, duration: 2, ease: 'none' });
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
              const mapCopy = [who, origin].filter((node): node is HTMLElement => node instanceof HTMLElement);
              if (mapCopy.length) {
                tl.to(mapCopy, { autoAlpha: 0, duration: 1.2, ease: 'none' }, 'takeover');
              }
              tl.to(mapLayer, { autoAlpha: 0, duration: 1.2, ease: 'none' }, 'cross');
              if (trio instanceof Element) {
                tl.to(trio, { autoAlpha: 1, duration: 1.2, ease: 'none' }, 'cross');
              }

              ScrollTrigger.refresh();
            });

            mm.add(reducedMq, () => {
              clearMotion(heroCopy);
              motivaCols.forEach((col: Element) => clearMotion(col));
              gsap.set(peruPaths, { drawSVG: '0% 100%' });
              if (lake instanceof Element) {
                gsap.set(lake, { drawSVG: '0% 100%' });
              }
              if (ica instanceof Element) {
                gsap.set(ica, { drawSVG: '0% 100%', fillOpacity: ICA_FILL_WASH });
              }
              if (trio instanceof Element) {
                gsap.set(trio, { autoAlpha: 1 });
              }
              if (who instanceof Element) {
                gsap.set(who, { autoAlpha: 1 });
              }
              if (origin instanceof Element) {
                gsap.set(origin, { autoAlpha: 1 });
              }
              if (whoIn instanceof Element) {
                gsap.set(whoIn, { opacity: 1, x: 0 });
              }
              if (originIn instanceof Element) {
                gsap.set(originIn, { opacity: 1, x: 0 });
              }
            });

            this.refreshMotion = () => ScrollTrigger.refresh();
            ScrollTrigger.refresh();
          });
        }, this.host.nativeElement);
      },
      { morphSvg: false, drawSvg: true, scrambleText: false },
    );
  }
}
