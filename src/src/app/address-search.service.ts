import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, of, tap, timeout } from 'rxjs';

export interface AddressSuggestion {
  label: string;
  street: string;
  city: string;
  postcode: string;
  region: string;
}

interface PhotonResponse {
  features: Array<{ properties: Record<string, string | number | undefined> }>;
}

export function addressSuggestions(response: PhotonResponse): AddressSuggestion[] {
  const unique = new Map<string, AddressSuggestion>();
  for (const { properties: p } of response.features) {
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
    unique.set(label, { label, street, city, postcode, region });
  }
  return [...unique.values()];
}

@Injectable({ providedIn: 'root' })
export class AddressSearchService {
  private readonly http = inject(HttpClient);
  private readonly cache = new Map<string, AddressSuggestion[]>();

  search(query: string): Observable<AddressSuggestion[]> {
    const key = query.trim().replace(/\s+/g, ' ');
    const cached = this.cache.get(key);
    if (cached) return of(cached);
    return this.http.get<PhotonResponse>('https://photon.komoot.io/api/', {
      params: { q: key, limit: '8', lang: 'default', lat: '49.8', lon: '15.5', location_bias_scale: '0.2' }
    }).pipe(
      timeout(10000),
      map(addressSuggestions),
      tap(results => {
        // An incomplete/transient lookup must not prevent a later retry.
        if (results.length === 0) return;
        if (this.cache.size >= 100) this.cache.delete(this.cache.keys().next().value!);
        this.cache.set(key, results);
      })
    );
  }
}
