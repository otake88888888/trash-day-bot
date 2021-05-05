/* eslint-disable require-jsdoc */
export class AshDay {
  dayIndex: number;
  ashType: string;
  fortnightly: number; // 隔週. 0の場合毎週
  get dayString(): string {
    return ["日", "月", "火", "水", "木", "金", "土"][this.dayIndex];
  }
  constructor(
      dayIndex: number,
      ashType: string,
      fortnightly: number) {
    this.dayIndex = dayIndex;
    this.ashType = ashType;
    this.fortnightly = fortnightly;
  }
}
