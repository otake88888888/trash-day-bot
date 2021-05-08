/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable require-jsdoc */
import * as firestore from "@google-cloud/firestore";
import { inject, singleton } from "tsyringe";
import { ILogger } from "../common/logger";
import { AshDay } from "../model/ashDay";
import * as admin from "firebase-admin";

@singleton()
export class FireStoreRepository {
  constructor(
    @inject("FirestoreDb") public db: firestore.Firestore,
    @inject("ILogger") private logger: ILogger) {
  }

  async getAshDays(userId: string): Promise<AshDay[]> {
    const userRef = this.db.collection("users").doc(userId);
    const userDoc = await userRef.get()
        .then((doc) => doc)
        .catch((err) => {
          throw new Error(err);
        });
    let result: AshDay[] = [];

    if (userDoc.exists) {
      this.logger.log("exists user record.", userId);
      const ashDays = userDoc.data()?.ashDays ?? [];
      ashDays.forEach((day: {
        dayIndex: number;
        ashType: string;
        fortnightly: number
      }) => {
        const ashDay = new AshDay(day.dayIndex, day.ashType, day.fortnightly);
        this.logger.log("get ashday setting.", ashDay);
        result.push(ashDay);
      });
    } else {
      this.logger.log("not exists user record.", userId);
      result = [];
    }

    return result;
  }

  async deleteAshDays(userId: string) {
    const userRef = this.db.collection("users").doc(userId);
    await userRef.update({ ashDays: [] });
  }

  async getUser(userId: string) {
    const userRef = this.db.collection("users").doc(userId);
    const userDoc = await userRef.get()
        .then((doc) => doc)
        .catch((err) => {
          throw new Error(err);
        });
    return userDoc;
  }


  async createUser(userId: string) {
    const userRef = this.db.collection("users").doc(userId);
    const userDoc = await userRef.get()
        .then((doc) => doc)
        .catch((err) => {
          throw new Error(err);
        });
    if (!userDoc.exists) {
      await userRef.create({});
    }
  }

  async updateUser(
      userId: any,
      dayIndex: number,
      ashType: string,
      fortnightly: number): Promise<void> {
    const userRef = this.db
        .collection("users")
        .doc(userId);
    await userRef.update({
      ashDays: admin.firestore.FieldValue.arrayUnion({
        dayIndex: dayIndex,
        ashType: ashType,
        fortnightly: fortnightly,
      }),
    });
  }
}
