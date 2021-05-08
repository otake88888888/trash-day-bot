/* eslint-disable max-len */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable require-jsdoc */
import { injectable } from "tsyringe";
import { AshType } from "../model/ashType";
import * as line from "@line/bot-sdk";
import { LineRepository } from "../repository/lineRepository";
import { AshDay } from "../model/ashDay";
import { FireStoreRepository } from "../repository/fireStoreRepository";
import * as queryString from "query-string";

@injectable()
export class AshDayService {
  constructor(
    private lineRepository: LineRepository,
    private fireStoreRepository: FireStoreRepository) {
  }

  async sendAshTypePostBack(toId: string): Promise<void> {
    const template: line.TemplateButtons = {
      type: "buttons",
      title: "ゴミの種類を選択してください。",
      text: "以下より選択してください",
      actions: [
        {
          type: "postback",
          label: AshType.burnable,
          data: `action=setAshType&ashType=${AshType.burnable}`,
        },
        {
          type: "postback",
          label: AshType.nonBurnable,
          data: `action=setAshType&ashType=${AshType.nonBurnable}`,
        },
        {
          type: "postback",
          label: AshType.recyclable,
          data: `action=setAshType&ashType=${AshType.recyclable}`,
        },
      ],
      imageAspectRatio: "rectangle",
    };
    await this.lineRepository.pushPostBack(toId, template);
  }

  async sendDayIndexPostBack(toId: string, ashType: string): Promise<void> {
    const getComponents = () => {
      const buttons: line.FlexComponent[] = [];
      for (let index = 0; index < 7; index++) {
        buttons.push({
          type: "button",
          action: {
            type: "postback",
            label: new AshDay(index, "", 0).dayString,
            data: `action=setDayIndex&ashType=${ashType}&dayIndex=${index}`,
          },
        });
      }
      return buttons;
    };

    const content: line.FlexBubble = {
      type: "bubble",
      header: {
        type: "box",
        layout: "vertical",
        contents: [{
          type: "text",
          text: "ゴミ出しの曜日を選択してください",
          weight: "bold",
        }],
      },
      body: {
        type: "box",
        layout: "vertical",
        contents: getComponents(),
      },
    };

    const message: line.FlexMessage = {
      type: "flex",
      altText: "postback",
      contents: content,
    };

    await this.lineRepository.pushFlexMessage(toId, message);
  }

  async sendFortnightlyPostBack(toId: string, ashType: string, dayIndex: number): Promise<void> {
    const action = "setFortnightly";
    const getComponents = () => {
      const buttons: line.FlexComponent[] = [];
      for (let index = 0; index < 5; index++) {
        const label = index === 0 ? "毎週" : `第${index}週`;
        buttons.push({
          type: "button",
          action: {
            type: "postback",
            label: label,
            data: `action=${action}&ashType=${ashType}&dayIndex=${dayIndex}&fortnightly=${index}`,
          },
        });
      }
      return buttons;
    };

    const content: line.FlexBubble = {
      type: "bubble",
      header: {
        type: "box",
        layout: "vertical",
        contents: [{
          type: "text",
          text: "ゴミ出しの頻度を選択してください",
          weight: "bold",
        }],
      },
      body: {
        type: "box",
        layout: "vertical",
        contents: getComponents(),
      },
    };

    const message: line.FlexMessage = {
      type: "flex",
      altText: "postback",
      contents: content,
    };

    await this.lineRepository.pushFlexMessage(toId, message);
  }

  async pushAshNotifyToUsers(): Promise<void> {
    const userRef = this.fireStoreRepository.db.collection("users");
    const snapshot = await userRef.get();
    snapshot.forEach(async (doc) => {
      console.log(doc.id, "=>", doc.data());
      const userId = doc.id;
      await this.pushAshNotify(userId);
    });
  }

  getDayCount(date: Date) {
    return Math.floor((date.getDate() - 1) / 7) + 1;
  }

