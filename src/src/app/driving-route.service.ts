import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, finalize, forkJoin, map, of, shareReplay, switchMap, tap, timeout } from 'rxjs';
import { AddressSearchService } from './address-search.service';

export interface DrivingRoute {
  distanceMeters: number;
  durationSeconds: number;
  originCity?: string;
  destinationCity?: string;
}

export function formatDrivingRouteSummary(route: DrivingRoute): string {
  const values = formatDrivingRoute(route);
  return `${values.distance}, ${values.duration} hod`;
}

export function formatDrivingRoute(route: DrivingRoute): { distance: string; duration: string } {
  const minutes = Math.round(route.durationSeconds / 60);
  return {
    distance: `${(route.distanceMeters / 1000).toLocaleString('cs-CZ', { maximumFractionDigits: 1 })} km`,
    duration: `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}`
  };
}

@Injectable({ providedIn: 'root' })
export class DrivingRouteService {
  private readonly http = inject(HttpClient);
  private readonly addresses = inject(AddressSearchService);
  private readonly cache = new Map<string, DrivingRoute>();
  private readonly pending = new Map<string, Observable<DrivingRoute>>();

  calculate(origin: string, destination: string): Observable<DrivingRoute> {
    const key = JSON.stringify([origin.trim(), destination.trim()]);
    const cached = this.cache.get(key);
    if (cached) return of(cached);
    const pending = this.pending.get(key);
    if (pending) return pending;
    const result = forkJoin([
      this.addresses.resolveAddress(origin),
      this.addresses.resolveAddress(destination)
    ]).pipe(
      switchMap(points => this.http.get<{ code: string; routes?: Array<{ distance: number; duration: number }> }>(
        `https://router.project-osrm.org/route/v1/driving/${points.map(point => point.coordinates!.join(',')).join(';')}`,
        { params: { overview: 'false', alternatives: 'false', steps: 'false' } }
      ).pipe(timeout(12000), map(response => ({ response, points })))),
      map(({ response, points }) => {
        const route = response.routes?.[0];
        if (response.code !== 'Ok' || !route || !Number.isFinite(route.distance) || route.distance < 0
          || !Number.isFinite(route.duration) || route.duration < 0) {
          throw new Error('Pro zadané adresy se nepodařilo najít silniční trasu autem.');
        }
        return {
          distanceMeters: route.distance, durationSeconds: route.duration,
          originCity: points[0].city, destinationCity: points[1].city
        };
      }),
      tap(route => {
        if (this.cache.size >= 30) this.cache.delete(this.cache.keys().next().value!);
        this.cache.set(key, route);
      }),
      finalize(() => this.pending.delete(key)),
      shareReplay({ bufferSize: 1, refCount: true })
    );
    this.pending.set(key, result);
    return result;
  }
}
