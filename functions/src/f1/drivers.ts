import * as admin from "firebase-admin";
import {onSchedule} from "firebase-functions/v2/scheduler";
import {logger} from "firebase-functions";
import {fetchJolpicaJson, getCurrentSeasonYear} from "../utils/jolpica";

const db = admin.firestore();

export const syncDrivers = onSchedule(
  {
    schedule: "0 0 * * *",
    timeZone: "Europe/Lisbon",
    region: "europe-west1",
  },
  async () => {
    try {
      const seasonYear = getCurrentSeasonYear();

      const driversResponse = await fetchJolpicaJson(seasonYear, "drivers");
      const drivers = driversResponse.MRData.DriverTable.Drivers ?? [];

      let batch = db.batch();
      let operationCount = 0;

      const commitBatch = async () => {
        if (operationCount > 0) {
          await batch.commit();
          batch = db.batch();
          operationCount = 0;
        }
      };

      for (const driver of drivers) {
        const driverId = driver.driverId;

        const ref = db
          .collection("f1_seasons")
          .doc(seasonYear)
          .collection("drivers")
          .doc(driverId);

        batch.set(
          ref,
          {
            driver_id: driverId,
            permanent_number: driver.permanentNumber ?? null,
            code: driver.code ?? null,
            url: driver.url ?? null,
            given_name: driver.givenName,
            family_name: driver.familyName,
            date_of_birth: driver.dateOfBirth ?? null,
            nationality: driver.nationality ?? null,
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
          drivers_updated_at: admin.firestore.FieldValue.serverTimestamp(),
        },
        {merge: true}
      );

      logger.info(`Drivers sync complete. Drivers: ${drivers.length}`);
    } catch (error) {
      logger.error("Error syncing drivers", error);
      throw error;
    }
  }
);
