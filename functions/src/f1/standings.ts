import * as admin from "firebase-admin";
import {onSchedule} from "firebase-functions/v2/scheduler";
import {logger} from "firebase-functions";
import {fetchJolpicaJson, getCurrentSeasonYear} from "../utils/jolpica";

const db = admin.firestore();

export const syncStandings = onSchedule(
  {
    schedule: "0 * * * *",
    timeZone: "Europe/Lisbon",
    region: "europe-west1",
  },
  async () => {
    try {
      const seasonYear = getCurrentSeasonYear();

      logger.info(`Starting standings sync for ${seasonYear}`);

      const [driversStandResp, constructorsStandResp] = await Promise.all([
        fetchJolpicaJson(seasonYear, "driverstandings"),
        fetchJolpicaJson(seasonYear, "constructorstandings"),
      ]);

      const driverStandings = driversStandResp.MRData.StandingsTable.StandingsLists[0]?.DriverStandings ?? [];
      const constructorStandings = constructorsStandResp.MRData.StandingsTable.StandingsLists[0]?.ConstructorStandings ?? [];

      let batch = db.batch();
      let operationCount = 0;

      const commitBatch = async () => {
        if (operationCount > 0) {
          await batch.commit();
          batch = db.batch();
          operationCount = 0;
        }
      };

      for (const driver of driverStandings) {
        const driverId = driver.Driver.driverId;

        const ref = db
          .collection("f1_seasons")
          .doc(seasonYear)
          .collection("driver_standings")
          .doc(driverId);

        batch.set(
          ref,
          {
            position: Number(driver.position),
            position_text: driver.positionText ?? null,
            points: Number(driver.points),
            wins: Number(driver.wins),
            driver: {
              driver_id: driverId,
              permanent_number: driver.Driver.permanentNumber ?? null,
              code: driver.Driver.code ?? null,
              url: driver.Driver.url ?? null,
              given_name: driver.Driver.givenName,
              family_name: driver.Driver.familyName,
              date_of_birth: driver.Driver.dateOfBirth ?? null,
              nationality: driver.Driver.nationality ?? null,
            },
            constructors: (driver.Constructors ?? []).map(
              (constructor: any) => ({
                constructor_id: constructor.constructorId,
                url: constructor.url ?? null,
                name: constructor.name,
                nationality: constructor.nationality ?? null,
              })
            ),
            updated_at: admin.firestore.FieldValue.serverTimestamp(),
          },
          {merge: true}
        );

        operationCount++;
        if (operationCount >= 450) {
          await commitBatch();
        }
      }

      for (const standing of constructorStandings) {
        const constructorId = standing.Constructor.constructorId;

        const ref = db
          .collection("f1_seasons")
          .doc(seasonYear)
          .collection("constructor_standings")
          .doc(constructorId);

        batch.set(
          ref,
          {
            position: Number(standing.position),
            position_text: standing.positionText ?? null,
            points: Number(standing.points),
            wins: Number(standing.wins),
            constructor: {
              constructor_id: constructorId,
              url: standing.Constructor.url ?? null,
              name: standing.Constructor.name,
              nationality: standing.Constructor.nationality ?? null,
            },
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
          standings_updated_at: admin.firestore.FieldValue.serverTimestamp(),
        },
        {merge: true}
      );

      logger.info(
        `Standings sync complete. Drivers: ${driverStandings.length}, Constructors: ${constructorStandings.length}`
      );
    } catch (error) {
      logger.error("Error syncing standings", error);
      throw error;
    }
  }
);
