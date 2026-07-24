import type { MessageKey } from '@local-wellness/localization';

type GreetingMessageKey = Extract<
  MessageKey,
  'greetingAfternoon' | 'greetingEvening' | 'greetingMorning'
>;

export const getTimeGreetingKey = (date: Date): GreetingMessageKey => {
  const hour = date.getHours();

  if (hour < 12) return 'greetingMorning';
  if (hour < 17) return 'greetingAfternoon';
  return 'greetingEvening';
};

export const getTimeGreeting = (date: Date): string => {
  const greetings: Record<ReturnType<typeof getTimeGreetingKey>, string> = {
    greetingAfternoon: 'Good afternoon',
    greetingEvening: 'Good evening',
    greetingMorning: 'Good morning',
  };
  return greetings[getTimeGreetingKey(date)];
};
