import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';
import { AddressSearchService } from './address-search.service';
import { DrivingRoute, DrivingRouteService, formatDrivingRoute, formatDrivingRouteSummary } from './driving-route.service';

describe('Driving routes', () => {
  let service: DrivingRouteService;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(DrivingRouteService);
    http = TestBed.inject(HttpTestingController);
    vi.spyOn(TestBed.inject(AddressSearchService), 'resolveAddress').mockImplementation(address => of({
      label: address, street: address, city: address === 'Výjezd' ? 'Havířov' : 'Skorošice', postcode: '', region: '',
      coordinates: address === 'Výjezd' ? [16.6, 49.2] : [17.4, 49.3]
    }));
  });
  afterEach(() => { http.verify(); vi.restoreAllMocks(); TestBed.resetTestingModule(); });

  it('uses road distance and time, caches by both addresses, and recalculates after a destination change', () => {
    let result: DrivingRoute | undefined;
    service.calculate('Výjezd', 'Nemovitost').subscribe(value => { result = value; });
    let concurrent: DrivingRoute | undefined;
    service.calculate('Výjezd', 'Nemovitost').subscribe(value => { concurrent = value; });
    const request = http.expectOne(req => req.url.endsWith('/16.6,49.2;17.4,49.3'));
    expect(request.request.params.get('overview')).toBe('false');
    request.flush({ code: 'Ok', routes: [{ distance: 45678, duration: 3899 }] });
    expect(result).toEqual({ distanceMeters: 45678, durationSeconds: 3899, originCity: 'Havířov', destinationCity: 'Skorošice' });
    expect(concurrent).toEqual(result);
    expect(formatDrivingRoute(result!)).toEqual({ distance: '45,7 km', duration: '1:05' });
    service.calculate('Výjezd', 'Nemovitost').subscribe();
    http.expectNone(req => req.url.includes('/route/v1/'));
    service.calculate('Výjezd', 'Jiná nemovitost').subscribe();
    http.expectOne(req => req.url.includes('/route/v1/')).flush({ code: 'Ok', routes: [{ distance: 1000, duration: 60 }] });
  });

  it('never turns a missing route into a zero and retries failures', () => {
    let error: Error | undefined;
    service.calculate('Výjezd', 'Nemovitost').subscribe({ error: value => { error = value; } });
    http.expectOne(req => req.url.includes('/route/v1/')).flush({ code: 'NoRoute', routes: [] });
    expect(error?.message).toContain('nepodařilo najít');
    service.calculate('Výjezd', 'Nemovitost').subscribe();
    http.expectOne(req => req.url.includes('/route/v1/')).flush({ code: 'Ok', routes: [{ distance: 0, duration: 0 }] });
  });

  it('formats rounding across an hour and durations longer than a day', () => {
    expect(formatDrivingRoute({ distanceMeters: 100, durationSeconds: 3599 }).duration).toBe('1:00');
    expect(formatDrivingRoute({ distanceMeters: 100, durationSeconds: 90000 }).duration).toBe('25:00');
    expect(formatDrivingRouteSummary({ distanceMeters: 205000, durationSeconds: 10500,
      originCity: 'Havířov', destinationCity: 'Skorošice' }))
      .toBe('205 km, 2:55 hod');
  });
});
