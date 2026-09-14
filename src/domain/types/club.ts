export interface DomainManager {
  id: string;
  firstName: string;
  lastName: string;
  nationality: string;
  reputation: number; // 1-100
  clubId?: string;
}

export interface DomainClub {
  id: string;
  name: string;
  shortName: string;
  code: string; // e.g. "ARS", "RMA"
  stadiumName: string;
  reputation: number; // 1-100
  primaryColor: string;
  secondaryColor: string;
  managerId?: string;
}
