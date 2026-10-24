import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of, switchMap, tap, timeout } from 'rxjs';

export interface AddressSuggestion {
  label: string;
  street: string;
  city: string;
  postcode: string;
  region: string;
  county?: string;
  source?: 'esri';
  coordinates?: [number, number];
}

interface PhotonResponse {
  features: Array<{ properties: Record<string, string | number | undefined>; geometry?: { coordinates: number[] } }>;
}

interface EsriResponse {
  error?: unknown;
  candidates?: Array<{ score: number; location?: { x: number; y: number }; attributes: {
    Addr_type?: string; StAddr?: string; City?: string; Postal?: string;
    Region?: string; Subregion?: string; Country?: string;
  } }>;
}

export function addressSuggestions(response: PhotonResponse): AddressSuggestion[] {
  const unique = new Map<string, AddressSuggestion>();
  for (const { properties: p, geometry } of response.features) {
    // Streets, towns and businesses without a house number aren't verified addresses.
    if (!p['housenumber']) continue;
    const city = String(p['city'] || p['town'] || p['village'] || p['locality'] || '');
    const street = [p['street'] || p['district'] || city, p['housenumber']].filter(Boolean).join(' ');
    const rawPostcode = String(p['postcode'] || '');
    const postcode = p['countrycode'] === 'CZ'
      ? rawPostcode.replace(/^(\d{3})\s?(\d{2})$/, '$1 $2') : rawPostcode;
    const region = String(p['state'] || '');
    const locality = [[city, postcode].filter(Boolean).join(' '), region ? `(${region})` : ''].filter(Boolean).join(' ');
    const label = [street, locality,
      p['countrycode'] !== 'CZ' ? p['country'] : ''].filter(Boolean).join(', ');
    unique.set(label, { label, street, city, postcode, region,
      ...(geometry?.coordinates.length === 2 ? { coordinates: geometry.coordinates as [number, number] } : {}),
      ...(p['county'] ? { county: String(p['county']) } : {}) });
  }
  return [...unique.values()];
}

@Injectable({ providedIn: 'root' })
export class AddressSearchService {
  private readonly http = inject(HttpClient);
  private readonly cache = new Map<string, AddressSuggestion[]>();

  resolveCoordinates(address: string): Observable<[number, number]> {
    return this.resolveAddress(address).pipe(map(result => result.coordinates!));
  }

  resolveAddress(address: string): Observable<AddressSuggestion> {
    const key = address.trim();
    const resolve = (results: AddressSuggestion[]): AddressSuggestion => {
      const match = results.find(result => result.label === key) || (results.length === 1 ? results[0] : undefined);
      const coordinates = match?.coordinates;
      if (!coordinates || !coordinates.every(Number.isFinite)
        || Math.abs(coordinates[0]) > 180 || Math.abs(coordinates[1]) > 90) {
        throw new Error(`Adresu „${key}“ nelze jednoznačně určit. Vyberte úplnou adresu z našeptávače.`);
      }
      return match!;
    };
    for (const results of this.cache.values()) {
      if (results.some(result => result.label === key && result.coordinates)) return of(resolve(results));
    }
    return this.search(key).pipe(map(resolve));
  }

  search(query: string): Observable<AddressSuggestion[]> {
    const key = query.trim().replace(/\s+/g, ' ');
    const cached = this.cache.get(key);
    if (cached) return of(cached);
    return this.http.get<PhotonResponse>('https://photon.komoot.io/api/', {
      params: { q: key, limit: '8', lang: 'default', lat: '49.8', lon: '15.5', location_bias_scale: '0.2' }
    }).pipe(
      timeout(5000),
      map(addressSuggestions),
      catchError(() => of([] as AddressSuggestion[])),
      switchMap(results => results.length ? of(results) : this.searchFallback(key)),
      tap(results => {
        // An incomplete/transient lookup must not prevent a later retry.
        if (results.length === 0) return;
        if (this.cache.size >= 100) this.cache.delete(this.cache.keys().next().value!);
        this.cache.set(key, results);
      })
    );
  }

  private searchFallback(query: string): Observable<AddressSuggestion[]> {
    return this.http.get<EsriResponse>('https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates', {
      params: {
        SingleLine: query, f: 'json', sourceCountry: 'CZE', maxLocations: '8',
        outFields: 'StAddr,City,Postal,Region,Country,Addr_type,Subregion', outSR: '4326'
      }
    }).pipe(
      timeout(7000),
      map(response => {
        if (response.error) throw new Error('Záložní adresní služba není dostupná.');
        const unique = new Map<string, AddressSuggestion>();
        for (const candidate of response.candidates || []) {
          const p = candidate.attributes;
          if (candidate.score < 90 || !['PointAddress', 'StreetAddress', 'Subaddress'].includes(p.Addr_type || '') || !/\d/.test(p.StAddr || '')) continue;
          const street = p.StAddr || '';
          const city = p.City || '';
          const postcode = (p.Postal || '').replace(/^(\d{3})\s?(\d{2})$/, '$1 $2');
          const region = p.Region || '';
          const locality = [[city, postcode].filter(Boolean).join(' '), region ? `(${region})` : ''].filter(Boolean).join(' ');
          const label = [street, locality].filter(Boolean).join(', ');
          unique.set(label, {
            label, street, city, postcode, region, source: 'esri',
            ...(candidate.location ? { coordinates: [candidate.location.x, candidate.location.y] as [number, number] } : {}),
            ...(p.Subregion ? { county: `okres ${p.Subregion}` } : {})
          });
        }
        return [...unique.values()];
      })
    );
  }
}
