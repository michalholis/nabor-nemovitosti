import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AddressSearchService, AddressSuggestion } from './address-search.service';

// Response verified against Photon for Říkovice 116.
const rikoviceResponse = { features: [{ properties: {
  housenumber: '116', street: 'Říkovice', city: 'Říkovice', postcode: '751 18',
  state: 'Olomoucký kraj', country: 'Česko', countrycode: 'CZ'
} }] };

describe('Address search retries', () => {
  let service: AddressSearchService;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(AddressSearchService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => { http.verify(); TestBed.resetTestingModule(); });

  it('retries Říkovice 116 after a previous response returned no addresses', () => {
    let results: AddressSuggestion[] = [];
    service.search('Říkovice 116').subscribe(value => { results = value; });
    http.expectOne(request => request.params.get('q') === 'Říkovice 116').flush({ features: [] });
    http.expectOne(request => request.url.includes('findAddressCandidates')).flush({ candidates: [] });
    expect(results).toEqual([]);

    service.search('Říkovice 116').subscribe(value => { results = value; });
    http.expectOne(request => request.params.get('q') === 'Říkovice 116').flush(rikoviceResponse);
    expect(results[0]).toEqual({
      label: 'Říkovice 116, Říkovice 751 18 (Olomoucký kraj)',
      street: 'Říkovice 116', city: 'Říkovice', postcode: '751 18', region: 'Olomoucký kraj'
    });

    service.search('Říkovice 116').subscribe(value => { results = value; });
    http.expectNone(request => request.params.get('q') === 'Říkovice 116');
    expect(results[0].street).toBe('Říkovice 116');
  });

  it.each(['error', 'empty'])('finds Říkovice near Přerov using the fallback after a primary %s response', failure => {
    let results: AddressSuggestion[] = [];
    service.search('Říkovice 116').subscribe(value => { results = value; });
    const primary = http.expectOne(request => request.url.includes('photon.komoot.io'));
    if (failure === 'error') primary.error(new ProgressEvent('error'));
    else primary.flush({ features: [] });
    const fallback = http.expectOne(request => request.url.includes('findAddressCandidates'));
    expect(fallback.request.params.get('SingleLine')).toBe('Říkovice 116');
    fallback.flush({ candidates: [
      { score: 100, attributes: { Addr_type: 'PointAddress', StAddr: 'Říkovice 116', City: 'Říkovice', Postal: '75118', Region: 'Olomoucký kraj', Subregion: 'Přerov' } },
      { score: 100, attributes: { Addr_type: 'Locality', StAddr: 'Říkovice' } },
      { score: 70, attributes: { Addr_type: 'PointAddress', StAddr: 'Jiná obec 116' } }
    ] });
    expect(results).toEqual([{
      label: 'Říkovice 116, Říkovice 751 18 (Olomoucký kraj)', street: 'Říkovice 116',
      city: 'Říkovice', postcode: '751 18', region: 'Olomoucký kraj', county: 'okres Přerov', source: 'esri'
    }]);
  });

  it('reports an outage if both address services fail', () => {
    let failed = false;
    service.search('Říkovice 116').subscribe({ error: () => { failed = true; } });
    http.expectOne(request => request.url.includes('photon.komoot.io')).error(new ProgressEvent('error'));
    http.expectOne(request => request.url.includes('findAddressCandidates')).error(new ProgressEvent('error'));
    expect(failed).toBe(true);
  });
});
