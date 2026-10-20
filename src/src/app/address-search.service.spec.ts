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
});
