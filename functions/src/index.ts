/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable max-len */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable require-jsdoc */

import "reflect-metadata";
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { container } from "tsyringe";
import * as queryString from "query-string";
import { AshDayService as AshDayService } from "./service/ashDayService";
import { Logger } from "./common/logger";

admin.initializeApp();
const db = admin.firestore();
db.settings({ ignoreUndefinedProperties: true });

const lineConfig = {
  channelAccessToken: functions.config().line.channelaccesstoken, // 環境変数からアクセストークンをセットしています
  channelSecret: functions.config().line.channelsecret,
};


container.register("ILogger", { useClass: Logger });
container.register("FirestoreDb", { useValue: db });
container.register("LineBotConfig", { useValue: lineConfig });
const ashDayService = container.resolve<AshDayService>(AshDayService);

// #region function

export const lineBot = functions.https.onRequest(async (request, response) => {
  functions.logger.info("Hello bot", { structuredData: true });
  const events = request.body.events[0];
  const userId = events.source.userId;
  const isPostBack = events?.postback;

  if (!isPostBack) {
    await handleReply(events, userId);
  } else {
    await handlePostBack(events, userId);
  }

  response.status(200).send();
});

exports.scheduledFunction = functions.pubsub.schedule("0 21 * * *").onRun(
    async (context) => {
      functions.logger.info("batch start.");
      await ashDayService.pushAshNotifyToUsers();
      functions.logger.info("batch end.");
    });

// #endregion

// #region private

async function handlePostBack(events: any, userId: any) {
  functions.logger.info("handle postback.", userId, events.postback.data);
  const data = events.postback.data;
  const parsed = queryString.parse(data);
  const action = parsed["action"];
  await ashDayService.handlePostBack(action, parsed, userId);
  functions.logger.info("end handle postback.", events.postback.data);
}


async function handleReply(events: any, userId: any) {
  functions.logger.info("handle reply.", userId);
  const userDoc = await ashDayService.getUser(userId);
  if (!userDoc.exists) {
    await ashDayService.createUser(userId);
  }
  const replyText = await ashDayService.getReplyText(userId, events.message.text);
  await ashDayService.replyMessage(replyText, events);
}

// #endregion


