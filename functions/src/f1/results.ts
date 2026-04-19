import * as admin from "firebase-admin";
import {onSchedule} from "firebase-functions/v2/scheduler";
import {logger} from "firebase-functions";
import {fetchJolpicaJson, getCurrentSeasonYear} from "../utils/jolpica";

const db = admin.firestore();

function toNumber(value?: string) {
  if (value === undefined || value === null || value === "") return null;
  const num = Number(value);
  return Number.isNaN(num) ? null : num;
}

function getDriverDocId(item: any) {
  return item?.Driver?.driverId ?? null;
}

function getDriverData(item: any) {
  return {
    driver_id: item.Driver?.driverId ?? null,
    permanent_number: item.Driver?.permanentNumber ?? null,
    code: item.Driver?.code ?? null,
    url: item.Driver?.url ?? null,
    given_name: item.Driver?.givenName ?? null,
    family_name: item.Driver?.familyName ?? null,
    date_of_birth: item.Driver?.dateOfBirth ?? null,
    nationality: item.Driver?.nationality ?? null,
  };
}

function getConstructorData(item: any) {
  return {
    constructor_id: item.Constructor?.constructorId ?? null,
    url: item.Constructor?.url ?? null,
    name: item.Constructor?.name ?? null,
    nationality: item.Constructor?.nationality ?? null,
  };
}

export const syncResults = onSchedule(
  {
    schedule: "0 8 * * 1",
    timeZone: "Europe/Lisbon",
    region: "europe-west1",
  },
  async () => {
    try {
      const seasonYear = getCurrentSeasonYear();

      // Get the races that already happen (start time is less than now)
      const now = admin.firestore.Timestamp.now();

      const snapshot = await db
        .collection("f1_seasons")
        .doc(seasonYear)
        .collection("races")
        .where("sessions.r_start_at", "<", now)
        .get();

      const races = snapshot.docs.map((doc) => ({
        ...doc.data(),
      }));

      let batch = db.batch();
      let operationCount = 0;

      const commitBatch = async () => {
        if (operationCount > 0) {
          await batch.commit();
          batch = db.batch();
          operationCount = 0;
        }
      };

      for (const race of races) {
        const round = String(race.round);
        const raceRef = db
          .collection("f1_seasons")
          .doc(seasonYear)
          .collection("races")
          .doc(round);


        const [raceResultsResponse, qualifyingResponse] =
          await Promise.all([
            fetchJolpicaJson(seasonYear, `${round}/results`).catch(() => null),
            fetchJolpicaJson(seasonYear, `${round}/qualifying`).catch(() => null),
          ]);

        const raceResults = raceResultsResponse?.MRData?.RaceTable?.Races?.[0]?.Results ?? [];
        const qualifyingResults = qualifyingResponse?.MRData?.RaceTable?.Races?.[0]?.QualifyingResults ?? [];

        for (const result of raceResults) {
          const driverId = getDriverDocId(result);
          if (!driverId) continue;

          const ref = raceRef.collection("race_results").doc(driverId);

          batch.set(
            ref,
            {
              number: toNumber(result.number),
              position: toNumber(result.position),
              position_text: result.positionText ?? null,
              points: toNumber(result.points),
              driver: getDriverData(result),
              constructor: getConstructorData(result),
              grid: toNumber(result.grid),
              laps: toNumber(result.laps),
              status: result.status ?? null,
              time: result.Time ?
                {
                  millis: toNumber(result.Time.millis),
                  time: result.Time.time ?? null,
                } :
                null,
              fastest_lap: result.FastestLap ?
                {
                  rank: toNumber(result.FastestLap.rank),
                  lap: toNumber(result.FastestLap.lap),
                  time: result.FastestLap.Time?.time ?? null,
                } :
                null,
              updated_at: admin.firestore.FieldValue.serverTimestamp(),
            },
            {merge: true}
          );

          operationCount++;
          if (operationCount >= 450) {
            await commitBatch();
          }
        }

        for (const result of qualifyingResults) {
          const driverId = getDriverDocId(result);
          if (!driverId) continue;

          const ref = raceRef.collection("qualifying").doc(driverId);

          batch.set(
            ref,
            {
              number: toNumber(result.number),
              position: toNumber(result.position),
              driver: getDriverData(result),
              constructor: getConstructorData(result),
              q1: result.Q1 ?? null,
              q2: result.Q2 ?? null,
              q3: result.Q3 ?? null,
              updated_at: admin.firestore.FieldValue.serverTimestamp(),
            },
            {merge: true}
          );

          operationCount++;
          if (operationCount >= 450) {
            await commitBatch();
          }
        }

        batch.set(
          raceRef,
          {
            race_results_updated_at: admin.firestore.FieldValue.serverTimestamp(),
            qualifying_results_updated_at: admin.firestore.FieldValue.serverTimestamp(),
          },
          {merge: true}
        );

        if (race.weekend_type === "sprint") {
          const sprintResponse = await fetchJolpicaJson(seasonYear, `${round}/sprint`);
          const sprintResults = sprintResponse?.MRData?.RaceTable?.Races?.[0]?.SprintResults ?? [];

          for (const result of sprintResults) {
            const driverId = getDriverDocId(result);
            if (!driverId) continue;

            const ref = raceRef.collection("sprint_results").doc(driverId);

            batch.set(
              ref,
              {
                number: toNumber(result.number),
                position: toNumber(result.position),
                position_text: result.positionText ?? null,
                points: toNumber(result.points),
                driver: getDriverData(result),
                constructor: getConstructorData(result),
                grid: toNumber(result.grid),
                laps: toNumber(result.laps),
                status: result.status ?? null,
                time: result.Time ?
                  {
                    millis: toNumber(result.Time.millis),
                    time: result.Time.time ?? null,
                  } :
                  null,
                fastest_lap: result.FastestLap ?
                  {
                    rank: toNumber(result.FastestLap.rank),
                    lap: toNumber(result.FastestLap.lap),
                    time: result.FastestLap.Time?.time ?? null,
                  } :
                  null,
                updated_at: admin.firestore.FieldValue.serverTimestamp(),
              },
              {merge: true}
            );

            operationCount++;
            if (operationCount >= 450) {
              await commitBatch();
            }
          }

          batch.set(
            raceRef,
            {
              sprint_results_updated_at: admin.firestore.FieldValue.serverTimestamp(),
            },
            {merge: true}
          );
        }

        operationCount++;
        if (operationCount >= 450) {
          await commitBatch();
        }
      }

      await commitBatch();

      logger.info(`Weekend results sync complete. Races processed: ${races.length}`);
    } catch (error) {
      logger.error("Error syncing weekend results", error);
      throw error;
    }
  }
);
