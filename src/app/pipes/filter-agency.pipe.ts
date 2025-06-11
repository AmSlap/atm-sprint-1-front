import { Pipe, PipeTransform } from '@angular/core';
import { Agency } from '../models/atm.models';

@Pipe({
  name: 'filterAgency',
  standalone: true
})
export class FilterAgencyPipe implements PipeTransform {
  transform(agencies: Agency[] | null, agencyCode: string): Agency | null {
    if (!agencies || !agencyCode) {
      return null;
    }
    return agencies.find(agency => agency.agencyCode === agencyCode) || null;
  }
}
