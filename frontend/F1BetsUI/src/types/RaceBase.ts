export interface RaceBase {
    season: string
    round: string
    url: string
    raceName: string
    Circuit: {
        circuitId: string
        url: string
        circuitName: string
        Location: {
            lat: string
            long: string
            locality: string
            country: string
        }
    }
    date: string
    time: string
}