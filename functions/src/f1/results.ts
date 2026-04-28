import * as admin from "firebase-admin";
import {FieldValue} from "firebase-admin/firestore";
import {onSchedule} from "firebase-functions/v2/scheduler";
import {logger} from "firebase-functions";
import {fetchJolpicaJson, getCurrentSeasonYear} from "../utils/jolpica";
import {createHash} from "crypto";

const db = admin.firestore();

enum ScoreValues {
  RacePole = 1,
  RaceFirst = 5,
  RaceSecond = 3,
  RaceThird = 1,
  SprintPole = 0, // Prepared but no scoring for now, should be 1
  SprintFirst = 3,
  SprintSecond = 2,
  SprintThird = 1,
}

type ResultsVersion = {
  race: string | null;
  qualifying: string | null;
  sprint: string | null;
};

function toNumber(value?: string) {
  if (value === undefined || value === null || value === "") return null;
  const num = Number(value);
  return Number.isNaN(num) ? null : num;
}

function stableHash(value: unknown) {
  return createHash("sha256")
    .update(JSON.stringify(value))
    .digest("hex");
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

function normalizeRaceResults(results: any[]) {
  return results
    .map((r) => ({
      driverId: r.Driver?.driverId ?? null,
      constructorId: r.Constructor?.constructorId ?? null,
      number: toNumber(r.number),
      position: toNumber(r.position),
      positionText: r.positionText ?? null,
      points: toNumber(r.points),
      grid: toNumber(r.grid),
      laps: toNumber(r.laps),
      status: r.status ?? null,
      time: r.Time ?
        {
          millis: toNumber(r.Time.millis),
          time: r.Time.time ?? null,
        } :
        null,
      fastestLap: r.FastestLap ?
        {
          rank: toNumber(r.FastestLap.rank),
          lap: toNumber(r.FastestLap.lap),
          time: r.FastestLap.Time?.time ?? null,
        } :
        null,
    }))
    .sort((a, b) => (a.driverId || "").localeCompare(b.driverId || ""));
}

function normalizeQualifyingResults(results: any[]) {
  return results
    .map((r) => ({
      driverId: r.Driver?.driverId ?? null,
      constructorId: r.Constructor?.constructorId ?? null,
      number: toNumber(r.number),
      position: toNumber(r.position),
      q1: r.Q1 ?? null,
      q2: r.Q2 ?? null,
      q3: r.Q3 ?? null,
    }))
    .sort((a, b) => (a.driverId || "").localeCompare(b.driverId || ""));
}

function normalizeSprintResults(results: any[]) {
  return results
    .map((r) => ({
      driverId: r.Driver?.driverId ?? null,
      constructorId: r.Constructor?.constructorId ?? null,
      number: toNumber(r.number),
      position: toNumber(r.position),
      positionText: r.positionText ?? null,
      points: toNumber(r.points),
      grid: toNumber(r.grid),
      laps: toNumber(r.laps),
      status: r.status ?? null,
      time: r.Time ?
        {
          millis: toNumber(r.Time.millis),
          time: r.Time.time ?? null,
        } :
        null,
      fastestLap: r.FastestLap ?
        {
          rank: toNumber(r.FastestLap.rank),
          lap: toNumber(r.FastestLap.lap),
          time: r.FastestLap.Time?.time ?? null,
        } :
        null,
    }))
    .sort((a, b) => (a.driverId || "").localeCompare(b.driverId || ""));
}

async function loadOfficialResults(seasonYear: string, round: string) {
  const raceRef = db
    .collection("f1_seasons")
    .doc(seasonYear)
    .collection("races")
    .doc(round);

  const [raceDoc, raceResultsSnap, qualifyingSnap, sprintSnap] = await Promise.all([
    raceRef.get(),
    raceRef.collection("race_results").get(),
    raceRef.collection("qualifying").get(),
    raceRef.collection("sprint_results").get(),
  ]);

  if (!raceDoc.exists) {
    throw new Error(`Official race doc not found for ${seasonYear}/${round}`);
  }

  const raceData = raceDoc.data()!;

  return {
    raceRef,
    raceData,
    raceResults: raceResultsSnap.docs.map((d) => d.data()),
    qualifyingResults: qualifyingSnap.docs.map((d) => d.data()),
    sprintResults: sprintSnap.docs.map((d) => d.data()),
  };
}

function getDriverIdByPosition(
  results: any[],
  targetPosition: number
): string | null {
  const item = results.find((r) => Number(r.position) === targetPosition);
  return item?.driver?.driver_id ?? null;
}

function getQualifyingPoleDriverId(qualifyingResults: any[]): string | null {
  const pole = qualifyingResults.find((r) => Number(r.position) === 1);
  return pole?.driver?.driver_id ?? null;
}

function calculateBetScore(params: {
  entry: any;
  raceResults: any[];
  qualifyingResults: any[];
  sprintResults: any[];
  officialRace: any;
}) {
  const {entry, raceResults, qualifyingResults, sprintResults, officialRace} = params;

  const officialRacePole = getQualifyingPoleDriverId(qualifyingResults);
  const officialRaceFirst = getDriverIdByPosition(raceResults, 1);
  const officialRaceSecond = getDriverIdByPosition(raceResults, 2);
  const officialRaceThird = getDriverIdByPosition(raceResults, 3);

  const officialSprintFirst = getDriverIdByPosition(sprintResults, 1);
  const officialSprintSecond = getDriverIdByPosition(sprintResults, 2);
  const officialSprintThird = getDriverIdByPosition(sprintResults, 3);

  const predictedRacePole = entry?.race?.pole ?? null;
  const predictedRaceFirst = entry?.race?.first ?? null;
  const predictedRaceSecond = entry?.race?.second ?? null;
  const predictedRaceThird = entry?.race?.third ?? null;


  const predictedSprintPole = entry?.sprint?.pole ?? null;
  const predictedSprintFirst = entry?.sprint?.first ?? null;
  const predictedSprintSecond = entry?.sprint?.second ?? null;
  const predictedSprintThird = entry?.sprint?.third ?? null;

  let totalPoints = 0;

  if (predictedRacePole && predictedRacePole === officialRacePole) {
    totalPoints += ScoreValues.RacePole;
  }

  if (predictedRaceFirst && predictedRaceFirst === officialRaceFirst) {
    totalPoints += ScoreValues.RaceFirst;
  }

  if (predictedRaceSecond && predictedRaceSecond === officialRaceSecond) {
    totalPoints += ScoreValues.RaceSecond;
  }

  if (predictedRaceThird && predictedRaceThird === officialRaceThird) {
    totalPoints += ScoreValues.RaceThird;
  }

  if (officialRace.weekend_type === "sprint") {
    // TODO: add points for sprint pole when scoring is defined
    if (predictedSprintPole) {
      totalPoints += ScoreValues.SprintPole;
    }

    if (predictedSprintFirst && predictedSprintFirst === officialSprintFirst) {
      totalPoints += ScoreValues.SprintFirst;
    }

    if (predictedSprintSecond && predictedSprintSecond === officialSprintSecond) {
      totalPoints += ScoreValues.SprintSecond;
    }

    if (predictedSprintThird && predictedSprintThird === officialSprintThird) {
      totalPoints += ScoreValues.SprintThird;
    }
  }

  return totalPoints;
}

async function commitInChunks(
  writes: Array<{
    ref: FirebaseFirestore.DocumentReference;
    data: FirebaseFirestore.DocumentData;
    options?: FirebaseFirestore.SetOptions;
  }>
) {
  let batch = db.batch();
  let count = 0;

  const flush = async () => {
    if (count > 0) {
      await batch.commit();
      batch = db.batch();
      count = 0;
    }
  };

  for (const write of writes) {
    batch.set(write.ref, write.data, write.options ?? {merge: true});
    count++;

    if (count >= 450) {
      await flush();
    }
  }

  await flush();
}

async function processRaceScore(
  seasonYear: string,
  leagueRaceDoc: FirebaseFirestore.QueryDocumentSnapshot,
) {
  const leagueRace = leagueRaceDoc.data();
  const round = Number(leagueRace.round);
  const roundStr = String(round);

  logger.info(`Processing score job for ${leagueRaceDoc.ref.path}, season=${seasonYear}, round=${round}`);

  const official = await loadOfficialResults(seasonYear, roundStr);

  const officialVersion = (official.raceData.results?.results_version ?? {}) as Partial<ResultsVersion>;
  const appliedVersion = (leagueRace.results_version ?? {}) as Partial<ResultsVersion>;

  const shouldRecalculate =
    !leagueRace.score_calculated_at ||
    appliedVersion.race !== officialVersion.race ||
    appliedVersion.qualifying !== officialVersion.qualifying ||
    appliedVersion.sprint !== officialVersion.sprint;

  if (!shouldRecalculate) {
    logger.info(`Results version matches for ${leagueRaceDoc.ref.path}, skipping score calculation.`);
    return;
  }

  const entriesSnap = await leagueRaceDoc.ref.collection("entries").get();

  const leagueRef = leagueRaceDoc.ref.parent.parent;
  if (!leagueRef) {
    throw new Error(`League ref not found for ${leagueRaceDoc.ref.path}`);
  }

  const mvpCandidate: { user_id: string; points: number } = {user_id: "", points: -1};

  const writes: Array<{
    ref: FirebaseFirestore.DocumentReference;
    data: FirebaseFirestore.DocumentData;
    options?: FirebaseFirestore.SetOptions;
  }> = [];

  let totalEntries = 0;

  for (const entryDoc of entriesSnap.docs) {
    const entry = entryDoc.data();

    const totalPoints = calculateBetScore({
      entry,
      raceResults: official.raceResults,
      qualifyingResults: official.qualifyingResults,
      sprintResults: official.sprintResults,
      officialRace: official.raceData,
    });

    const lastScore = entry.points?.score ?? null;

    writes.push({
      ref: entryDoc.ref,
      data: {
        points: {
          last_calculated_at: FieldValue.serverTimestamp(),
          score: totalPoints,
        },
      },
      options: {merge: true},
    });

    const userId = entryDoc.id;

    logger.info(`User ${userId} scored ${totalPoints} points (previous: ${lastScore ?? 0}) for entry ${entryDoc.ref.path}`);

    // Add points to each user (member). if score already exists, update with (new - prevPoints)
    const userRef = leagueRef.collection("members").doc(userId);
    writes.push({
      ref: userRef,
      data: {
        total_points: FieldValue.increment(totalPoints - (lastScore ?? 0)),
      },
      options: {merge: true},
    });

    // Check which user is the mvp (more points)
    if (totalPoints > mvpCandidate.points) {
      mvpCandidate.user_id = userId;
      mvpCandidate.points = totalPoints;
    }

    totalEntries++;
  }

  writes.push({
    ref: leagueRaceDoc.ref,
    data: {
      mvp_user_id: mvpCandidate.user_id,
      score_calculated_at: FieldValue.serverTimestamp(),
      results_version: officialVersion,
    },
    options: {merge: true},
  });

  await commitInChunks(writes);

  logger.info(`Processed score job for ${leagueRaceDoc.ref.path}. 
    Total entries: ${totalEntries}, 
    MVP: ${mvpCandidate.user_id} with ${mvpCandidate.points} points.`);
}

async function processScores(seasonYear: string, round: number) {
  const leaguesBetsSnap = await db
    .collectionGroup("bets")
    .where("season", "==", Number(seasonYear))
    .where("round", "==", round)
    .get();

  if (leaguesBetsSnap.empty) {
    logger.info(`No bets found for season=${seasonYear}, round=${round}, skipping score processing.`);
    return;
  }

  for (const leaguesBetsSnapDoc of leaguesBetsSnap.docs) {
    await processRaceScore(seasonYear, leaguesBetsSnapDoc);
  }
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

        let sprintResults: any[] = [];

        if (race.weekend_type === "sprint") {
          const sprintResponse = await fetchJolpicaJson(seasonYear, `${round}/sprint`);
          sprintResults = sprintResponse?.MRData?.RaceTable?.Races?.[0]?.SprintResults ?? [];

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
        }

        const curVersion: ResultsVersion = {
          race: stableHash(normalizeRaceResults(raceResults)),
          qualifying: stableHash(normalizeQualifyingResults(qualifyingResults)),
          sprint: race.weekend_type === "sprint" ? stableHash(normalizeSprintResults(sprintResults)) : null,
        };

        const prevVersion = (race.results?.results_version ?? {}) as Partial<ResultsVersion>;

        const resultsChanged =
          prevVersion.race !== curVersion.race ||
          prevVersion.qualifying !== curVersion.qualifying ||
          prevVersion.sprint !== curVersion.sprint;

        batch.set(
          raceRef,
          {
            results: {
              results_version: curVersion,
              results_changed_at: resultsChanged ? FieldValue.serverTimestamp() : race.results?.results_changed_at ?? null,
              race_results_updated_at: FieldValue.serverTimestamp(),
              qualifying_results_updated_at: FieldValue.serverTimestamp(),
              sprint_results_updated_at: race.weekend_type === "sprint" ? FieldValue.serverTimestamp() : null,
            },
          },
          {merge: true}
        );

        operationCount++;
        if (operationCount >= 450) {
          await commitBatch();
        }

        await commitBatch();

        await processScores(seasonYear, Number(round));
      }

      logger.info(`Weekend results sync complete. Races processed: ${races.length}`);
    } catch (error) {
      logger.error("Error syncing weekend results", error);
      throw error;
    }
  }
);
