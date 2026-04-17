export interface DriverStandingFirestore {
    driver: {
        driver_id: string;
        given_name: string;
        family_name: string;
    };
    position: number;
    points: number;
}