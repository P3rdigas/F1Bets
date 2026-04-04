export interface DriverStanding {
  position: string
  points: string
  wins: string
  Driver: {
    driverId: string
    code: string
    givenName: string
    familyName: string
  }
  Constructors: Array<{
    constructorId: string
    name: string
  }>
}