import React from "react";
import Container from "@material-ui/core/Container";
import { WorkDaySummary } from "../components/WorkTimeSummary";
import PeopleIcon from "@material-ui/icons/People";
import PersonIcon from "@material-ui/icons/Person";
import Button from "@material-ui/core/Button";
import { PlaceHolder } from "../../common/PlaceHolder";
import Typography from "@material-ui/core/Typography";
import { useModals } from "common/utils/modals";
import { useStoreSyncedWithLocalStorage } from "common/utils/store";
import { ACTIVITIES } from "common/utils/activities";
import { UserHeader } from "../../common/UserHeader";
import Box from "@material-ui/core/Box";
import { WorkDayRevision } from "../components/ActivityRevision";
import EditIcon from "@material-ui/icons/Edit";
import Link from "@material-ui/core/Link";
import { getTime } from "common/utils/events";

export function BeforeWork({
  currentTime,
  previousDaysActivityEventsByDay,
  pushNewActivityEvent,
  editActivityEvent,
  beginNewMission,
}) {
  const [openRevisionModal, setOpenRevisionModal] = React.useState(false);

  const latestDayActivityEvents =
    previousDaysActivityEventsByDay[previousDaysActivityEventsByDay.length - 1];

  const latestDayEnd = latestDayActivityEvents
    ? latestDayActivityEvents[latestDayActivityEvents.length - 1]
    : null;
  const shouldResumeDay =
    latestDayEnd &&
    new Date(getTime(latestDayEnd)).toISOString().slice(0, 10) ===
      new Date(currentTime).toISOString().slice(0, 10);

  const modals = useModals();
  const store = useStoreSyncedWithLocalStorage();

  const handleFirstActivitySelection = (
    activityType,
    dayInfos,
    updatedCoworkers = null
  ) => {
    let teamMates = null;
    if (updatedCoworkers) {
      teamMates = updatedCoworkers.filter(
        cw => !!cw.enroll
      ).map(cw => ({
        id: cw.id,
        firstName: cw.firstName,
        lastName: cw.lastName
      }));
    }
    const createActivity = async (driver = null) => {
      beginNewMission({
        firstActivityType: activityType,
        driver,
        name: dayInfos.mission,
        vehicleId: dayInfos.vehicle ? dayInfos.vehicle.id : null,
        vehicleRegistrationNumber: dayInfos.vehicle ? dayInfos.vehicle.registrationNumber : null,
        team: teamMates
      });
      modals.close("newMission");
      modals.close("teamSelection");
    };
    if (teamMates && teamMates.length > 0 && activityType === ACTIVITIES.drive.name) {
      modals.open("driverSelection", {
        team: [store.userInfo(), ...teamMates],
        handleDriverSelection: createActivity
      });
    } else createActivity();
  };

  return [
    <UserHeader key={1} />,
    <Container
      key={2}
      style={{ display: "flex", flexDirection: "column" }}
      className="full-height scrollable"
      maxWidth={false}
    >
      <Container
        disableGutters
        className="stretch-container scrollable"
        maxWidth={false}
        style={{ paddingTop: "2vh", justifyContent: "flex-start" }}
      >
        {latestDayActivityEvents ? (
          <>
            <WorkDaySummary dayActivityEvents={latestDayActivityEvents} />
            <Box my={1}>
              <Box
                className="flex-row-flex-start"
                onClick={() => setOpenRevisionModal(true)}
              >
                <EditIcon color="primary" />
                <Link component="button" variant="body1">
                  Corriger activités
                </Link>
              </Box>
            </Box>
          </>
        ) : (
          <PlaceHolder>
            <Typography variant="h3">👋</Typography>
            <Typography variant="h3">Bienvenue sur MobiLIC !</Typography>
          </PlaceHolder>
        )}
      </Container>
      <Box pb={1} className="cta-container">
        <Button
          variant="contained"
          color="primary"
          startIcon={<PersonIcon />}
          onClick={() => {
            modals.open("newMission", {
              handleContinue: dayInfos =>
                modals.open("firstActivity", {
                  handleItemClick: activityType =>
                    handleFirstActivitySelection(activityType, dayInfos)
                })
            });
          }}
        >
          {shouldResumeDay ? "Reprendre la journée" : "Commencer la journée"}
        </Button>
        <div style={{ height: "2vh" }} />
        <Button
          variant="outlined"
          color="primary"
          startIcon={<PeopleIcon />}
          onClick={() =>
            modals.open("teamSelection", {
              useCurrentEnrollment: false,
              handleContinue: updatedCoworkers =>
                modals.open("newMission", {
                  handleContinue: dayInfos => {
                    modals.open("firstActivity", {
                      handleItemClick: activityType =>
                        handleFirstActivitySelection(
                          activityType,
                          dayInfos,
                          updatedCoworkers
                        )
                    });
                  }
                })
            })
          }
        >
          {shouldResumeDay ? "Reprendre en équipe" : "Commencer en équipe"}
        </Button>
      </Box>
    </Container>,
    <WorkDayRevision
      key={3}
      open={latestDayActivityEvents && openRevisionModal}
      handleClose={() => setOpenRevisionModal(false)}
      activityEvents={latestDayActivityEvents}
      handleActivityRevision={editActivityEvent}
      pushNewActivityEvent={pushNewActivityEvent}
    />
  ];
}