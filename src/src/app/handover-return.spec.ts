import { describe, expect, it } from 'vitest';
import { formatHandoverPropertyAddress, handoverReturnCheckChanges } from './handover-return';

describe('Handover address and return choices', () => {
  it.each([
    ['Loděnice 9, Loděnice 671 75 (Jihomoravský kraj)', ['Loděnice 9', 'Loděnice 671 75']],
    ['Hlavní 12/3, 73601 Havířov, Moravskoslezský kraj', ['Hlavní 12/3', 'Havířov 736 01']],
    ['č. ev. 15, Skorošice 790 66 (Olomoucký kraj)', ['č. ev. 15', 'Skorošice 790 66']],
    ['Hlavní 12/3 736 01 Havířov', ['Hlavní 12/3', 'Havířov 736 01']],
    ['Říkovice 116\nŘíkovice 75118\nOlomoucký kraj', ['Říkovice 116', 'Říkovice 751 18']],
    ['Dlouhá 10, Praha 11000 (Praha)', ['Dlouhá 10', 'Praha 110 00']],
    ['', []],
    ['Neúplná adresa', ['Neúplná adresa']]
  ])('formats %s without inventing missing address data', (address, expected) => {
    expect(formatHandoverPropertyAddress(address as string)).toEqual(expected);
  });

  it('keeps mutually exclusive damage and photo choices consistent', () => {
    expect(handoverReturnCheckChanges('returnHasDefects', true)).toEqual({ returnHasDefects: 'ANO', returnNoDefects: 'NE' });
    expect(handoverReturnCheckChanges('returnPhotosNotTaken', true)).toEqual({ returnPhotosNotTaken: 'ANO', returnPhotosTaken: 'NE', returnPhotosAttached: 'NE' });
    expect(handoverReturnCheckChanges('returnPhotosAttached', true)).toEqual({ returnPhotosAttached: 'ANO', returnPhotosNotTaken: 'NE' });
  });
});
