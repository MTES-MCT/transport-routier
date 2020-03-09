import React from "react";
import { TimeLine } from "../../common/components/Timeline";
import { ActivitySwitchGrid } from "../../common/components/ActivitySwitch";
import Container from "@material-ui/core/Container";
import { computeTotalActivityDurations } from "../../common/utils/metrics";
import { Expenditures } from "../../common/components/Expenditures";
import Divider from "@material-ui/core/Divider";
import { useStoreSyncedWithLocalStorage } from "../../common/utils/store";
import {
  EXPENDITURE_CANCEL_MUTATION,
  EXPENDITURE_LOG_MUTATION,
  useApi
} from "../../common/utils/api";
import { parseExpenditureFromBackend } from "../../common/utils/expenditures";
import { resolveCurrentTeam } from "../../common/utils/coworkers";

export function CurrentActivity({
  currentActivity,
  currentDayActivityEvents,
  pushNewActivityEvent,
  currentDayExpenditures,
  cancelOrReviseActivityEvent
}) {
  const storeSyncedWithLocalStorage = useStoreSyncedWithLocalStorage();
  const api = useApi();

  const timers = computeTotalActivityDurations(
    currentDayActivityEvents,
    Date.now() + 1
  );

  const team = resolveCurrentTeam(currentActivity, storeSyncedWithLocalStorage);
  const pendingExpenditureCancels = storeSyncedWithLocalStorage.pendingExpenditureCancels();

  const pushNewExpenditure = expenditureType => {
    const expenditureMatch = currentDayExpenditures.find(
      e => e.type === expenditureType
    );
    let expenditureCancel = null;
    if (expenditureMatch) {
      expenditureCancel = pendingExpenditureCancels.find(
        e => e.eventId === expenditureMatch.id
      );
      if (expenditureCancel) {
        storeSyncedWithLocalStorage.removeEvent(
          expenditureCancel,
          "pendingExpenditureCancels"
        );
      }
    } else {
      storeSyncedWithLocalStorage.pushNewExpenditure(
        expenditureType,
        team,
        () =>
          api.submitEvents(
            EXPENDITURE_LOG_MUTATION,
            "expenditures",
            apiResponse => {
              const expenditures =
                apiResponse.data.logExpenditures.expenditures;
              return storeSyncedWithLocalStorage.updateAllSubmittedEvents(
                expenditures.map(parseExpenditureFromBackend),
                "expenditures"
              );
            }
          )
      );
    }
  };

  const cancelExpenditure = expenditureToCancel => {
    if (expenditureToCancel.isBeingSubmitted) return;
    if (!expenditureToCancel.id) {
      storeSyncedWithLocalStorage.removeEvent(
        expenditureToCancel,
        "expenditures"
      );
    } else {
      storeSyncedWithLocalStorage.pushNewExpenditureCancel(
        expenditureToCancel.id,
        () => {
          api.submitEvents(
            EXPENDITURE_CANCEL_MUTATION,
            "pendingExpenditureCancels",
            apiResponse => {
              const expenditures =
                apiResponse.data.cancelExpenditures.expenditures;
              return Promise.all([
                storeSyncedWithLocalStorage.updateAllSubmittedEvents(
                  expenditures.map(parseExpenditureFromBackend),
                  "expenditures"
                ),
                storeSyncedWithLocalStorage.updateAllSubmittedEvents(
                  [],
                  "pendingExpenditureCancels"
                )
              ]);
            }
          );
        }
      );
    }
  };

  return (
    <Container className="app-container space-between" maxWidth={false}>
      <TimeLine
        dayActivityEvents={currentDayActivityEvents}
        cancelOrReviseActivityEvent={cancelOrReviseActivityEvent}
        pushNewActivityEvent={pushNewActivityEvent}
      />
      <Divider className="full-width-divider" />
      <ActivitySwitchGrid
        timers={timers}
        team={team}
        currentActivity={currentActivity}
        pushActivitySwitchEvent={(activityType, driverIdx = null) =>
          pushNewActivityEvent({ activityType, team, driverIdx })
        }
      />
      <Divider className="full-width-divider" />
      <Expenditures
        expenditures={currentDayExpenditures.filter(
          e => !pendingExpenditureCancels.map(ec => ec.eventId).includes(e.id)
        )}
        pushNewExpenditure={pushNewExpenditure}
        cancelExpenditure={cancelExpenditure}
      />
    </Container>
  );
}
