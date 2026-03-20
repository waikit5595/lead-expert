export type FollowUpSettings = {
  firstReminderDays: number;
  highPriorityDays: number;
  autoDraftEnabled: boolean;
};

export const defaultFollowUpSettings: FollowUpSettings = {
  firstReminderDays: 2,
  highPriorityDays: 5,
  autoDraftEnabled: true,
};