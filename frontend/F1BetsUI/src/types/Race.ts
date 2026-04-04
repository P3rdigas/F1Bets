import type { RaceBase } from "./RaceBase.ts"
import type { Session } from "./Session.ts"

export interface Race extends RaceBase {
    FirstPractice: Session
    SecondPractice: Session
    ThirdPractice: Session
    Qualifying: Session
}