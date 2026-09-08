import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HlmToaster } from '@spartan-ng/helm/sonner';
import { SiteFooter } from './core/layout/site-footer';
import { SiteHeader } from './core/layout/site-header';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, SiteHeader, SiteFooter, HlmToaster],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {}
