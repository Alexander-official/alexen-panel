import dayjs from "dayjs";
import i18n from "locales/i18n";

const unit = (name: string, n: number) => i18n.t(`duration.${name}`, { count: Math.abs(n) });

export const relativeExpiryDate = (expiryDate: number | null | undefined) => {
  let dateInfo = { status: "", time: "" };
  if (expiryDate) {
    if (
      dayjs(expiryDate * 1000)
        .utc()
        .isAfter(dayjs().utc())
    ) {
      dateInfo.status = "expires";
    } else {
      dateInfo.status = "expired";
    }
    const durationSlots: string[] = [];
    const duration = dayjs.duration(
      dayjs(expiryDate * 1000)
        .utc()
        .diff(dayjs())
    );
    if (duration.years() != 0) durationSlots.push(unit("year", duration.years()));
    if (duration.months() != 0) durationSlots.push(unit("month", duration.months()));
    if (duration.days() != 0) durationSlots.push(unit("day", duration.days()));
    if (durationSlots.length === 0) {
      if (duration.hours() != 0) durationSlots.push(unit("hour", duration.hours()));
      if (duration.minutes() != 0) durationSlots.push(unit("min", duration.minutes()));
    }
    dateInfo.time = durationSlots.join(", ");
  }
  return dateInfo;
};
