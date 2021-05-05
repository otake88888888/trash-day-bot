/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable require-jsdoc */
/* eslint-disable max-len */
import { singleton, inject } from "tsyringe";
import * as line from "@line/bot-sdk";
import { ILogger } from "../common/logger";

@singleton()
export class LineRepository {
  client: line.Client;
  constructor(
    @inject("LineBotConfig") config: line.ClientConfig,
    @inject("ILogger") private logger: ILogger) {
    this.client = new line.Client(config);
  }

  async pushMessage(to: string, text: string): Promise<void> {
    const textMessage: line.TextMessage[] = [{
      type: "text",
      text: text,
    }];

    await this.client.pushMessage(to, textMessage)
        .then(() => {
          this.logger.log("pushed to the message!");
        })
        .catch((err) => {
          this.logger.error(err);
        });
  }

  async pushFlexMessage(to: string, text: line.FlexMessage): Promise<void> {
    await this.client.pushMessage(to, text)
        .then(() => {
          this.logger.log("pushed to the message!");
        })
        .catch((err) => {
          this.logger.error(err);
        });
  }

  async replyMessage(replyToken: any, replyText: string) {
    if (!replyText) {
      this.logger.log("no reply. reply text is empty.");
      return;
    }

    const textMessage: line.TextMessage[] = [{
      type: "text",
      text: replyText,
    }];

    await this.client.replyMessage(replyToken, textMessage)
        .then(() => {
          this.logger.log("Replied to the message!");
        })
        .catch((err) => {
          this.logger.error(err);
        });
  }

  async pushPostBack(to: string, template: line.TemplateButtons): Promise<void> {
    this.logger.info("send postback start.", to);
    const message: line.TemplateMessage = {
      altText: "postback",
      type: "template",
      template: template,
    };

    await this.client.pushMessage(to, message)
        .then(() => {
          this.logger.log("pushed to the postback!");
        })
        .catch((err) => {
          this.logger.error(err);
        });
  }
}
