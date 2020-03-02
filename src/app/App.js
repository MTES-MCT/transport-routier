import React from "react";
import { parseActivityPayloadFromBackend } from "../common/utils/activities";
import { groupEventsByDay } from "../common/utils/events";
import { ScreenWithBottomNavigation } from "./utils/navigation";
import { ACTIVITY_LOG_MUTATION, useApi } from "../common/utils/api";
import { useStoreSyncedWithLocalStorage } from "../common/utils/store";

function App() {
  const api = useApi();
  const storeSyncedWithLocalStorage = useStoreSyncedWithLocalStorage();

  const [currentTime, setCurrentTime] = React.useState(Date.now());

  // We force re-rendering every 5 sec to update timers
  React.useEffect(() => {
    setInterval(() => setCurrentTime(Date.now()), 5000);
  }, []);

  const rawActivityEvents = storeSyncedWithLocalStorage.activities();
  const cancelledActivityIds = storeSyncedWithLocalStorage
    .pendingActivityCancels()
    .map(ac => ac.eventId);
  const activityRevisionEvents = storeSyncedWithLocalStorage.pendingActivityRevisions();
  const activityEvents = rawActivityEvents
    .filter(a => !cancelledActivityIds.includes(a.id))
    .map(a => {
      const revision = activityRevisionEvents.find(rev => rev.id === a.id);
      return revision ? { ...a, eventTime: revision.eventTime } : a;
    });

  const activityEventsByDay = groupEventsByDay(activityEvents);
  const previousDaysEventsByDay = activityEventsByDay.slice(
    0,
    activityEventsByDay.length - 1
  );

  const currentDayActivityEvents =
    activityEventsByDay[activityEventsByDay.length - 1];
  const currentDayExpenditures =
    currentDayActivityEvents && currentDayActivityEvents.length > 0
      ? storeSyncedWithLocalStorage
          .expenditures()
          .filter(e => e.eventTime >= currentDayActivityEvents[0].eventTime)
      : [];

  const currentActivity = activityEvents[activityEvents.length - 1];

  const pushNewActivityEvent = ({
    activityType,
    team,
    driverIdx = null,
    mission = currentActivity && currentActivity.mission,
    vehicleRegistrationNumber = currentActivity &&
      currentActivity.vehicleRegistrationNumber
  }) => {
    storeSyncedWithLocalStorage.pushNewActivity(
      activityType,
      team,
      mission,
      vehicleRegistrationNumber,
      driverIdx,
      () =>
        api.submitEvents(ACTIVITY_LOG_MUTATION, "activities", apiResponse => {
          const activities = apiResponse.data.logActivities.activities;
          const coworkers = apiResponse.data.logActivities.company.users;
          storeSyncedWithLocalStorage.setCoworkers(coworkers);
          return storeSyncedWithLocalStorage.updateAllSubmittedEvents(
            activities.map(parseActivityPayloadFromBackend),
            "activities"
          );
        })
    );
  };

  return (
    <ScreenWithBottomNavigation
      currentTime={currentTime}
      currentActivity={currentActivity}
      currentDayActivityEvents={currentDayActivityEvents}
      pushNewActivityEvent={pushNewActivityEvent}
      previousDaysEventsByDay={previousDaysEventsByDay}
      currentDayExpenditures={currentDayExpenditures}
    />
  );
}

export default App;
