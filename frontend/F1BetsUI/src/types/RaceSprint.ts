import type { RaceBase } from "./RaceBase.ts"
import type { Session } from "./Session.ts"

export interface RaceSprint extends RaceBase {
    FirstPractice: Session
    Qualifying: Session
    Sprint: Session
    SprintQualifying: Session
}