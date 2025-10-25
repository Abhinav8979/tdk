export type HolidayEvent = {
  title: string;
  start: Date;
  end: Date;
  reason?: string;
  id: string;
};

export type FormData = {
  title: string;
  reason: string;
  editing?: boolean;
};
