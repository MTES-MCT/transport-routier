import React from "react";
import { isPendingSubmission, useStoreSyncedWithLocalStorage } from "./store";
import {
  BEGIN_MISSION_MUTATION,
  BOOK_VEHICLE_MUTATION,
  EDIT_ACTIVITY_MUTATION,
  EDIT_MISSION_EXPENDITURES_MUTATION,
  END_MISSION_MUTATION,
  ENROLL_OR_RELEASE_TEAM_MATE_MUTATION,
  LOG_ACTIVITY_MUTATION,
  LOG_COMMENT_MUTATION,
  useApi,
  VALIDATE_MISSION_MUTATION
} from "./api";
import { ACTIVITIES, parseActivityPayloadFromBackend } from "./activities";
import { parseMissionPayloadFromBackend } from "./mission";

const ActionsContext = React.createContext(() => {});

export function ActionsContextProvider({ children }) {
  const store = useStoreSyncedWithLocalStorage();
  const api = useApi();

  async function submitAction(
    query,
    variables,
    optimisticStoreUpdate,
    watchFields,
    handleSubmitResponse
  ) {
    // 1. Store the request and optimistically update the store as if the api responded successfully
    await store.newRequest(
      query,
      variables,
      optimisticStoreUpdate,
      watchFields,
      handleSubmitResponse
    );

    // 2. Execute the request (call API) along with any other pending one
    // await api.nonConcurrentQueryQueue.execute(() => api.executeRequest(request));
    await api.executePendingRequests();
  }

  const pushNewActivityEvent = async ({
    activityType,
    missionId = null,
    driver = null,
    userTime = null,
    userComment = null
  }) => {
    const newActivity = {
      type: activityType,
      eventTime: Date.now()
    };
    if (driver)
      newActivity.driver = {
        id: driver.id,
        firstName: driver.firstName,
        lastName: driver.lastName
      };
    if (missionId) newActivity.missionId = missionId;
    if (userTime) newActivity.userTime = userTime;
    if (userComment !== undefined && userComment !== null)
      newActivity.comment = userComment;

    const updateStore = (store, requestId) =>
      store.pushItemToArray(
        { ...newActivity, createdByRequestId: requestId },
        "activities"
      );

    await submitAction(
      LOG_ACTIVITY_MUTATION,
      newActivity,
      updateStore,
      ["activities"],
      apiResponse => {
        const activities = apiResponse.data.logActivity.missionActivities.map(
          parseActivityPayloadFromBackend
        );
        store.syncAllSubmittedItems(
          activities,
          "activities",
          a => a.missionId === activities[0].missionId
        );
      }
    );
  };

  const editActivityEvent = async (
    activityEvent,
    actionType,
    newUserTime = null,
    userComment = null
  ) => {
    let shouldCallApi = true;
    if (isPendingSubmission(activityEvent)) {
      if (api.isCurrentlySubmittingRequests()) return;
      // If the event is present in the db and has other unsubmitted updates we edit these updates
      if (activityEvent.updatedByRequestId) {
        await store.clearPendingRequest(
          store.getItemFromArrayById(
            activityEvent.updatedByRequestId,
            "pendingRequests"
          )
        );
      }
      // If the event is not present in the db yet we can more or less do the same
      else if (activityEvent.createdByRequestId) {
        shouldCallApi = false;
        const requestToAlter = store.getItemFromArrayById(
          activityEvent.updatedByRequestId
        );
        if (requestToAlter.query !== BEGIN_MISSION_MUTATION) {
          await store.clearPendingRequest(requestToAlter);
          if (activityEvent === "revision") {
            return pushNewActivityEvent(
              requestToAlter.variables.type,
              requestToAlter.variables.driverId,
              newUserTime,
              userComment
            );
          }
        }
      }
    }
    if (shouldCallApi) {
      const editActivityPayload = {
        eventTime: Date.now(),
        activityId: activityEvent.id,
        dismiss: actionType === "cancel",
        userTime: newUserTime,
        comment: userComment
      };

      const updateStore = (store, requestId) => {
        const updatedActivity =
          actionType === "cancel"
            ? { ...activityEvent, deletedByRequestId: requestId }
            : {
                ...activityEvent,
                updatedByRequestId: requestId,
                userTime: newUserTime
              };
        store.pushItemToArray(updatedActivity, "activities");
      };

      await submitAction(
        EDIT_ACTIVITY_MUTATION,
        editActivityPayload,
        updateStore,
        ["activities"],
        apiResponse => {
          const activities = apiResponse.data.editActivity.missionActivities.map(
            parseActivityPayloadFromBackend
          );
          store.syncAllSubmittedItems(
            activities,
            "activities",
            a => a.missionId === activities[0].missionId
          );
        }
      );
    }
  };

  const _updateStoreWithCoworkerEnrollment = (
    store,
    requestId,
    id,
    firstName,
    lastName,
    isEnrollment,
    enrollmentOrReleaseTime
  ) => {
    let coworker;
    if (id) coworker = store.getItemFromArrayById(id, "coworkers");
    if (!coworker) {
      coworker = {
        id,
        firstName,
        lastName
      };
    }
    if (isEnrollment) coworker.joinedCurrentMissionAt = enrollmentOrReleaseTime;
    else coworker.leftCurrentMissionAt = enrollmentOrReleaseTime;
    store.setStoreState(
      prevState => ({
        coworkers: [
          ...prevState.coworkers.filter(
            cw =>
              cw.id !== coworker.id ||
              cw.firstName !== coworker.firstName ||
              cw.lastName !== coworker.lastName
          ),
          coworker
        ]
      }),
      ["coworkers"]
    );
  };

  const pushNewTeamEnrollmentOrRelease = async (
    id,
    firstName,
    lastName,
    isEnrollment
  ) => {
    const enrollmentOrReleaseTime = Date.now();
    const enrollmentOrReleasePayload = {
      eventTime: enrollmentOrReleaseTime,
      teamMate: {
        id,
        firstName,
        lastName
      },
      isEnrollment
    };
    const updateStore = (store, requestId) => {
      _updateStoreWithCoworkerEnrollment(
        store,
        requestId,
        id,
        firstName,
        lastName,
        isEnrollment,
        enrollmentOrReleaseTime
      );
    };

    await submitAction(
      ENROLL_OR_RELEASE_TEAM_MATE_MUTATION,
      enrollmentOrReleasePayload,
      updateStore,
      ["coworkers"],
      apiResponse => {
        const coworker = apiResponse.data.enrollOrReleaseTeamMate.coworker;
        store.setStoreState(
          prevState => ({
            coworkers: [
              ...prevState.coworkers.filter(
                cw =>
                  cw.id !== coworker.id ||
                  cw.firstName !== coworker.firstName ||
                  cw.lastName !== coworker.lastName
              ),
              coworker
            ]
          }),
          ["coworkers"]
        );
      }
    );
  };

  const beginNewMission = async ({
    name,
    firstActivityType,
    team = null,
    vehicleRegistrationNumber = null,
    vehicleId = null,
    driver = null
  }) => {
    const missionPayload = {
      eventTime: Date.now(),
      name,
      firstActivityType
    };

    if (team) missionPayload.team = team;
    if (vehicleId) missionPayload.vehicleId = vehicleId;
    if (vehicleRegistrationNumber)
      missionPayload.vehicleRegistrationNumber = vehicleRegistrationNumber;
    if (driver)
      missionPayload.driver = {
        id: driver.id,
        firstName: driver.firstName,
        lastName: driver.lastName
      };

    const updateStore = (store, requestId) => {
      const mission = {
        name,
        eventTime: missionPayload.eventTime,
        createdByRequestId: requestId,
        expenditures: {}
      };
      store.pushItemToArray(mission, "missions");
      store.pushItemToArray(
        {
          type: firstActivityType,
          eventTime: mission.eventTime,
          driver: driver,
          createdByRequestId: requestId
        },
        "activities"
      );
      store.pushItemToArray(
        {
          eventTime: mission.eventTime,
          createdByRequestId: requestId,
          vehicleId: vehicleId,
          vehicleName: vehicleRegistrationNumber
        },
        "vehicleBookings"
      );
      store.setStoreState(
        prevState => ({
          coworkers: prevState.coworkers.map(cw => ({
            ...cw,
            joinedCurrentMissionAt: null,
            leftCurrentMissionAt: null
          }))
        }),
        ["coworkers"]
      );
      if (team)
        team.forEach(tm =>
          _updateStoreWithCoworkerEnrollment(
            store,
            requestId,
            tm.id,
            tm.firstName,
            tm.lastName,
            true,
            mission.eventTime
          )
        );
    };

    await submitAction(
      BEGIN_MISSION_MUTATION,
      missionPayload,
      updateStore,
      ["missions", "activities", "vehicleBookings"],
      apiResponse => {
        const mission = apiResponse.data.beginMission.mission;
        store.pushItemToArray(
          parseMissionPayloadFromBackend(mission),
          "missions"
        );
        store.setStoreState(
          prevState => ({
            activities: [
              ...prevState.activities.map(a => ({
                ...a,
                missionId: a.missionId || mission.id
              })),
              ...mission.activities.map(parseActivityPayloadFromBackend)
            ]
          }),
          ["activities"]
        );
        store.setStoreState(
          prevState => ({
            comments: prevState.comments.map(a => ({
              ...a,
              missionId: a.missionId || mission.id
            }))
          }),
          ["comments"]
        );
        _handleNewVehicleBookingsFromApi(mission.vehicleBookings);
        store.setStoreState(
          prevState => ({
            vehicleBookings: prevState.vehicleBookings.map(a => ({
              ...a,
              missionId: a.missionId || mission.id
            }))
          }),
          ["vehicleBookings"]
        );
      }
    );
  };

  const endMission = async ({
    endTime,
    missionId = null,
    expenditures = null,
    comment = null
  }) => {
    const endMissionPayload = {
      eventTime: endTime
    };
    if (missionId) endMissionPayload.missionId = missionId;
    if (expenditures) endMissionPayload.expenditures = expenditures;
    if (comment) endMissionPayload.comment = comment;

    const updateStore = (store, requestId) => {
      store.pushItemToArray(
        {
          type: ACTIVITIES.rest.name,
          eventTime: endMissionPayload.eventTime,
          missionId: missionId,
          createdByRequestId: requestId
        },
        "activities"
      );
      store.setStoreState(
        prevState => ({
          missions: prevState.missions.map(m => ({
            ...m,
            expenditures: m.id === missionId ? expenditures : m.expenditures,
            updatedByRequestId: requestId
          }))
        }),
        ["missions"]
      );
    };

    await submitAction(
      END_MISSION_MUTATION,
      endMissionPayload,
      updateStore,
      ["activities", "missions"],
      apiResponse => {
        const mission = apiResponse.data.endMission.mission;
        store.syncAllSubmittedItems(
          mission.activities.map(parseActivityPayloadFromBackend),
          "activities",
          a => a.missionId === mission.id
        );
        store.setStoreState(
          prevState => ({
            missions: [
              ...prevState.missions.filter(
                m => m.id !== mission.id && m.id !== missionId
              ),
              parseMissionPayloadFromBackend(mission)
            ]
          }),
          ["missions"]
        );
      }
    );
  };

  const validateMission = async mission => {
    await api.executePendingRequests(true);
    let missionId = mission.id;
    if (!missionId) {
      const updatedMission = store
        .getArray("missions")
        .find(
          m => m.eventTime === mission.eventTime && m.name === mission.name
        );
      if (updatedMission) {
        missionId = updatedMission.id;
      }
    }
    const apiResponse = await api.graphQlMutate(
      VALIDATE_MISSION_MUTATION,
      { missionId },
      true
    );
    const missionData = apiResponse.data.validateMission.mission;
    await store.syncAllSubmittedItems(
      [parseMissionPayloadFromBackend(missionData)],
      "missions",
      m => m.id === missionData.id
    );
  };

  const _handleNewVehicleBookingsFromApi = newVehicleBookings => {
    store.setItems(prevState => ({
      vehicleBookings: [...prevState.vehicleBookings, ...newVehicleBookings]
    }));
    newVehicleBookings.forEach(vehicleBooking => {
      const vehicle = store.getItemFromArrayById(
        vehicleBooking.vehicle.id,
        "vehicles"
      );
      if (!vehicle) store.pushItemToArray(vehicleBooking.vehicle, "vehicles");
    });
  };

  const pushNewVehicleBooking = async (vehicle, userTime, missionId = null) => {
    if (!vehicle) return;
    const { id, registrationNumber } = vehicle;
    const vehicleBookingPayload = {
      eventTime: Date.now()
    };
    if (id) vehicleBookingPayload.vehicleId = id;
    if (registrationNumber)
      vehicleBookingPayload.registrationNumber = registrationNumber;

    if (userTime) vehicleBookingPayload.userTime = userTime;
    if (missionId) vehicleBookingPayload.missionId = missionId;

    let actualVehicle;
    if (id) actualVehicle = store.getItemFromArrayById(id, "vehicles");

    const updateStore = (store, requestId) => {
      store.pushItemToArray(
        {
          ...vehicleBookingPayload,
          vehicleName: actualVehicle ? actualVehicle.name : registrationNumber,
          createdByRequestId: requestId
        },
        "vehicleBookings"
      );
    };

    await submitAction(
      BOOK_VEHICLE_MUTATION,
      vehicleBookingPayload,
      updateStore,
      ["vehicleBookings"],
      apiResponse => {
        const vehicleBooking = apiResponse.data.bookVehicle.vehicleBooking;
        _handleNewVehicleBookingsFromApi([vehicleBooking]);
      }
    );
  };

  const pushNewComment = async (content, missionId = null) => {
    const commentPayload = {
      eventTime: Date.now(),
      content
    };
    if (missionId) commentPayload.missionId = missionId;

    const updateStore = (store, requestId) => {
      store.pushItemToArray(
        { ...commentPayload, createdByRequestId: requestId },
        "comments"
      );
    };

    await submitAction(
      LOG_COMMENT_MUTATION,
      commentPayload,
      updateStore,
      ["comments"],
      apiResponse => {
        const comment = apiResponse.data.logComment.comment;
        store.pushItemToArray(comment, "comments");
      }
    );
  };

  const editMissionExpenditures = async (mission, newExpenditures) => {
    if (isPendingSubmission(mission)) {
      if (api.isCurrentlySubmittingRequests()) return;
      await api.nonConcurrentQueryQueue.execute(async () => {
        const previousRequestId = mission.updatedByRequestId;
        const previousRequest = await store.getItemFromArrayById(
          previousRequestId,
          "pendingRequests"
        );
        previousRequest.variables = {
          ...previousRequest.variables,
          expenditures: newExpenditures
        };
        await store.updateItemInArray(previousRequest, "pendingRequests");
        mission.expenditures = newExpenditures;
        await store.updateItemInArray(mission, "missions");
      });
    } else {
      const editExpenditurePayload = {
        missionId: mission.id,
        expenditures: newExpenditures
      };

      const updateStore = (store, requestId) =>
        store.pushItemToArray(
          {
            ...mission,
            expenditures: newExpenditures,
            updatedByRequestId: requestId
          },
          "missions"
        );

      await submitAction(
        EDIT_MISSION_EXPENDITURES_MUTATION,
        editExpenditurePayload,
        updateStore,
        ["missions"],
        async apiResponse => {
          const mission = apiResponse.data.editMissionExpenditures.mission;
          await store.syncAllSubmittedItems(
            [parseMissionPayloadFromBackend(mission)],
            "missions",
            m => m.id === mission.id
          );
        }
      );
    }
  };

  return (
    <ActionsContext.Provider
      value={{
        pushNewActivityEvent,
        editActivityEvent,
        beginNewMission,
        pushNewTeamEnrollmentOrRelease,
        endMission,
        pushNewVehicleBooking,
        pushNewComment,
        validateMission,
        editMissionExpenditures
      }}
    >
      {children}
    </ActionsContext.Provider>
  );
}

export const useActions = () => React.useContext(ActionsContext);
