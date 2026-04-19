import * as admin from "firebase-admin";
import {onSchedule} from "firebase-functions/v2/scheduler";
import {logger} from "firebase-functions";
import {fetchJolpicaJson, getCurrentSeasonYear} from "../utils/jolpica";

const db = admin.firestore();

function toTimestamp(date?: string, time?: string) {
  if (!date || !time) return null;

  const isoString = `${date}T${time}`;
  return admin.firestore.Timestamp.fromDate(new Date(isoString));
}

function subtractHours(timestamp: admin.firestore.Timestamp | null, hours: number) {
  if (!timestamp) return null;

  const date = timestamp.toDate();
  date.setHours(date.getHours() - hours);
  return admin.firestore.Timestamp.fromDate(date);
}

function getWeekendType(race: any): string {
  return race.Sprint ? "sprint" : "standard";
}

function getRaceStatus(
  bettingOpensAt: admin.firestore.Timestamp | null,
  bettingClosesAt: admin.firestore.Timestamp | null,
  raceStartAt: admin.firestore.Timestamp | null
): string {
  const now = Date.now();

  const opens = bettingOpensAt?.toMillis() ?? null;
  const closes = bettingClosesAt?.toMillis() ?? null;
  const raceStart = raceStartAt?.toMillis() ?? null;

  // TODO: Check if the points were already calculated, aka already have results from the api
  if (raceStart !== null && now >= raceStart) {
    return "calculated";
  }

  if (closes !== null && now >= closes) {
    return "closed";
  }

  if (opens !== null && now >= opens) {
    return "open";
  }

  return "scheduled";
}

function getNextMondayMidnightFromTimestamp(timestamp: admin.firestore.Timestamp) {
  const date = timestamp.toDate();

  const utcYear = date.getUTCFullYear();
  const utcMonth = date.getUTCMonth();
  const utcDay = date.getUTCDate();
  const utcWeekDay = date.getUTCDay();

  const daysUntilNextMonday = ((8 - utcWeekDay) % 7) || 7;

  const nextMondayUtc = new Date(
    Date.UTC(utcYear, utcMonth, utcDay + daysUntilNextMonday, 0, 0, 0, 0)
  );

  return admin.firestore.Timestamp.fromDate(nextMondayUtc);
}

function getSeasonStartTimestamp(seasonYear: string) {
  const date = new Date(Date.UTC(Number(seasonYear), 0, 1, 0, 0, 0, 0));
  return admin.firestore.Timestamp.fromDate(date);
}

export const syncRaces = onSchedule(
  {
    schedule: "0 * * * *",
    timeZone: "Europe/Lisbon",
    region: "europe-west1",
  },
  async () => {
    const seasonYear = getCurrentSeasonYear();

    const racesResponse = await fetchJolpicaJson(seasonYear, "races");
    const races = racesResponse.MRData.RaceTable.Races ?? [];

    let batch = db.batch();
    let operationCount = 0;

    const commitBatch = async () => {
      if (operationCount > 0) {
        await batch.commit();
        batch = db.batch();
        operationCount = 0;
      }
    };

    for (const [index, race] of races.entries()) {
      const raceStartAt = toTimestamp(race.date, race.time);

      const previousRace = index > 0 ? races[index - 1] : null;

      let bettingOpensAt: admin.firestore.Timestamp | null = null;

      if (!previousRace) {
        bettingOpensAt = getSeasonStartTimestamp(seasonYear);
      } else {
        const previousRaceStartAt = toTimestamp(previousRace.date, previousRace.time);

        if (previousRaceStartAt) {
          bettingOpensAt = getNextMondayMidnightFromTimestamp(previousRaceStartAt);
        }
      }

      const firstPracticeStartAt = toTimestamp(
        race.FirstPractice?.date,
        race.FirstPractice?.time
      );

      const secondPracticeStartAt = toTimestamp(
        race.SecondPractice?.date,
        race.SecondPractice?.time
      );

      const thirdPracticeStartAt = toTimestamp(
        race.ThirdPractice?.date,
        race.ThirdPractice?.time
      );

      const qualifyingStartAt = toTimestamp(
        race.Qualifying?.date,
        race.Qualifying?.time
      );

      const sprintStartAt = toTimestamp(
        race.Sprint?.date,
        race.Sprint?.time
      );

      const sprintQualifyingStartAt = toTimestamp(
        race.SprintQualifying?.date,
        race.SprintQualifying?.time
      );

      const bettingClosesAt = subtractHours(firstPracticeStartAt, 1);

      const status = getRaceStatus(
        bettingOpensAt,
        bettingClosesAt,
        raceStartAt
      );

      const raceRef = db
        .collection("f1_seasons")
        .doc(seasonYear)
        .collection("races")
        .doc(String(race.round));

      batch.set(
        raceRef,
        {
          round: Number(race.round),
          url: race.url ?? null,
          race_name: race.raceName,

          circuit: {
            circuit_id: race.Circuit?.circuitId ?? null,
            url: race.Circuit?.url ?? null,
            circuit_name: race.Circuit?.circuitName ?? null,
            lat: race.Circuit?.Location?.lat ?? null,
            long: race.Circuit?.Location?.long ?? null,
            locality: race.Circuit?.Location?.locality ?? null,
            country: race.Circuit?.Location?.country ?? null,
          },

          weekend_type: getWeekendType(race),

          sessions: {
            fp_start_at: firstPracticeStartAt,
            sp_start_at: secondPracticeStartAt,
            tp_start_at: thirdPracticeStartAt,
            q_start_at: qualifyingStartAt,
            r_start_at: raceStartAt,
            sq_start_at: sprintQualifyingStartAt,
            s_start_at: sprintStartAt,
          },

          betting_open_at: bettingOpensAt,
          betting_closes_at: bettingClosesAt,
          status,

          updated_at: admin.firestore.FieldValue.serverTimestamp(),
        },
        {merge: true}
      );

      operationCount++;
      if (operationCount >= 450) {
        await commitBatch();
      }
    }

    await commitBatch();

    await db.collection("f1_seasons").doc(seasonYear).set(
      {
        year: Number(seasonYear),
        races_updated_at: admin.firestore.FieldValue.serverTimestamp(),
      },
      {merge: true}
    );

    logger.info(`Races sync complete. Races: ${races.length}`);
  }
);