  async pushAshNotify(toLineId: string): Promise<string> {
    const getTomorrow = () => {
      const date = new Date();
      date.setDate(new Date().getDate() + 1);
      return date;
    };
    const tomorrow = getTomorrow();
    const dayIndex = tomorrow.getDay();
    const ashDays = await this.getAshDays(toLineId);

    let message = "";
    ashDays.forEach((day) => {
      const isAshDay = day.dayIndex === dayIndex;
      const isEvery = day.fortnightly === 0; // 毎週
      const isFortnightly = this.getDayCount(tomorrow) === day.fortnightly; // 隔週
      const appendMessage = () => {
        message += `明日${day.dayString}曜日は${day.ashType}の収集日です。準備はOKですか？`;
      };

      if (isAshDay && isEvery) {
        appendMessage();
      } else if (isAshDay && isFortnightly) {
        appendMessage();
      }
    });

    if (message) {
      this.lineRepository.pushMessage(toLineId, message);
    }
    return message;
  }

  async replyMessage(replyTextString: string, events: any): Promise<void> {
    const replyToken = events.replyToken;
    await this.lineRepository.replyMessage(replyToken, replyTextString);
  }

  async getAshDays(toLineId: string): Promise<AshDay[]> {
    return await this.fireStoreRepository.getAshDays(toLineId);
  }

  getAshDaysString(ashDays: AshDay[]): string {
    let ashDaysString = "";
    ashDays.forEach((day) => {
      const fortnightly = day.fortnightly === 0 ? "毎週" : `第${day.fortnightly}`;
      ashDaysString += fortnightly + day.dayString + "曜日:" + day.ashType + "\n";
    });
    return ashDaysString;
  }

  async getUser(userId: string) {
    const userDoc = this.fireStoreRepository.getUser(userId);
    return userDoc;
  }

  async createUser(userId: string) {
    await this.fireStoreRepository.createUser(userId);
  }

  async deleteAshDays(userId: string) {
    this.fireStoreRepository.deleteAshDays(userId);
  }

  async getReplyText(userId: string, receiveMessage: string) {
    switch (receiveMessage) {
      case "曜日追加":
        await this.sendAshTypePostBack(userId);
        return "";
      case "曜日削除":
        return "曜日の削除ですね。「全削除」と送ってください。";
      case "全削除":
        this.deleteAshDays(userId);
        return "曜日設定を全て削除しました。曜日設定から再度設定してください。";
      case "曜日確認": {
        const ashDays = await this.getAshDays(userId);
        if (ashDays.length == 0) {
          return "曜日設定がされていません。曜日追加から設定してください。";
        }
        const ashDaysString = this.getAshDaysString(ashDays);
        return `現在の曜日設定は以下です。\n${ashDaysString}`;
      }
      case "今日の運勢":
        return "大吉";
      default:
        return "";
    }
  }

  async handlePostBack(
      action: string | string[] | null,
      parsed: queryString.ParsedQuery<string>, userId: any) {
    switch (action) {
      case "setAshType": {
        const ashType = parsed["ashType"]?.toString() ?? "";
        await this.sendDayIndexPostBack(userId, ashType);
        break;
      }
      case "setDayIndex": {
        const ashType = parsed["ashType"]?.toString() ?? "";
        const dayIndex: number = +(parsed["dayIndex"]?.toString() ?? "");
        await this.sendFortnightlyPostBack(userId, ashType, dayIndex);
        break;
      }
      case "setFortnightly": {
        const ashType = parsed["ashType"]?.toString() ?? "";
        const dayIndex: number = +(parsed["dayIndex"]?.toString() ?? "");
        const fortnightly: number = +(parsed["fortnightly"]?.toString() ?? "");
        await this.fireStoreRepository.updateUser(userId, dayIndex, ashType, fortnightly);
        const text = "設定しました。ゴミ出しの前日21時に通知します。設定を追加する場合は再度曜日設定を行ってください。";
        this.lineRepository.pushMessage(userId, text);
        break;
      }
      default:
        throw new Error();
    }
  }
}
