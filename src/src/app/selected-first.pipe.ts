import { Pipe, PipeTransform } from '@angular/core';

export function selectedOptionsFirst(options: readonly string[], selected: string | readonly string[]): string[] {
  const values = new Set(typeof selected === 'string' ? selected.split('|').map(value => value.trim()) : selected);
  return [
    ...options.filter(option => values.has(option)),
    ...options.filter(option => !values.has(option))
  ];
}

@Pipe({ name: 'selectedFirst' })
export class SelectedFirstPipe implements PipeTransform {
  transform(options: readonly string[], selected: string | readonly string[]): string[] {
    return selectedOptionsFirst(options, selected);
  }
}
